// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

// GET - Récupérer un produit spécifique
export async function GET(
    req: NextRequest,
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

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                home: true,
                unite: true,
            },
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Produit non trouvé' },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json(
            { error: 'Failed to fetch product' },
            { status: 500 }
        );
    }
}

// PUT - Mettre à jour un produit
export async function PUT(
    req: NextRequest,
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
        const body = await req.json();

        // Vérifier si le produit existe
        const existingProduct = await prisma.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            return NextResponse.json(
                { error: 'Produit non trouvé' },
                { status: 404 }
            );
        }

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
            prixAchat,
            prixAchatHT,
            quantiteStock,
            seuilAlerte,
            plafondRemise,
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

        // ✅ Utiliser la TVA du body ou valeur existante
        const tvaValue = tva !== undefined && tva !== null ? tva : existingProduct.tva;

        // Calculer le prix HT à partir du TTC avec la bonne TVA
        const prixVenteHT = tvaValue > 0 ? prixVente / (1 + tvaValue / 100) : prixVente;

        // ✅ Vérifier si la référence existe déjà (uniquement si elle a changé)
        if (reference && reference !== existingProduct.reference) {
            const existingReference = await prisma.product.findUnique({
                where: { reference }
            });

            if (existingReference) {
                return NextResponse.json(
                    { error: 'Cette référence est déjà utilisée par un autre produit' },
                    { status: 400 }
                );
            }
        }

        // ✅ Vérifier si le code existe déjà (uniquement si modifié)
        if (code && code !== existingProduct.code) {
            const existingCode = await prisma.product.findFirst({
                where: { code }
            });

            if (existingCode) {
                return NextResponse.json(
                    { error: 'Ce code produit est déjà utilisé' },
                    { status: 400 }
                );
            }
        }

        // ✅ Préparer les données - ne mettre à jour que les champs fournis
        const productData: any = {
            designation,
            prixVente,
            prixVenteHT,
            tva: tvaValue,
        };

        // Mettre à jour la référence uniquement si fournie
        if (reference !== undefined) {
            productData.reference = reference || `SERV-${Date.now()}`;
        }

        // Mettre à jour le code uniquement si fourni
        if (code !== undefined) {
            productData.code = code;
        }

        // Mettre à jour le type si fourni
        if (type !== undefined) {
            productData.type = type;
        }

        // Champs optionnels - ne mettre à jour que s'ils sont fournis
        if (prixAchat !== undefined) productData.prixAchat = prixAchat;
        if (prixAchatHT !== undefined) productData.prixAchatHT = prixAchatHT;
        if (quantiteStock !== undefined) productData.quantiteStock = quantiteStock;
        if (seuilAlerte !== undefined) productData.seuilAlerte = seuilAlerte;
        if (plafondRemise !== undefined) productData.plafondRemise = plafondRemise;
        if (categoryId !== undefined) productData.categoryId = categoryId;
        if (uniteId !== undefined) productData.uniteId = uniteId;
        if (homeId !== undefined) productData.homeId = homeId;

        const product = await prisma.product.update({
            where: { id },
            data: productData,
            include: {
                category: true,
                home: true,
                unite: true,
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update product' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer un produit
export async function DELETE(
    req: NextRequest,
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

        const existingProduct = await prisma.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            return NextResponse.json(
                { error: 'Produit non trouvé' },
                { status: 404 }
            );
        }

        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json(
            { message: 'Produit supprimé avec succès' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete product' },
            { status: 500 }
        );
    }
}