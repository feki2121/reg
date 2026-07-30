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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/types";
import { Loader2, Plus, Trash2, Save, ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Select2 from "react-select";
import Link from "next/link";

interface Client {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
}

interface Chantier {
  id: string;
  nom: string;
  reference?: string;
  clientId?: string;
  adresse?: string;
  statut: string;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  tva: number;
  unite?: {
    id: string;
    nom: string;
    symbole?: string;
  };
}

interface LigneDevis {
  id: string;
  productId: string;
  productDesignation?: string;
  productReference?: string;
  productCode?: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  uniteId?: string;
  uniteSymbole?: string;
  isNewProduct?: boolean;
  newProduct?: {
    reference: string;
    code: string;
    designation: string;
    categoryId: string;
    prixVente: number;
    tva: number;
  };
}

type OptionType = {
  value: string;
  label: string;
  isDisabled?: boolean
};

export default function CreerDevisPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remise, setRemise] = useState(0);
  const [remiseType, setRemiseType] = useState<"PERCENT" | "FIXED">("PERCENT");

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedChantierId, setSelectedChantierId] = useState(""); // ← AJOUT
  const [validite, setValidite] = useState("");
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  const [newProductData, setNewProductData] = useState({
    reference: "",
    code: "",
    designation: "",
    categoryId: "",
    prixVente: 0,
    tva: 19,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchChantiers(); // ← AJOUT
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=100");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Erreur", description: "Impossible de charger les clients", variant: "destructive" });
    }
  };

  // ← NOUVELLE FONCTION
  const fetchChantiers = async () => {
    try {
      const response = await fetch("/api/chantiers?limit=500");
      const data = await response.json();
      setChantiers(data.data || []);
    } catch (error) {
      console.error("Error fetching chantiers:", error);
      toast({ title: "Erreur", description: "Impossible de charger les chantiers", variant: "destructive" });
    }
  };

  const fetchProducts = async () => {
    try {
      // const response = await fetch("/api/products?limit=1000&includeStock=true");
      const response = await fetch("/api/products?limit=1000&includeStock=true&type=SERVICE");


      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Effet pour mettre à jour le client quand le chantier change
  useEffect(() => {
    if (selectedChantierId) {
      const chantier = chantiers.find((c) => c.id === selectedChantierId);
      if (chantier && chantier.clientId) {
        setSelectedClientId(chantier.clientId);
      }
    }
  }, [selectedChantierId, chantiers]);

  const addLigne = () => {
    setLignes([...lignes, {
      id: `ligne-${Date.now()}-${Math.random()}`,
      productId: "",
      quantite: 1,
      prixUnitaire: 0,
      tva: 19
    }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneDevis, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };

    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLignes[index].prixUnitaire = product.prixVente;
        newLignes[index].productDesignation = product.designation;
        newLignes[index].productReference = product.reference;
        newLignes[index].tva = product.tva;
        newLignes[index].uniteId = product.unite?.id;
        newLignes[index].uniteSymbole = product.unite?.symbole || product.unite?.nom || 'pc';
      }
    }

    setLignes(newLignes);
  };

  const handleCreateNewProduct = () => {
    if (!newProductData.reference || !newProductData.designation || !newProductData.categoryId) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    const newLigne: LigneDevis = {
      id: `new-${Date.now()}`,
      productId: "",
      quantite: 1,
      prixUnitaire: newProductData.prixVente,
      tva: newProductData.tva,
      isNewProduct: true,
      newProduct: { ...newProductData },
    };

    setLignes([...lignes, newLigne]);
    setShowNewProductForm(false);
    setNewProductData({ reference: "", code: "", designation: "", categoryId: "", prixVente: 0, tva: 19 });

    toast({ title: "Succès", description: "Produit ajouté au devis" });
  };

  const calculerSousTotal = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  const calculerMontantRemise = () => {
    const sousTotal = calculerSousTotal();
    if (remiseType === "PERCENT") {
      return (sousTotal * remise) / 100;
    }
    return remise;
  };

  const calculateTotalTTC = () => {
    const sousTotal = calculerSousTotal();
    const montantRemise = calculerMontantRemise();
    return sousTotal - montantRemise;
  };

  const calculateTotalHT = () => {
    const ttc = calculateTotalTTC();
    let totalHTAvantRemise = 0;
    let totalTTCAvantRemise = 0;

    lignes.forEach(l => {
      const quantite = l.quantite;
      const prixTTC = l.prixUnitaire;
      const tva = l.tva / 100;
      const prixHT = prixTTC / (1 + tva);

      totalHTAvantRemise += quantite * prixHT;
      totalTTCAvantRemise += quantite * prixTTC;
    });

    if (totalTTCAvantRemise === 0) return 0;

    const ratioRemise = ttc / totalTTCAvantRemise;
    return totalHTAvantRemise * ratioRemise;
  };

  const calculateTotalTVA = () => {
    return calculateTotalTTC() - calculateTotalHT();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    const lignesValides = lignes.filter(l => (l.productId || l.isNewProduct) && l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un produit", variant: "destructive" });
      return;
    }

    if (!validite) {
      toast({ title: "Erreur", description: "Veuillez spécifier une date de validité", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: `DEV-${Date.now()}`,
          clientId: selectedClientId,
          chantierId: selectedChantierId || null, // ← AJOUT
          totalHT: calculateTotalHT(),
          totalTTC: calculateTotalTTC(),
          validite,
          remise: remise,
          remiseType: remiseType,
          statut: "EN_ATTENTE",
          lignes: lignesValides.map(l => ({
            productId: l.productId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            tva: l.tva,
            newProduct: l.isNewProduct ? l.newProduct : undefined,
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Devis créé avec succès" });
      router.push('/devis');
    } catch (error) {
      console.error("Error creating devis:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer le devis", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Options pour les produits avec unité
  const options: OptionType[] = products.map((p) => ({
    value: p.id,
    label: `${p.designation} (${p.unite?.symbole || p.unite?.nom || 'pc'})`,
  }));

  const referenceOptions: OptionType[] = products.map((p) => ({
    value: p.id,
    label: `${p.reference} (${p.unite?.symbole || p.unite?.nom || 'pc'})`,
  }));


  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Nouveau Devis" subtitle="Créer un devis pour un client" />
        <main className="p-4 md:p-6">
          <Link href="/devis">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      {isMounted && (
                        <Select2
                          options={
                            clients.length === 0
                              ? [{ value: "", label: "Aucun client disponible" }]
                              : clients.map(c => ({
                                value: c.id,
                                label: `${c.nom} - ${c.telephone}`
                              }))
                          }
                          value={
                            clients
                              .map(c => ({ value: c.id, label: `${c.nom} - ${c.telephone}` }))
                              .find(o => o.value === selectedClientId) || null
                          }
                          onChange={(selected: OptionType | null) =>
                            setSelectedClientId(selected?.value || "")
                          }
                          placeholder="Sélectionner un client"
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          }}
                        />
                      )}
                    </div>

                    {/* ← NOUVEAU CHAMP : Chantier */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Chantier
                      </Label>
                      {isMounted && (
                        <Select2
                          options={
                            chantiers.length === 0
                              ? [{ value: "", label: "Aucun chantier disponible" }]
                              : [
                                { value: "", label: "Aucun chantier" },
                                ...chantiers.map(c => ({
                                  value: c.id,
                                  label: `${c.nom} ${c.reference ? `(${c.reference})` : ''}`
                                }))
                              ]
                          }
                          value={
                            chantiers
                              .map(c => ({ value: c.id, label: `${c.nom} ${c.reference ? `(${c.reference})` : ''}` }))
                              .find(o => o.value === selectedChantierId) ||
                            { value: "", label: "Aucun chantier" }
                          }
                          onChange={(selected: OptionType | null) => {
                            const value = selected?.value || "";
                            setSelectedChantierId(value);
                          }}
                          placeholder="Sélectionner un chantier"
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          }}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Le client sera automatiquement associé si le chantier a un client
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Date de validité *</Label>
                      <Input
                        type="date"
                        value={validite}
                        onChange={(e) => setValidite(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produits</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Désignation</TableHead>
                            {/* <TableHead>Référence</TableHead> */}
                            {/* <TableHead>Unité</TableHead> */}
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix Unitaire (TTC)</TableHead>
                            <TableHead>TVA</TableHead>
                            <TableHead>Total TTC</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* ✅ Utiliser un fragment pour éviter les espaces blancs */}
                          <>
                            {lignes.map((ligne, idx) => (
                              <TableRow key={ligne.id}>
                                <TableCell className="min-w-[220px]">
                                  {ligne.isNewProduct ? (
                                    <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                      {ligne.newProduct?.designation}
                                    </div>
                                  ) : isMounted && (
                                    <Select2<OptionType>
                                      options={options}
                                      value={options.find(o => o.value === ligne.productId) || null}
                                      onChange={(selected: OptionType | null) =>
                                        updateLigne(idx, "productId", selected?.value || "")
                                      }
                                      placeholder="Sélectionner produit"
                                      isSearchable
                                      className="text-sm"
                                      classNamePrefix="select"
                                      menuPortalTarget={document.body}
                                      styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                      }}
                                    />
                                  )}
                                </TableCell>

                                {/* <TableCell className="min-w-[200px]">
                                  {ligne.isNewProduct ? (
                                    <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                      {ligne.newProduct?.reference}
                                    </div>
                                  ) : isMounted && (
                                    <Select2<OptionType>
                                      options={referenceOptions}
                                      value={referenceOptions.find(o => o.value === ligne.productId) || null}
                                      onChange={(selected: OptionType | null) =>
                                        updateLigne(idx, "productId", selected?.value || "")
                                      }
                                      placeholder="Sélectionner référence"
                                      isSearchable
                                      className="text-sm"
                                      classNamePrefix="select"
                                      menuPortalTarget={document.body}
                                      styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                      }}
                                    />
                                  )}
                                </TableCell> */}

                                {/* <TableCell>
                                  <span className="text-sm font-medium">
                                    {ligne.uniteSymbole || 'pc'}
                                  </span>
                                </TableCell> */}

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={ligne.quantite}
                                    onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    value={ligne.prixUnitaire}
                                    onChange={(e) => updateLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                    className="w-32"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    value={ligne.tva}
                                    onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>

                                <TableCell className="font-medium">
                                  {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                                </TableCell>

                                <TableCell>
                                  {lignes.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600"
                                      onClick={() => removeLigne(idx)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        </TableBody>
                      </Table>
                    </div>
                    {/* Section Remise et Totaux */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-col items-end gap-2">
                        {/* Section Remise */}
                        <div className="flex items-center gap-2 w-80">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Remise"
                            value={remise === 0 ? "" : remise}
                            onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                          <Select
                            value={remiseType}
                            onValueChange={(value: "PERCENT" | "FIXED") => setRemiseType(value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENT">%</SelectItem>
                              <SelectItem value="FIXED">DT</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setRemise(0); setRemiseType("PERCENT"); }}
                          >
                            ×
                          </Button>
                        </div>

                        {remise > 0 && (
                          <div className="flex justify-between w-80 text-green-600">
                            <span>Remise ({remise}{remiseType === "PERCENT" ? "%)" : " DT)"}) :</span>
                            <span>- {formatCurrency(calculerMontantRemise())}</span>
                          </div>
                        )}

                        <div className="flex justify-between w-80">
                          <span>Total HT :</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalHT())}</span>
                        </div>

                        <div className="flex justify-between w-80">
                          <span>TVA :</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span>
                        </div>

                        <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                          <span>Total TTC :</span>
                          <span>{formatCurrency(calculateTotalTTC())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/devis')}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || lignes.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Créer le devis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}