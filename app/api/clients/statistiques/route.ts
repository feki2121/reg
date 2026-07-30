// app/api/clients/statistiques/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const clientId = searchParams.get('clientId');

    // Construction des filtres de date
    let dateFilter: any = {};
    if (dateDebut) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (dateFin) {
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // 1. Récupérer TOUS les BL de la période
    const bls = await prisma.bonLivraison.findMany({
      where: {
        date: dateFilter,
        ...(clientId && clientId !== 'all' ? { clientId } : {}),
        statut: 'LIVRE',
      },
      include: {
        client: true,
        lignes: {
          include: {
            product: {
              select: {
                id: true,
                designation: true,
                prixAchat: true,
                prixVente: true,
              },
            },
          },
        },
      },
    });

    if (bls.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2. Récupérer TOUS les mouvements de caisse de la période
    const tousMouvements = await prisma.mouvementCaisse.findMany({
      where: {
        date: dateFilter,
      },
    });

    // 3. Grouper par client
    const clientMap = new Map<string, {
      clientId: string;
      clientNom: string;
      clientTelephone: string;
      clientEmail: string | null;
      clientVille: string | null;
      bls: any[];
      mouvements: any[];
      mouvementsVirtuels: any[];
      totalCA: number;
      totalHT: number;
      totalTVA: number;
      totalRecette: number;
      totalAchat: number;
      totalFrais: number;
    }>();

    for (const bl of bls) {
      const clientKey = bl.clientId;
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          clientId: bl.clientId,
          clientNom: bl.client.nom,
          clientTelephone: bl.client.telephone,
          clientEmail: bl.client.email || null,
          clientVille: (bl.client as any).ville || null,
          bls: [],
          mouvements: [],
          mouvementsVirtuels: [],
          totalCA: 0,
          totalHT: 0,
          totalTVA: 0,
          totalRecette: 0,
          totalAchat: 0,
          totalFrais: 0,
        });
      }

      const data = clientMap.get(clientKey)!;
      data.bls.push(bl);
      
      data.totalCA += bl.montantTotal || 0;
      data.totalHT += bl.montantHT || 0;
      data.totalTVA += bl.montantTVA || 0;

      // Récupérer les mouvements pour ce BL
      // On cherche par référence (numero du BL) ou par libellé qui contient le numéro
      const mouvementsBL = tousMouvements.filter(m => 
        m.reference === bl.numero || 
        (m.libelle && m.libelle.includes(bl.numero))
      );

      // 🔥 IMPORTANT: On prend TOUS les encaissements (ENCAISSEMENT, ENCAISSEMENTVIRTUEL, ENCAISSEMENTCREDIT)
      const encaissements = mouvementsBL
        .filter(m => m.type === 'ENCAISSEMENT' || m.type === 'ENCAISSEMENTVIRTUEL' || m.type === 'ENCAISSEMENTCREDIT')
        .reduce((sum, m) => sum + m.montant, 0);
      
      data.totalRecette += encaissements;
      data.mouvements.push(...mouvementsBL);

      // Achat = décaissements virtuels (DECAISSEMENTVIRTUEL)
      const achats = tousMouvements
        .filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero)
        .reduce((sum, m) => sum + m.montant, 0);
      
      data.totalAchat += achats;
      data.mouvementsVirtuels.push(...tousMouvements.filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero));
    }

    // 4. Construction des statistiques finales
    const stats = Array.from(clientMap.values()).map((data) => {
      const totalBL = data.bls.length;
      
      const caTotal = data.totalCA;
      const caHT = data.totalHT;
      const caTVA = data.totalTVA;
      
      // Recette = Total des encaissements (ENCAISSEMENT + ENCAISSEMENTVIRTUEL + ENCAISSEMENTCREDIT)
      const recette = data.totalRecette;
      const achat = data.totalAchat;
      const frais = data.totalFrais;
      
      const margeBrute = recette - achat;
      const margeNette = recette - achat - frais;
      
      const tauxMargeBrute = recette > 0 ? margeBrute / recette : 0;
      const tauxMargeNette = recette > 0 ? margeNette / recette : 0;
      
      const panierMoyen = totalBL > 0 ? recette / totalBL : 0;

      const sortedBLs = [...data.bls].sort((a, b) => b.date.getTime() - a.date.getTime());
      const dernierAchat = sortedBLs.length > 0 ? sortedBLs[0].date.toISOString() : null;
      const firstAchat = sortedBLs.length > 0 ? sortedBLs[sortedBLs.length - 1].date.toISOString() : null;

      // Top produits
      const productMap = new Map<string, { productId: string; designation: string; quantite: number; total: number }>();
      for (const bl of data.bls) {
        for (const ligne of bl.lignes) {
          if (ligne.product) {
            const key = ligne.productId;
            if (!productMap.has(key)) {
              productMap.set(key, {
                productId: ligne.productId,
                designation: ligne.product.designation,
                quantite: 0,
                total: 0,
              });
            }
            const p = productMap.get(key)!;
            p.quantite += ligne.quantite;
            p.total += ligne.prixVente * ligne.quantite;
          }
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Calculer la marge brute et nette par BL
      const blsWithMargins = data.bls.map((bl) => {
        // Recette pour ce BL (tous les types d'encaissements)
        const blMouvements = tousMouvements.filter(m => 
          m.reference === bl.numero || 
          (m.libelle && m.libelle.includes(bl.numero))
        );
        
        const blRecette = blMouvements
          .filter(m => m.type === 'ENCAISSEMENT' || m.type === 'ENCAISSEMENTVIRTUEL' || m.type === 'ENCAISSEMENTCREDIT')
          .reduce((sum, m) => sum + m.montant, 0);
        
        // Achat pour ce BL
        const blAchat = tousMouvements
          .filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero)
          .reduce((sum, m) => sum + m.montant, 0);
        
        const blMargeBrute = blRecette - blAchat;
        const blMargeNette = blRecette - blAchat - frais;

        return {
          id: bl.id,
          numero: bl.numero,
          date: bl.date.toISOString(),
          montantTotal: bl.montantTotal || 0,
          montantHT: bl.montantHT || 0,
          margeBrute: blMargeBrute,
          margeNette: blMargeNette,
        };
      });

      return {
        clientId: data.clientId,
        clientNom: data.clientNom,
        clientTelephone: data.clientTelephone,
        clientEmail: data.clientEmail,
        clientVille: data.clientVille,
        totalBL,
        caTotal,
        caHT,
        caTVA,
        recette,
        achat,
        margeBrute,
        margeNette,
        tauxMargeBrute,
        tauxMargeNette,
        panierMoyen,
        dernierAchat,
        firstAchat,
        totalMouvements: data.mouvements.length,
        topProducts,
        bls: blsWithMargins,
      };
    });

    // Trier par Recette (CA réel) décroissant
    stats.sort((a, b) => b.recette - a.recette);
   
    return NextResponse.json({
      data: stats,
      total: stats.length,
    });
  } catch (error) {
    console.error('Error fetching client statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client statistics' },
      { status: 500 }
    );
  }
}