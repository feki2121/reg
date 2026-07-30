// app/api/chantiers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatutChantier } from '@/lib/types';

// GET - Récupérer la liste des chantiers avec filtres
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const statut = searchParams.get('statut') as StatutChantier | null;
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        // Construire les filtres
        const where: any = {};

        if (clientId) {
            where.clientId = clientId;
        }

        if (statut) {
            where.statut = statut;
        }

        if (search) {
            where.OR = [
                { nom: { contains: search, mode: 'insensitive' } },
                { reference: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { adresse: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Récupérer les chantiers avec leurs relations
        const [chantiers, total] = await Promise.all([
            prisma.chantier.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
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
                    _count: {
                        select: {
                            bonSorties: true,
                            devis: true,
                            factures: true,
                        },
                    },
                },
            }),
            prisma.chantier.count({ where }),
        ]);

        return NextResponse.json({
            data: chantiers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chantiers:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la récupération des chantiers' },
            { status: 500 }
        );
    }
}

// POST - Créer un nouveau chantier
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const body = await request.json();

        // Validation des champs obligatoires
        if (!body.nom) {
            return NextResponse.json(
                { error: 'Le nom du chantier est obligatoire' },
                { status: 400 }
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

        // Générer une référence automatique si non fournie
        let reference = body.reference;
        if (!reference) {
            const count = await prisma.chantier.count();
            const year = new Date().getFullYear();
            reference = `CH-${year}-${String(count + 1).padStart(4, '0')}`;
        }

        // Créer le chantier
        const chantier = await prisma.chantier.create({
            data: {
                nom: body.nom,
                reference,
                clientId: body.clientId || null,
                adresse: body.adresse || null,
                description: body.description || null,
                dateDebut: body.dateDebut ? new Date(body.dateDebut) : null,
                dateFin: body.dateFin ? new Date(body.dateFin) : null,
                statut: body.statut || StatutChantier.EN_COURS,
                budgetPrevu: body.budgetPrevu || 0,
                coutActuel: 0,
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

        return NextResponse.json(chantier, { status: 201 });
    } catch (error) {
        console.error('Erreur lors de la création du chantier:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors de la création du chantier' },
            { status: 500 }
        );
    }
}