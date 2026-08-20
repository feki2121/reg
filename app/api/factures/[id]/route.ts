// app/api/factures/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// GET - Récupérer une facture spécifique
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const { id } = await params;

        const facture = await prisma.facture.findUnique({
            where: { id },
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
        });

        if (!facture) {
            return NextResponse.json(
                { error: 'Facture non trouvée' },
                { status: 404 }
            );
        }

        return NextResponse.json(facture);
    } catch (error) {
        console.error('Error fetching facture:', error);
        return NextResponse.json(
            { error: 'Failed to fetch facture' },
            { status: 500 }
        );
    }
}

// PUT - Mettre à jour une facture
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { clientId, date, lignes, remise, statut, type } = body;

        // Validation
        if (!clientId || !lignes || lignes.length === 0) {
            return NextResponse.json(
                { error: 'Client et lignes sont requis' },
                { status: 400 }
            );
        }

        // Vérifier si la facture existe
        const existingFacture = await prisma.facture.findUnique({
            where: { id },
            include: { lignes: true },
        });

        if (!existingFacture) {
            return NextResponse.json(
                { error: 'Facture non trouvée' },
                { status: 404 }
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

        // Mettre à jour la facture
        const facture = await prisma.$transaction(async (tx) => {
            // Supprimer les anciennes lignes
            await tx.ligneFacture.deleteMany({
                where: { factureId: id },
            });

            // Mettre à jour la facture
            const updatedFacture = await tx.facture.update({
                where: { id },
                data: {
                    clientId,
                    date: date ? new Date(date) : new Date(),
                    statut: statut || existingFacture.statut,
                    type: type || existingFacture.type,
                    remise: remise || 0,
                    lignes: {
                        create: lignes.map((l: any) => ({
                            productId: l.productId,
                            quantite: l.quantite,
                            prixUnitaire: l.prixUnitaire,
                            remiseLigne: l.remiseLigne || 0,
                            tva: l.tva ?? 19,
                        })),
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

            // Recalculer les totaux (remise toujours en %)
            const totalHTAvantRemise = updatedFacture.lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
            
            // La remise est toujours appliquée en pourcentage
            const montantRemise = totalHTAvantRemise > 0 ? (totalHTAvantRemise * (remise || 0)) / 100 : 0;
            
            let totalHT = totalHTAvantRemise - montantRemise;
            let totalTVA = 0;

            updatedFacture.lignes.forEach(l => {
                const htLigne = l.quantite * l.prixUnitaire;
                const proportion = totalHTAvantRemise > 0 ? htLigne / totalHTAvantRemise : 0;
                const remiseLigne = montantRemise * proportion;
                const htApresRemise = htLigne - remiseLigne;
                totalTVA += htApresRemise * ((l.tva ?? 19) / 100);
            });

            const totalTTC = totalHT + totalTVA;

            // Mettre à jour les totaux
            return await tx.facture.update({
                where: { id },
                data: {
                    totalHT,
                    totalTVA,
                    totalTTC,
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
        });

        return NextResponse.json(facture);
    } catch (error) {
        console.error('Error updating facture:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update facture' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer une facture
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Vérifier si la facture existe
        const existingFacture = await prisma.facture.findUnique({
            where: { id },
            include: { 
                reglements: true,
                bonLivraisons: true,
                retourClients: true,
            },
        });

        if (!existingFacture) {
            return NextResponse.json(
                { error: 'Facture non trouvée' },
                { status: 404 }
            );
        }

        // Vérifier si la facture a des règlements
        if (existingFacture.reglements.length > 0) {
            return NextResponse.json(
                { error: 'Impossible de supprimer une facture qui a des règlements associés' },
                { status: 400 }
            );
        }

        // Vérifier si la facture a des bons de livraison
        if (existingFacture.bonLivraisons.length > 0) {
            return NextResponse.json(
                { error: 'Impossible de supprimer une facture qui a des bons de livraison associés' },
                { status: 400 }
            );
        }

        // Vérifier si la facture a des retours clients
        if (existingFacture.retourClients.length > 0) {
            return NextResponse.json(
                { error: 'Impossible de supprimer une facture qui a des retours clients associés' },
                { status: 400 }
            );
        }

        // Supprimer la facture (et cascade les lignes et retours)
        await prisma.$transaction(async (tx) => {
            // Supprimer les retours clients associés
            await tx.retourClient.deleteMany({
                where: { factureId: id },
            });

            // Supprimer les lignes de facture
            await tx.ligneFacture.deleteMany({
                where: { factureId: id },
            });

            // Puis supprimer la facture
            await tx.facture.delete({
                where: { id },
            });
        });

        return NextResponse.json(
            { message: 'Facture supprimée avec succès' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting facture:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete facture' },
            { status: 500 }
        );
    }
}