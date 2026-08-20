// app/produits/edit/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Package, Wrench, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ProductType = "STOCK" | "SERVICE";

interface Product {
    id: string;
    reference: string;
    code: string;
    designation: string;
    type: ProductType;
    prixVente: number;
    prixVenteHT: number;
    tva: number;
    prixAchat: number;
    prixAchatHT: number;
    quantiteStock: number;
    seuilAlerte: number;
    plafondRemise: number;
    categoryId: string | null;
    uniteId: string | null;
    homeId: string | null;
}

export default function EditProduitPage() {
    const { sidebarClasses } = useSidebar();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState({
        reference: "",
        code: "",
        designation: "",
        type: "SERVICE" as ProductType,
        prixVente: 0,
        tva: 19,
        prixAchat: 0,
        quantiteStock: 0,
        seuilAlerte: 0,
        plafondRemise: 0,
    });

    useEffect(() => {
        setIsMounted(true);
        if (id) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/products/${id}`);
            if (!response.ok) throw new Error("Produit non trouvé");
            const data = await response.json();
            setProduct(data);

            // ✅ Remplir le formulaire avec les données du produit
            setFormData({
                reference: data.reference || "",
                code: data.code || "",
                designation: data.designation || "",
                type: data.type || "SERVICE",
                prixVente: data.prixVente || 0,
                tva: data.tva ?? 19, // ✅ Récupérer la TVA du produit (nullish coalescing pour conserver 0)
                prixAchat: data.prixAchat || 0,
                quantiteStock: data.quantiteStock || 0,
                seuilAlerte: data.seuilAlerte || 0,
                plafondRemise: data.plafondRemise || 0,
            });

            console.log("Produit chargé avec TVA:", data.tva); // ✅ Debug
        } catch (error) {
            console.error("Error fetching product:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger le produit",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (value: ProductType) => {
        setFormData(prev => ({ ...prev, type: value }));
    };

    const handleTvaChange = (value: string) => {
        setFormData(prev => ({ ...prev, tva: parseFloat(value) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.designation) {
            toast({
                title: "Erreur",
                description: "La désignation est obligatoire",
                variant: "destructive"
            });
            return;
        }

        if (formData.prixVente <= 0) {
            toast({
                title: "Erreur",
                description: "Le prix de vente doit être supérieur à 0",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                reference: formData.type === 'SERVICE' ? undefined : formData.reference,
                tva: formData.tva, // ✅ Envoyer la TVA sélectionnée
            };

            console.log("Payload envoyé:", payload); // ✅ Debug

            const response = await fetch(`/api/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erreur lors de la mise à jour");
            }

            toast({
                title: "Succès",
                description: formData.type === 'SERVICE'
                    ? "Service mis à jour avec succès"
                    : "Produit mis à jour avec succès"
            });

            router.push('/produits');
        } catch (error) {
            console.error("Error updating product:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de mettre à jour le produit",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isService = formData.type === 'SERVICE';

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Modifier Produit" subtitle="Chargement..." />
                    <main className="p-4 md:p-6 flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </main>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Modifier Produit" subtitle="Produit non trouvé" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="py-8 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                                <p className="text-lg font-semibold">Produit non trouvé</p>
                                <p className="text-muted-foreground">Ce produit n'existe pas ou a été supprimé</p>
                                <Button className="mt-4" onClick={() => router.push('/produits')}>
                                    Retour à la liste
                                </Button>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header
                    title={isService ? "Modifier le Service" : "Modifier le Produit"}
                    subtitle={isService ? `Service: ${product.designation}` : `Produit: ${product.designation}`}
                />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Link href="/produits">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour à la liste
                            </Button>
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations générales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Type */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-primary" />
                                            Type *
                                        </Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(v: ProductType) => handleTypeChange(v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner le type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SERVICE">
                                                    <div className="flex items-center gap-2">
                                                        <Wrench className="h-4 w-4" />
                                                        <span>Service (Prestation)</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="STOCK">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4" />
                                                        <span>Stock (Matériau)</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Désignation */}
                                    <div className="space-y-2">
                                        <Label>Désignation *</Label>
                                        <Input
                                            name="designation"
                                            placeholder={isService ? "Nom du service" : "Nom du produit"}
                                            value={formData.designation}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    {/* Référence */}
                                    {!isService && (
                                        <div className="space-y-2">
                                            <Label>Référence *</Label>
                                            <Input
                                                name="reference"
                                                placeholder="REF-001"
                                                value={formData.reference}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Code */}
                                    <div className="space-y-2">
                                        <Label>Code</Label>
                                        <Input
                                            name="code"
                                            placeholder="Auto-généré"
                                            value={formData.code}
                                            onChange={handleInputChange}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>

                                    {/* Prix de vente */}
                                    <div className="space-y-2">
                                        <Label>Prix de vente (TTC) *</Label>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            placeholder="0.000"
                                            value={formData.prixVente === 0 ? "" : formData.prixVente}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                prixVente: parseFloat(e.target.value) || 0
                                            }))}
                                            required
                                        />
                                    </div>

                                    {/* ✅ TVA - avec la valeur correcte */}
                                    <div className="space-y-2">
                                        <Label>TVA (%)</Label>
                                        <Select
                                            value={formData.tva.toString()}
                                            onValueChange={handleTvaChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner la TVA" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="19">19%</SelectItem>
                                                <SelectItem value="13">13%</SelectItem>
                                                <SelectItem value="7">7%</SelectItem>
                                                <SelectItem value="0">0%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            TVA sélectionnée : {formData.tva}%
                                        </p>
                                    </div>

                                    {/* Prix d'achat - uniquement pour STOCK */}
                                    {!isService && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Prix d'achat (HT)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="0.000"
                                                    name="prixAchat"
                                                    value={formData.prixAchat === 0 ? "" : formData.prixAchat}
                                                    onChange={handleInputChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Quantité en stock</Label>
                                                <Input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    placeholder="0"
                                                    name="quantiteStock"
                                                    value={formData.quantiteStock === 0 ? "" : formData.quantiteStock}
                                                    onChange={handleInputChange}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Seuil d'alerte</Label>
                                                <Input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    placeholder="0"
                                                    name="seuilAlerte"
                                                    value={formData.seuilAlerte === 0 ? "" : formData.seuilAlerte}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Plafond remise */}
                                    <div className="space-y-2">
                                        <Label>Plafond remise (%)</Label>
                                        <Input
                                            type="number"
                                            step="1"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            name="plafondRemise"
                                            value={formData.plafondRemise === 0 ? "" : formData.plafondRemise}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                {/* ✅ Affichage des informations */}
                                <div className="mt-4 p-3 bg-muted rounded-md grid grid-cols-2 gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">Code :</span> {formData.code}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">TVA :</span> {formData.tva}%
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">Prix HT :</span> {(formData.prixVente / (1 + formData.tva / 100)).toFixed(3)} DT
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">Prix TTC :</span> {formData.prixVente.toFixed(3)} DT
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="outline" onClick={() => router.push('/produits')}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Mise à jour...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isService ? "Mettre à jour le service" : "Mettre à jour le produit"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}