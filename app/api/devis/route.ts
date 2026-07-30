import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all devis with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const chantierId = searchParams.get('chantierId');

    const where: any = {};
    if (chantierId) where.chantierId = chantierId;

    const [devis, total] = await Promise.all([
      prisma.devis.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          chantier: { // ← AJOUT
            include: {
              client: true,
            }
          },
          lignes: { include: { product: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.devis.count({ where }),
    ]);

    return NextResponse.json({
      data: devis,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching devis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    );
  }
}

// POST create devis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      numero,
      clientId,
      chantierId, // ← AJOUT
      totalHT,
      totalTTC,
      validite,
      statut,
      lignes,
      remise,
      remiseType
    } = body;

    if (!numero || !clientId || !totalHT || !totalTTC || !validite) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Si un chantier est spécifié, vérifier qu'il existe
    if (chantierId) {
      const chantier = await prisma.chantier.findUnique({
        where: { id: chantierId },
      });
      if (!chantier) {
        return NextResponse.json(
          { error: 'Chantier non trouvé' },
          { status: 404 }
        );
      }
    }

    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId,
        chantierId: chantierId || null, // ← AJOUT
        totalHT,
        totalTTC,
        validite: new Date(validite),
        statut: statut || 'EN_ATTENTE',
        remise: remise || 0,
        remiseType: remiseType || 'PERCENT',
        lignes: lignes
          ? {
            createMany: {
              data: lignes.map((l: any) => ({
                productId: l.productId,
                quantite: l.quantite,
                prixUnitaire: l.prixUnitaire,
                tva: l.tva,
              })),
            },
          }
          : undefined,
      },
      include: {
        client: true,
        chantier: { // ← AJOUT
          include: {
            client: true,
          }
        },
        lignes: { include: { product: true } },
      },
    });

    return NextResponse.json(devis, { status: 201 });
  } catch (error) {
    console.error('Error creating devis:', error);
    return NextResponse.json(
      { error: 'Failed to create devis' },
      { status: 500 }
    );
  }
}