// app/produits/nouveau/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Package, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ProductType = "STOCK" | "SERVICE";

export default function CreerProduitPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    reference: "",
    code: "",
    designation: "",
    type: "SERVICE" as ProductType,
    prixVente: 0,
    tva: 19, // Valeur par défaut
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: ProductType) => {
    setFormData(prev => ({
      ...prev,
      type: value,
    }));
  };

  // ✅ Correction : Gestionnaire spécifique pour la TVA
  const handleTvaChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tva: parseFloat(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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
        // ✅ S'assurer que la TVA est bien envoyée
        tva: formData.tva,
      };

      console.log("Payload envoyé:", payload); // Pour déboguer

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      toast({ 
        title: "Succès", 
        description: formData.type === 'SERVICE' 
          ? "Service créé avec succès" 
          : "Produit créé avec succès" 
      });
      
      router.push('/produits');
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le produit",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isService = formData.type === 'SERVICE';

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header 
          title={isService ? "Nouveau Service" : "Nouveau Produit"} 
          subtitle={isService ? "Créer un nouveau service" : "Créer un nouveau produit"} 
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
                  {/* Type d'article */}
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
                    <p className="text-xs text-muted-foreground">
                      {isService
                        ? "Prestation sans gestion de stock"
                        : "Article avec gestion de stock"}
                    </p>
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

                  {/* Référence - Optionnel pour les services */}
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

                  {/* Code - Optionnel pour tous */}
                  <div className="space-y-2">
                    <Label>
                      Code
                      <span className="text-muted-foreground ml-1 text-xs">
                        (laissez vide pour auto-génération)
                      </span>
                    </Label>
                    <Input
                      name="code"
                      placeholder="Auto-généré"
                      value={formData.code}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Prix de vente TTC */}
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

                  {/* ✅ TVA - Correction ici */}
                  <div className="space-y-2">
                    <Label>TVA (%)</Label>
                    <Select
                      value={formData.tva.toString()}
                      onValueChange={handleTvaChange} // ✅ Utiliser le handler spécifique
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
                    {/* ✅ Afficher la valeur sélectionnée pour déboguer */}
                    <p className="text-xs text-muted-foreground">
                      TVA sélectionnée : {formData.tva}%
                    </p>
                  </div>
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
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isService ? "Créer le service" : "Créer le produit"}
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