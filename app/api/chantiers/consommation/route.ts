// app/api/chantiers/consommation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Récupérer les consommations par chantier
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const chantierId = searchParams.get('chantierId');
        const productId = searchParams.get('productId');
        const dateDebut = searchParams.get('dateDebut');
        const dateFin = searchParams.get('dateFin');

        if (!chantierId) {
            return NextResponse.json(
                { error: 'L\'ID du chantier est obligatoire' },
                { status: 400 }
            );
        }

        const where: any = {
            chantierId,
        };

        if (productId) {
            where.productId = productId;
        }

        if (dateDebut) {
            where.date = {
                ...where.date,
                gte: new Date(dateDebut),
            };
        }

        if (dateFin) {
            where.date = {
                ...where.date,
                lte: new Date(dateFin),
            };
        }

        const consommations = await prisma.consommationChantier.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        designation: true,
                        reference: true,
                        unite: true,
                    },
                },
                bonSortie: {
                    select: {
                        id: true,
                        numero: true,
                        date: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Résumé par produit
        const resume = consommations.reduce((acc: any, item) => {
            const key = item.productId;
            if (!acc[key]) {
                acc[key] = {
                    productId: item.productId,
                    product: item.product,
                    totalQuantite: 0,
                    totalCout: 0,
                    derniereUtilisation: item.date,
                };
            }
            acc[key].totalQuantite += item.quantite;
            // Le coût est calculé à partir du prix de vente du produit
            // (vous pouvez ajuster selon votre logique)
            acc[key].totalCout += item.quantite * (item.product?.prixVente || 0);
            if (item.date > acc[key].derniereUtilisation) {
                acc[key].derniereUtilisation = item.date;
            }
            return acc;
        }, {});

        return NextResponse.json({
            consommations,
            resume: Object.values(resume),
            total: consommations.length,
            totalQuantite: consommations.reduce((sum, c) => sum + c.quantite, 0),
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des consommations:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la récupération des consommations' },
            { status: 500 }
        );
    }
}

// POST - Ajouter une consommation (généralement créée automatiquement via BonSortie)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.chantierId || !body.productId || !body.quantite) {
            return NextResponse.json(
                { error: 'Chantier, produit et quantité sont obligatoires' },
                { status: 400 }
            );
        }

        // Vérifier si le chantier existe
        const chantier = await prisma.chantier.findUnique({
            where: { id: body.chantierId },
        });

        if (!chantier) {
            return NextResponse.json(
                { error: 'Chantier non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier si le produit existe
        const product = await prisma.product.findUnique({
            where: { id: body.productId },
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Produit non trouvé' },
                { status: 404 }
            );
        }

        // Créer la consommation
        const consommation = await prisma.consommationChantier.create({
            data: {
                chantierId: body.chantierId,
                productId: body.productId,
                quantite: body.quantite,
                date: body.date ? new Date(body.date) : new Date(),
                bonSortieId: body.bonSortieId || null,
            },
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
        });

        // Mettre à jour le coût du chantier (appel à l'API stats)
        // Vous pouvez déclencher une mise à jour asynchrone ici

        return NextResponse.json(consommation, { status: 201 });
    } catch (error) {
        console.error('Erreur lors de la création de la consommation:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la création de la consommation' },
            { status: 500 }
        );
    }
}