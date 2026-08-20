// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

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
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { designation: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          home: true,
          unite: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

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
      reference,
      code,
      designation,
      prixVente,
      tva,
      type,
      categoryId,
      uniteId,
      homeId,
    } = body;

    // Validation
    if (!designation) {
      return NextResponse.json(
        { error: 'La désignation est requise' },
        { status: 400 }
      );
    }

    if (!prixVente || prixVente <= 0) {
      return NextResponse.json(
        { error: 'Le prix de vente est requis et doit être supérieur à 0' },
        { status: 400 }
      );
    }

    const isService = type === 'SERVICE';

    // Utiliser la TVA du body ou valeur par défaut
    const tvaValue = tva !== undefined ? tva : 19;

    // Vérifier si la référence existe déjà (uniquement si fournie)
    if (reference) {
      const existingReference = await prisma.product.findUnique({
        where: { reference }
      });

      if (existingReference) {
        return NextResponse.json(
          { error: 'Cette référence existe déjà' },
          { status: 400 }
        );
      }
    }

    // Gérer le code produit
    let finalCode = code;
    if (!finalCode || finalCode.trim() === "") {
      const currentYear = new Date().getFullYear();

      const lastProduct = await prisma.product.findFirst({
        where: {
          code: {
            startsWith: `${currentYear}-`,
          },
        },
        orderBy: {
          code: 'desc',
        },
      });

      let nextNumber = 1;
      if (lastProduct && lastProduct.code) {
        const lastNumber = parseInt(lastProduct.code.split('-')[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      finalCode = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      const codeExists = await prisma.product.findFirst({
        where: { code: finalCode }
      });

      if (codeExists) {
        let counter = 1;
        while (codeExists) {
          finalCode = `${currentYear}-${String(nextNumber + counter).padStart(4, '0')}`;
          const exists = await prisma.product.findFirst({
            where: { code: finalCode }
          });
          if (!exists) break;
          counter++;
        }
      }
    } else {
      const existingCode = await prisma.product.findFirst({
        where: { code: finalCode }
      });

      if (existingCode) {
        return NextResponse.json(
          { error: 'Ce code produit existe déjà' },
          { status: 400 }
        );
      }
    }

    // Calculer le prix HT à partir du TTC avec la bonne TVA
    const prixVenteHT = tvaValue > 0 ? prixVente / (1 + tvaValue / 100) : prixVente;

    // Préparer les données
    const productData: any = {
      reference: reference || `SERV-${Date.now()}`,
      code: finalCode,
      designation,
      prixAchat: 0,
      prixAchatHT: 0,
      prixVente: prixVente,
      prixVenteHT: prixVenteHT,
      tva: tvaValue,
      quantiteStock: 0,
      seuilAlerte: 0,
      plafondRemise: 0,
      type: type || 'SERVICE',
    };

    if (categoryId) productData.categoryId = categoryId;
    if (uniteId) productData.uniteId = uniteId;
    if (homeId) productData.homeId = homeId;

    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
        home: true,
        unite: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}