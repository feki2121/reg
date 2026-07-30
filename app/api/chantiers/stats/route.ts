// app/api/chantiers/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatutChantier } from '@/lib/types';

// GET - Statistiques globales des chantiers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const dateDebut = searchParams.get('dateDebut');
        const dateFin = searchParams.get('dateFin');

        // Construire les filtres
        const where: any = {};

        if (clientId) {
            where.clientId = clientId;
        }

        if (dateDebut) {
            where.createdAt = {
                ...where.createdAt,
                gte: new Date(dateDebut),
            };
        }

        if (dateFin) {
            where.createdAt = {
                ...where.createdAt,
                lte: new Date(dateFin),
            };
        }

        // Statistiques globales
        const [
            totalChantiers,
            chantiersParStatut,
            totalBudget,
            totalCout,
            chantiersParClient,
        ] = await Promise.all([
            // Nombre total de chantiers
            prisma.chantier.count({ where }),

            // Répartition par statut
            prisma.chantier.groupBy({
                by: ['statut'],
                where,
                _count: true,
            }),

            // Total des budgets prévus
            prisma.chantier.aggregate({
                where,
                _sum: {
                    budgetPrevu: true,
                },
            }),

            // Total des coûts actuels
            prisma.chantier.aggregate({
                where,
                _sum: {
                    coutActuel: true,
                },
            }),

            // Top 5 clients avec le plus de chantiers
            prisma.chantier.groupBy({
                by: ['clientId'],
                where: {
                    ...where,
                    clientId: { not: null },
                },
                _count: true,
                orderBy: {
                    _count: {
                        clientId: 'desc',
                    },
                },
                take: 5,
            }),
        ]);

        // Récupérer les noms des clients pour le top 5
        const clientIds = chantiersParClient
            .filter((c) => c.clientId)
            .map((c) => c.clientId as string);

        const clients = await prisma.client.findMany({
            where: {
                id: { in: clientIds },
            },
            select: {
                id: true,
                nom: true,
                prenom: true,
            },
        });

        const topClients = chantiersParClient.map((c) => ({
            clientId: c.clientId,
            client: clients.find((cl) => cl.id === c.clientId),
            count: c._count,
        }));

        // Statistiques mensuelles des 6 derniers mois
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', createdAt) as mois,
        COUNT(*) as total,
        SUM(coutActuel) as coutTotal,
        SUM(budgetPrevu) as budgetTotal
      FROM Chantier
      WHERE createdAt >= ${sixMonthsAgo}
      ${clientId ? prisma.$sqlRaw`AND clientId = ${clientId}` : prisma.$sqlRaw``}
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY mois ASC
    `;

        // Statistiques des chantiers en cours
        const chantiersEnCours = await prisma.chantier.findMany({
            where: {
                ...where,
                statut: StatutChantier.EN_COURS,
            },
            select: {
                id: true,
                nom: true,
                reference: true,
                dateDebut: true,
                dateFin: true,
                budgetPrevu: true,
                coutActuel: true,
                client: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                    },
                },
                _count: {
                    select: {
                        bonSorties: true,
                        factures: true,
                    },
                },
            },
            orderBy: {
                dateFin: 'asc',
            },
        });

        // Statistiques des chantiers en retard (dateFin dépassée)
        const chantiersEnRetard = await prisma.chantier.count({
            where: {
                ...where,
                statut: StatutChantier.EN_COURS,
                dateFin: {
                    lt: new Date(),
                },
            },
        });

        return NextResponse.json({
            global: {
                total: totalChantiers,
                totalBudget: totalBudget._sum.budgetPrevu || 0,
                totalCout: totalCout._sum.coutActuel || 0,
                ecartGlobal: (totalBudget._sum.budgetPrevu || 0) - (totalCout._sum.coutActuel || 0),
                chantiersEnRetard,
            },
            parStatut: chantiersParStatut.map((s) => ({
                statut: s.statut,
                count: s._count,
            })),
            topClients,
            monthlyStats,
            chantiersEnCours,
        });
    } catch (error) {
        console.error('Erreur lors du calcul des statistiques:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors du calcul des statistiques' },
            { status: 500 }
        );
    }
}

// POST - Mettre à jour le coût actuel d'un chantier (calcul automatique)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const body = await request.json();
        const { chantierId } = body;

        if (!chantierId) {
            return NextResponse.json(
                { error: 'ID du chantier obligatoire' },
                { status: 400 }
            );
        }

        // Calculer le coût actuel du chantier
        // 1. Somme des bons de sortie validés
        // 2. Somme des dépenses (reglementDivers)
        // 3. Montant des factures

        const [
            bonSortiesTotal,
            depensesTotal,
            facturesTotal,
        ] = await Promise.all([
            prisma.bonSortie.aggregate({
                where: {
                    chantierId,
                    statut: 'VALIDE',
                },
                _sum: {
                    totalTTC: true,
                },
            }),
            prisma.reglementDivers.aggregate({
                where: {
                    chantierId,
                },
                _sum: {
                    montant: true,
                },
            }),
            prisma.facture.aggregate({
                where: {
                    chantierId,
                    statut: { in: ['PAYEE', 'PARTIELLE'] },
                },
                _sum: {
                    totalTTC: true,
                },
            }),
        ]);

        const coutTotal =
            (bonSortiesTotal._sum.totalTTC || 0) +
            (depensesTotal._sum.montant || 0) +
            (facturesTotal._sum.totalTTC || 0);

        // Mettre à jour le coutActuel du chantier
        const chantier = await prisma.chantier.update({
            where: { id: chantierId },
            data: {
                coutActuel: coutTotal,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                    },
                },
            },
        });

        return NextResponse.json({
            message: 'Coût du chantier mis à jour',
            chantier,
            details: {
                bonSorties: bonSortiesTotal._sum.totalTTC || 0,
                depenses: depensesTotal._sum.montant || 0,
                factures: facturesTotal._sum.totalTTC || 0,
                total: coutTotal,
            },
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du coût:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la mise à jour du coût' },
            { status: 500 }
        );
    }
}