// app/api/bons-sortie/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

async function generateNumeroBonSortie(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();

  const count = await prisma.bonSortie.count({
    where: {
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      }
    }
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `${year}/${sequence}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;
    const statut = searchParams.get('statut');
    const chantierId = searchParams.get('chantierId');

    const where: any = {};
    if (statut) where.statut = statut;
    if (chantierId) where.chantierId = chantierId;

    const [bonsSortie, total] = await Promise.all([
      prisma.bonSortie.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          chantier: {
            include: {
              client: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                }
              }
            }
          },
          lignes: {
            include: {
              product: {
                include: {
                  unite: true,
                }
              },
              home: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonSortie.count({ where }),
    ]);

    const bonsSortieWithChantier = bonsSortie.map(bs => ({
      ...bs,
      chantierNom: bs.chantier?.nom || null,
      chantierReference: bs.chantier?.reference || null,
    }));

    return NextResponse.json({
      data: bonsSortieWithChantier,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur GET bons-sortie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      destinataire,
      motif,
      destination,
      nomConducteur,
      matriculeVehicule,
      numCIN,
      dateDebut,
      dateFin,
      adresseLivraison,
      observation,
      lignes,
      chantierId,
      statut,
    } = body;

    // Validation
    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une ligne est requise' },
        { status: 400 }
      );
    }

    // Si un chantier est spécifié, vérifier qu'il existe
    if (chantierId) {
      const chantier = await prisma.chantier.findUnique({
        where: { id: chantierId },
        include: { client: true }
      });

      if (!chantier) {
        return NextResponse.json(
          { error: 'Chantier non trouvé' },
          { status: 404 }
        );
      }
    }

    // Utiliser une transaction pour tout gérer
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vérifier les stocks disponibles
      for (const ligne of lignes) {
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
        });

        if (!stockLocation) {
          const product = await tx.product.findUnique({
            where: { id: ligne.productId }
          });
          throw new Error(`Le produit "${product?.designation}" n'est pas disponible dans l'emplacement sélectionné.`);
        }

        if (stockLocation.quantite < ligne.quantite) {
          const product = await tx.product.findUnique({
            where: { id: ligne.productId }
          });
          throw new Error(
            `Stock insuffisant pour "${product?.designation}" dans ${stockLocation.homeId}. Disponible: ${stockLocation.quantite}, Demandé: ${ligne.quantite}`
          );
        }
      }

      // 2. Calculer les totaux
      let totalHT = 0;
      let totalTTC = 0;
      const lignesCalculees = lignes.map((ligne: any) => {
        const ligneHT = ligne.quantite * ligne.prixUnitaireHT;
        const ligneTTC = ligne.quantite * ligne.prixUnitaireTTC;
        totalHT += ligneHT;
        totalTTC += ligneTTC;
        return {
          ...ligne,
          totalHT: ligneHT,
          totalTTC: ligneTTC,
          tva: 19
        };
      });

      const numero = await generateNumeroBonSortie();
      const initialStatut = statut || 'VALIDE';

      // 3. Créer le bon de sortie
      const bonSortie = await tx.bonSortie.create({
        data: {
          numero,
          date: new Date(),
          destination,
          nomConducteur,
          matriculeVehicule,
          numCIN,
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          clientId: clientId || null,
          destinataire: clientId ? "" : destinataire,
          motif,
          adresseLivraison: adresseLivraison || null,
          observation: observation || null,
          totalHT,
          totalTTC,
          createdBy: 'system',
          statut: initialStatut,
          chantierId: chantierId || null,
          lignes: {
            create: lignesCalculees.map((ligne: any) => ({
              productId: ligne.productId,
              homeId: ligne.homeId,
              quantite: ligne.quantite,
              prixUnitaireHT: ligne.prixUnitaireHT,
              prixUnitaireTTC: ligne.prixUnitaireTTC,
              remise: ligne.remise || 0,
              totalHT: ligne.totalHT,
              totalTTC: ligne.totalTTC,
              tva: 19
            })),
          },
        },
        include: {
          client: true,
          chantier: {
            include: {
              client: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                }
              }
            }
          },
          lignes: {
            include: {
              product: {
                include: {
                  unite: true,
                }
              },
              home: true,
            },
          },
        },
      });

      // 4. Diminuer le stock (même si statut BROUILLON, on diminue toujours car BS = sortie physique)
      for (const ligne of lignesCalculees) {
        // Mettre à jour StockLocation
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
          data: {
            quantite: {
              decrement: ligne.quantite,
            },
          },
        });

        // Mettre à jour le stock global du produit
        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: {
              decrement: ligne.quantite,
            },
          },
        });

        // Créer un mouvement de stock
        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Bon de sortie ${numero} - ${destination}`,
            bonSortieId: bonSortie.id,
          },
        });
      }

      // 5. Si un chantier est associé, créer les consommations
      if (chantierId) {
        for (const ligne of lignesCalculees) {
          await tx.consommationChantier.create({
            data: {
              chantierId: chantierId,
              productId: ligne.productId,
              quantite: ligne.quantite,
              date: new Date(),
              bonSortieId: bonSortie.id,
            },
          });
        }

        // Mettre à jour le coût du chantier
        const chantier = await tx.chantier.findUnique({
          where: { id: chantierId },
        });

        if (chantier) {
          const nouveauCout = (chantier.coutActuel || 0) + totalTTC;
          await tx.chantier.update({
            where: { id: chantierId },
            data: {
              coutActuel: nouveauCout,
            },
          });
        }
      }

      return bonSortie;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erreur POST bon-sortie:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}