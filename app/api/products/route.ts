import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all products with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeStock = searchParams.get('includeStock') === 'true';
    const type = searchParams.get('type');

    // Construire l'objet include dynamiquement
    const include: any = {
      category: true,
      home: true,
      unite: true,
    };

    if (includeStock) {
      include.stockLocations = {
        include: {
          home: true,
        },
      };
      include.stockParType = true;
    }

    if (includeHistory) {
      include.historiquePrix = {
        orderBy: { dateApplication: 'desc' },
        take: 1,
      };
    }

    // Construire le where
    const where: any = {};
    if (type) {
      where.type = type;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where,
        include,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transformer les produits
    const productsWithExtra = products.map(product => {
      const stockParTypeObj: Record<string, number> = {};
      if (product.stockParType && Array.isArray(product.stockParType)) {
        product.stockParType.forEach((item: any) => {
          stockParTypeObj[item.typeBE] = item.quantite;
        });
      }

      const extraFields: any = {};
      if (includeHistory) {
        const historiquePrix = product.historiquePrix as any;
        extraFields.dernierPrixAchatTTC = historiquePrix?.[0]?.prixAchat || product.prixAchat;
        extraFields.dernierPrixAchatHT = historiquePrix?.[0]?.prixAchatHT || (product as any).prixAchatHT;
        extraFields.dernierPrixVente = historiquePrix?.[0]?.prixVente || product.prixVenteHT;
        extraFields.derniereDateAchat = historiquePrix?.[0]?.dateApplication || null;
      }

      const uniteInfo = product.unite ? {
        uniteNom: product.unite.nom,
        uniteSymbole: product.unite.symbole,
      } : {
        uniteNom: 'Pièce',
        uniteSymbole: 'pc',
      };

      return {
        ...product,
        stockParType: stockParTypeObj,
        ...extraFields,
        ...uniteInfo,
        // Pour les services, on force les valeurs de stock à 0
        quantiteStock: product.type === 'SERVICE' ? 0 : product.quantiteStock,
        prixAchat: product.type === 'SERVICE' ? 0 : product.prixAchat,
        prixAchatHT: product.type === 'SERVICE' ? 0 : product.prixAchatHT,
      };
    });

    return NextResponse.json({
      data: productsWithExtra,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    const body = await req.json();
    const {
      reference,
      code,
      designation,
      categoryId,
      prixAchat,
      prixAchatHT,
      prixVente,
      tva,
      seuilAlerte,
      plafondRemise,
      imageUrl,
      uniteId,
      type,
    } = body;

    // Validation des champs requis
    if (!reference || !designation || !categoryId) {
      return NextResponse.json(
        { error: 'Les champs référence, désignation et catégorie sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si la référence existe déjà
    const existingReference = await prisma.product.findUnique({
      where: { reference }
    });

    if (existingReference) {
      return NextResponse.json(
        { error: 'Cette référence existe déjà' },
        { status: 400 }
      );
    }

    // Si une unité est fournie, vérifier qu'elle existe
    if (uniteId) {
      const unite = await prisma.unite.findUnique({
        where: { id: uniteId }
      });
      if (!unite) {
        return NextResponse.json(
          { error: 'Unité non trouvée' },
          { status: 400 }
        );
      }
    }

    // Gérer le code produit (auto-génération si vide)
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

    // Pour les services, forcer prixAchat = 0 et quantiteStock = 0
    const isService = type === 'SERVICE';
    const finalPrixAchat = isService ? 0 : prixAchat;
    const finalPrixAchatHT = isService ? 0 : prixAchatHT;
    const finalQuantiteStock = 0; // Toujours 0 à la création
    const finalSeuilAlerte = isService ? 0 : seuilAlerte || 5;

    // Récupérer l'entrepôt principal (uniquement pour les STOCK)
    let defaultHome = null;
    let finalHomeId = null; // ← MODIFICATION: Utiliser null au lieu de ""

    if (!isService) {
      defaultHome = await prisma.home.findFirst({
        where: { nom: 'PRINCIPAL' }
      });

      if (!defaultHome) {
        return NextResponse.json(
          { error: 'Entrepôt principal non trouvé' },
          { status: 500 }
        );
      }
      finalHomeId = defaultHome.id;
    }

    // Créer le produit
    const product = await prisma.product.create({
      data: {
        reference,
        code: finalCode,
        designation,
        categoryId,
        homeId: finalHomeId, // ← MODIFICATION: null pour SERVICE, ID pour STOCK
        prixAchat: finalPrixAchat,
        prixAchatHT: finalPrixAchatHT,
        prixVente,
        tva: tva || 19,
        quantiteStock: finalQuantiteStock,
        seuilAlerte: finalSeuilAlerte,
        plafondRemise: isService ? 0 : plafondRemise || 0,
        imageUrl: imageUrl || null,
        uniteId: uniteId || null,
        type: type || 'STOCK',
      },
      include: {
        category: true,
        home: true,
        unite: true,
      },
    });

    // Si c'est un STOCK, créer aussi une entrée StockLocation
    if (!isService && defaultHome) {
      await prisma.stockLocation.create({
        data: {
          productId: product.id,
          homeId: defaultHome.id,
          quantite: 0,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}