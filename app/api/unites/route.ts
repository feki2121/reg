// app/api/unites/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Récupérer toutes les unités
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '100');

        const where: any = {};

        if (search) {
            where.OR = [
                { nom: { contains: search, mode: 'insensitive' } },
                { symbole: { contains: search, mode: 'insensitive' } },
            ];
        }

        const unites = await prisma.unite.findMany({
            where,
            take: limit,
            orderBy: {
                nom: 'asc',
            },
            include: {
                _count: {
                    select: {
                        produits: true,
                    },
                },
            },
        });

        return NextResponse.json({
            data: unites,
            total: unites.length,
        });
    } catch (error) {
        console.error('Error fetching unites:', error);
        return NextResponse.json(
            { error: 'Failed to fetch unites' },
            { status: 500 }
        );
    }
}

// POST - Créer une nouvelle unité
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        // Vérifier que l'utilisateur est admin
        if (session.user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Accès non autorisé' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { nom, symbole } = body;

        if (!nom) {
            return NextResponse.json(
                { error: 'Le nom de l\'unité est requis' },
                { status: 400 }
            );
        }

        // Vérifier si l'unité existe déjà
        const existingUnite = await prisma.unite.findUnique({
            where: { nom },
        });

        if (existingUnite) {
            return NextResponse.json(
                { error: 'Cette unité existe déjà' },
                { status: 400 }
            );
        }

        const unite = await prisma.unite.create({
            data: {
                nom,
                symbole: symbole || null,
            },
        });

        return NextResponse.json(unite, { status: 201 });
    } catch (error) {
        console.error('Error creating unite:', error);
        return NextResponse.json(
            { error: 'Failed to create unite' },
            { status: 500 }
        );
    }
}