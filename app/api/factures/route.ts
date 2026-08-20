// app/api/factures/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fonction pour arrondir à 3 décimales
const roundTo3Decimals = (value: number): number => {
    return Number(value.toFixed(3));
};

// Fonction pour calculer les totaux avec la logique de remise
function calculateTotals(lignes: any[], remise: number, remiseType: 'PERCENT' | 'FIXED') {
    let totalHT = 0;
    let totalTVA = 0;
    let totalTTC = 0;

    // Grouper les lignes par taux de TVA pour vérifier si tous les taux sont identiques
    const tauxTVA = lignes.map(l => l.tva ?? 19);
    const tauxUniques = [...new Set(tauxTVA)];
    const allSameTVA = tauxUniques.length === 1;

    // Si tous les taux sont identiques, appliquer la remise globalement
    if (allSameTVA) {
        // Calculer le total HT avant remise
        const totalHTAvantRemise = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);

        // Calculer le montant de la remise
        let montantRemise = 0;
        if (remiseType === 'PERCENT') {
            montantRemise = (totalHTAvantRemise * remise) / 100;
        } else {
            montantRemise = remise;
        }

        // Appliquer la remise sur le total HT
        totalHT = roundTo3Decimals(totalHTAvantRemise - montantRemise);

        // Calculer la TVA sur le total HT après remise
        const tva = tauxUniques[0];
        totalTVA = roundTo3Decimals(totalHT * (tva / 100));
        totalTTC = roundTo3Decimals(totalHT + totalTVA);

        return {
            totalHT,
            totalTVA,
            totalTTC,
            montantRemise,
            remiseParLigne: false
        };
    }
    // Sinon, appliquer la remise proportionnellement sur chaque ligne
    else {
        // Calculer le total HT avant remise
        const totalHTAvantRemise = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);

        // Calculer le montant total de la remise
        let montantRemiseTotal = 0;
        if (remiseType === 'PERCENT') {
            montantRemiseTotal = (totalHTAvantRemise * remise) / 100;
        } else {
            montantRemiseTotal = remise;
        }

        // Répartir la remise proportionnellement sur chaque ligne
        const lignesCalculees = lignes.map(l => {
            const prixHTLigne = l.quantite * l.prixUnitaire;
            const proportion = prixHTLigne / totalHTAvantRemise;
            const remiseLigne = roundTo3Decimals(montantRemiseTotal * proportion);
            const htApresRemise = roundTo3Decimals(prixHTLigne - remiseLigne);
            const tvaLigne = roundTo3Decimals(htApresRemise * (l.tva / 100));
            const ttcLigne = roundTo3Decimals(htApresRemise + tvaLigne);

            return {
                ...l,
                htApresRemise,
                tvaLigne,
                ttcLigne,
                remiseLigne
            };
        });

        totalHT = roundTo3Decimals(lignesCalculees.reduce((sum, l) => sum + l.htApresRemise, 0));
        totalTVA = roundTo3Decimals(lignesCalculees.reduce((sum, l) => sum + l.tvaLigne, 0));
        totalTTC = roundTo3Decimals(lignesCalculees.reduce((sum, l) => sum + l.ttcLigne, 0));

        return {
            totalHT,
            totalTVA,
            totalTTC,
            montantRemise: montantRemiseTotal,
            remiseParLigne: true,
            lignesCalculees
        };
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10000');
        const skip = (page - 1) * limit;
        const clientId = searchParams.get('clientId');
        const statut = searchParams.get('statut');

        const where: any = {};
        if (clientId) where.clientId = clientId;

        // === CORRECTION: Gérer le filtre statut ===
        if (statut) {
            // Si le statut contient des virgules, on le split en tableau
            if (statut.includes(',')) {
                const statuts = statut.split(',').map(s => s.trim());
                where.statut = { in: statuts };
            } else {
                where.statut = statut;
            }
        }

        const [factures, total] = await Promise.all([
            prisma.facture.findMany({
                where,
                skip,
                take: limit,
                include: {
                    client: true,
                    lignes: {
                        include: {
                            product: {
                                include: {
                                    unite: true,
                                    category: true,
                                }
                            },
                        },
                    },
                    reglements: {
                        include: {
                            reglement: true,
                        }
                    },
                },
                orderBy: { date: 'desc' },
            }),
            prisma.facture.count({ where }),
        ]);

        return NextResponse.json({
            data: factures,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching factures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch factures' },
            { status: 500 }
        );
    }
}

// app/api/factures/route.ts - Partie POST modifiée

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            numero,
            clientId,
            date,
            lignes,
            remise,
            statut,
            type,
        } = body;

        // Validation
        if (!numero || !clientId || !lignes || lignes.length === 0) {
            return NextResponse.json(
                { error: 'Numéro, client et lignes sont requis' },
                { status: 400 }
            );
        }

        // Vérifier si le client existe
        const client = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            return NextResponse.json(
                { error: 'Client non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier que le numéro est unique
        const existingFacture = await prisma.facture.findUnique({
            where: { numero },
        });

        if (existingFacture) {
            return NextResponse.json(
                { error: 'Une facture avec ce numéro existe déjà' },
                { status: 400 }
            );
        }

        // ✅ Récupérer les produits avec leur TVA
        const productIds = lignes.map((l: any) => l.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
            select: {
                id: true,
                designation: true,
                type: true,
                tva: true, // ✅ Ajouter la TVA
                prixVente: true,
                prixVenteHT: true,
            },
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // ✅ Vérifier que tous les produits existent et récupérer leur TVA
        for (const ligne of lignes) {
            const product = productMap.get(ligne.productId);
            if (!product) {
                return NextResponse.json(
                    { error: `Produit ${ligne.productId} non trouvé` },
                    { status: 404 }
                );
            }

            // ✅ Si la TVA n'est pas définie dans la ligne, utiliser celle du produit
            if (ligne.tva === undefined || ligne.tva === null) {
                ligne.tva = product.tva ?? 19;
            }
        }

        // Préparer les lignes pour le calcul avec la TVA correcte
        const lignesPourCalcul = lignes.map((l: any) => {
            const product = productMap.get(l.productId);
            return {
                productId: l.productId,
                quantite: l.quantite,
                prixUnitaire: l.prixUnitaire,
                tva: l.tva ?? product?.tva ?? 19, // ✅ Utiliser ?? au lieu de ||
                remiseLigne: l.remiseLigne || 0,
            };
        });

        // Calculer les totaux avec la logique de remise (toujours en %)
        const remiseValue = remise || 0;

        const calculResult = calculateTotals(lignesPourCalcul, remiseValue, 'PERCENT');
        const { totalHT, totalTVA, totalTTC } = calculResult;

        // Déterminer si on applique la remise par ligne ou globalement
        const tauxTVA = lignesPourCalcul.map((l: { tva: any; }) => l.tva ?? 19);
        const tauxUniques = [...new Set(tauxTVA)];
        const allSameTVA = tauxUniques.length === 1;

        // Créer la facture
        const facture = await prisma.$transaction(async (tx) => {
            const newFacture = await tx.facture.create({
                data: {
                    numero,
                    clientId,
                    date: date ? new Date(date) : new Date(),
                    totalHT: totalHT,
                    totalTVA: totalTVA,
                    totalTTC: totalTTC,
                    remise: remiseValue,
                    statut: statut || 'IMPAYEE',
                    type: type || 'DIRECTE',
                    lignes: {
                        create: lignes.map((l: any, index: number) => {
                            const tva = l.tva ?? productMap.get(l.productId)?.tva ?? 19;

                            return {
                                productId: l.productId,
                                quantite: l.quantite,
                                prixUnitaire: l.prixUnitaire,
                                remiseLigne: l.remiseLigne || 0,
                                tva: tva, // ✅ TVA avec ?? pour gérer 0
                            };
                        }),
                    },
                },
                include: {
                    client: true,
                    lignes: {
                        include: {
                            product: {
                                include: {
                                    unite: true,
                                }
                            },
                        },
                    },
                },
            });

            return newFacture;
        });

        return NextResponse.json(facture, { status: 201 });
    } catch (error) {
        console.error('Error creating facture:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create facture' },
            { status: 500 }
        );
    }
}