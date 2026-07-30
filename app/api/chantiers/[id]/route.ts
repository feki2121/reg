// app/api/chantiers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatutChantier } from '@/lib/types';

// GET - Récupérer un chantier spécifique avec ses statistiques
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id } = params;

        const chantier = await prisma.chantier.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        telephone: true,
                        email: true,
                        mf: true,
                    },
                },
                bonSorties: {
                    where: {
                        statut: 'VALIDE',
                    },
                    include: {
                        lignes: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        designation: true,
                                        reference: true,
                                        unite: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        date: 'desc',
                    },
                    take: 50,
                },
                devis: {
                    orderBy: {
                        date: 'desc',
                    },
                    take: 10,
                },
                factures: {
                    orderBy: {
                        date: 'desc',
                    },
                    take: 10,
                },
                reglementDivers: {
                    orderBy: {
                        date: 'desc',
                    },
                    take: 20,
                },
                consommations: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                designation: true,
                                reference: true,
                                unite: true,
                            },
                        },
                    },
                    orderBy: {
                        date: 'desc',
                    },
                    take: 100,
                },
                _count: {
                    select: {
                        bonSorties: true,
                        devis: true,
                        factures: true,
                        reglementDivers: true,
                    },
                },
            },
        });

        if (!chantier) {
            return NextResponse.json(
                { error: 'Chantier non trouvé' },
                { status: 404 }
            );
        }

        // Calculer les statistiques
        const stats = {
            totalBonSorties: chantier._count.bonSorties,
            totalDevis: chantier._count.devis,
            totalFactures: chantier._count.factures,
            totalDepenses: chantier._count.reglementDivers,
            montantFactures: chantier.factures.reduce((sum, f) => sum + f.totalTTC, 0),
            montantDepenses: chantier.reglementDivers.reduce((sum, d) => sum + d.montant, 0),
            coutActuel: chantier.coutActuel,
            budgetPrevu: chantier.budgetPrevu,
            ecartBudget: chantier.budgetPrevu ? chantier.coutActuel - chantier.budgetPrevu : 0,
        };

        return NextResponse.json({
            ...chantier,
            stats,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du chantier:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la récupération du chantier' },
            { status: 500 }
        );
    }
}

// PUT - Mettre à jour un chantier
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();

        // Vérifier si le chantier existe
        const existingChantier = await prisma.chantier.findUnique({
            where: { id },
        });

        if (!existingChantier) {
            return NextResponse.json(
                { error: 'Chantier non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier si le client existe (si clientId est fourni)
        if (body.clientId) {
            const client = await prisma.client.findUnique({
                where: { id: body.clientId },
            });
            if (!client) {
                return NextResponse.json(
                    { error: 'Client non trouvé' },
                    { status: 404 }
                );
            }
        }

        // Mettre à jour le chantier
        const chantier = await prisma.chantier.update({
            where: { id },
            data: {
                nom: body.nom,
                reference: body.reference,
                clientId: body.clientId || null,
                adresse: body.adresse || null,
                description: body.description || null,
                dateDebut: body.dateDebut ? new Date(body.dateDebut) : null,
                dateFin: body.dateFin ? new Date(body.dateFin) : null,
                statut: body.statut,
                budgetPrevu: body.budgetPrevu || 0,
                // coutActuel est mis à jour automatiquement via les triggers
            },
            include: {
                client: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        telephone: true,
                    },
                },
            },
        });

        return NextResponse.json(chantier);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du chantier:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la mise à jour du chantier' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer un chantier (soft delete ou vérification)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { id } = params;

        // Vérifier si le chantier existe
        const existingChantier = await prisma.chantier.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        bonSorties: true,
                        devis: true,
                        factures: true,
                    },
                },
            },
        });

        if (!existingChantier) {
            return NextResponse.json(
                { error: 'Chantier non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier si le chantier a des documents associés
        if (
            existingChantier._count.bonSorties > 0 ||
            existingChantier._count.devis > 0 ||
            existingChantier._count.factures > 0
        ) {
            return NextResponse.json(
                {
                    error: 'Impossible de supprimer ce chantier car il a des documents associés',
                    details: {
                        bonSorties: existingChantier._count.bonSorties,
                        devis: existingChantier._count.devis,
                        factures: existingChantier._count.factures,
                    },
                },
                { status: 400 }
            );
        }

        // Supprimer le chantier (et ses consommations en cascade)
        await prisma.chantier.delete({
            where: { id },
        });

        return NextResponse.json(
            { message: 'Chantier supprimé avec succès' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Erreur lors de la suppression du chantier:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la suppression du chantier' },
            { status: 500 }
        );
    }
}