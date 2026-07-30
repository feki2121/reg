"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus, Trash2, Save, ArrowLeft, Building2, AlertCircle } from "lucide-react";
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
}

interface Product {
    id: string;
    reference: string;
    code: string;
    designation: string;
    prixVente: number;
    tva: number;
    type: 'STOCK' | 'SERVICE';
    unite?: {
        id: string;
        nom: string;
        symbole?: string;
    };
}

interface LigneFacture {
    id: string;
    productId: string;
    productDesignation?: string;
    productReference?: string;
    productCode?: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
    remiseLigne: number;
    uniteSymbole?: string;
}

type OptionType = {
    value: string;
    label: string;
    isDisabled?: boolean;
    data?: Product;
};

export default function CreerFacturePage() {
    const { sidebarClasses } = useSidebar();
    const router = useRouter();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [chantiers, setChantiers] = useState<Chantier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [remise, setRemise] = useState(0);
    const [remiseType, setRemiseType] = useState<"PERCENT" | "FIXED">("PERCENT");

    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedChantierId, setSelectedChantierId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lignes, setLignes] = useState<LigneFacture[]>([
        { id: `ligne-${Date.now()}`, productId: "", quantite: 1, prixUnitaire: 0, tva: 19, remiseLigne: 0 }
    ]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        fetchClients();
        fetchChantiers();
        fetchProducts();
    }, []);

    // Effet pour mettre à jour le client quand le chantier change
    useEffect(() => {
        if (selectedChantierId) {
            const chantier = chantiers.find((c) => c.id === selectedChantierId);
            if (chantier && chantier.clientId) {
                setSelectedClientId(chantier.clientId);
            }
        }
    }, [selectedChantierId, chantiers]);

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

    const fetchChantiers = async () => {
        try {
            const response = await fetch("/api/chantiers?limit=500");
            const data = await response.json();
            setChantiers(data.data || []);
        } catch (error) {
            console.error("Error fetching chantiers:", error);
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

    const addLigne = () => {
        setLignes([...lignes, {
            id: `ligne-${Date.now()}-${Math.random()}`,
            productId: "",
            quantite: 1,
            prixUnitaire: 0,
            tva: 19,
            remiseLigne: 0
        }]);
    };

    const removeLigne = (index: number) => {
        if (lignes.length > 1) {
            setLignes(lignes.filter((_, i) => i !== index));
        }
    };

    const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
        const newLignes = [...lignes];
        newLignes[index] = { ...newLignes[index], [field]: value };

        if (field === 'productId' && value) {
            const product = products.find(p => p.id === value);
            if (product) {
                newLignes[index].prixUnitaire = product.prixVente;
                newLignes[index].productDesignation = product.designation;
                newLignes[index].productReference = product.reference;
                newLignes[index].productCode = product.code;
                newLignes[index].tva = product.tva;
                newLignes[index].uniteSymbole = product.unite?.symbole || product.unite?.nom || 'pc';
            }
        }

        setLignes(newLignes);
    };

    // Vérifier si tous les taux de TVA sont identiques
    const hasMultipleTVA = useMemo(() => {
        const tauxTVA = lignes
            .filter(l => l.productId)
            .map(l => l.tva || 19);
        const tauxUniques = [...new Set(tauxTVA)];
        return tauxUniques.length > 1;
    }, [lignes]);

    // Calcul des totaux avec la logique de remise
    const calculerTotaux = () => {
        const lignesValides = lignes.filter(l => l.productId && l.quantite > 0);

        if (lignesValides.length === 0) {
            return { totalHT: 0, totalTVA: 0, totalTTC: 0, montantRemise: 0 };
        }

        const tauxTVA = lignesValides.map(l => l.tva || 19);
        const tauxUniques = [...new Set(tauxTVA)];
        const allSameTVA = tauxUniques.length === 1;

        // Calculer le total HT avant remise
        const totalHTAvantRemise = lignesValides.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);

        // Calculer le montant de la remise
        let montantRemise = 0;
        if (remiseType === 'PERCENT') {
            montantRemise = (totalHTAvantRemise * remise) / 100;
        } else {
            montantRemise = remise;
        }

        let totalHT = 0;
        let totalTVA = 0;
        let totalTTC = 0;

        if (allSameTVA) {
            // Remise globale sur le total HT
            totalHT = totalHTAvantRemise - montantRemise;
            const tva = tauxUniques[0];
            totalTVA = totalHT * (tva / 100);
            totalTTC = totalHT + totalTVA;
        } else {
            // Remise proportionnelle sur chaque ligne
            const lignesAvecRemise = lignesValides.map(l => {
                const prixHTLigne = l.quantite * l.prixUnitaire;
                const proportion = prixHTLigne / totalHTAvantRemise;
                const remiseLigne = montantRemise * proportion;
                const htApresRemise = prixHTLigne - remiseLigne;
                const tvaLigne = htApresRemise * (l.tva / 100);
                const ttcLigne = htApresRemise + tvaLigne;

                return { htApresRemise, tvaLigne, ttcLigne };
            });

            totalHT = lignesAvecRemise.reduce((sum, l) => sum + l.htApresRemise, 0);
            totalTVA = lignesAvecRemise.reduce((sum, l) => sum + l.tvaLigne, 0);
            totalTTC = lignesAvecRemise.reduce((sum, l) => sum + l.ttcLigne, 0);
        }

        return {
            totalHT,
            totalTVA,
            totalTTC,
            montantRemise,
            allSameTVA,
            totalHTAvantRemise
        };
    };

    const totaux = calculerTotaux();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClientId) {
            toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
            return;
        }

        const lignesValides = lignes.filter(l => l.productId && l.quantite > 0);
        if (lignesValides.length === 0) {
            toast({ title: "Erreur", description: "Ajoutez au moins un produit", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/factures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: `FACT-${Date.now()}`,
                    clientId: selectedClientId,
                    chantierId: selectedChantierId || null,
                    date: date,
                    lignes: lignesValides.map(l => ({
                        productId: l.productId,
                        quantite: l.quantite,
                        prixUnitaire: l.prixUnitaire,
                        tva: l.tva,
                        remiseLigne: l.remiseLigne || 0,
                        homeId: null,
                    })),
                    remise: remise,
                    remiseType: remiseType,
                    statut: "IMPAYEE",
                    type: "DIRECTE",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erreur lors de la création");
            }

            toast({ title: "Succès", description: "Facture créée avec succès" });
            router.push('/factures');
        } catch (error) {
            console.error("Error creating facture:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de créer la facture",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Options pour les produits
    const options: OptionType[] = products.map((p) => ({
        value: p.id,
        label: `${p.designation} (${p.unite?.symbole || p.unite?.nom || 'pc'})`,
        data: p,
    }));

    const referenceOptions: OptionType[] = products.map((p) => ({
        value: p.id,
        label: `${p.reference} (${p.unite?.symbole || p.unite?.nom || 'pc'})`,
        data: p,
    }));

    const codeOptions: OptionType[] = products.map((p) => ({
        value: p.id,
        label: `${p.code || p.reference} (${p.unite?.symbole || p.unite?.nom || 'pc'})`,
        data: p,
    }));

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="Nouvelle Facture" subtitle="Créer une facture" />
                <main className="p-4 md:p-6">
                    <Link href="/factures">
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
                                                    options={clients.map(c => ({
                                                        value: c.id,
                                                        label: `${c.nom} - ${c.telephone}`
                                                    }))}
                                                    value={clients
                                                        .map(c => ({ value: c.id, label: `${c.nom} - ${c.telephone}` }))
                                                        .find(o => o.value === selectedClientId) || null}
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

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                Chantier
                                            </Label>
                                            {isMounted && (
                                                <Select2
                                                    options={[
                                                        { value: "", label: "Aucun chantier" },
                                                        ...chantiers.map(c => ({
                                                            value: c.id,
                                                            label: `${c.nom} ${c.reference ? `(${c.reference})` : ''}`
                                                        }))
                                                    ]}
                                                    value={chantiers
                                                        .map(c => ({ value: c.id, label: `${c.nom} ${c.reference ? `(${c.reference})` : ''}` }))
                                                        .find(o => o.value === selectedChantierId) ||
                                                        { value: "", label: "Aucun chantier" }}
                                                    onChange={(selected: OptionType | null) => {
                                                        setSelectedChantierId(selected?.value || "");
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
                                            <Label>Date de la facture</Label>
                                            <Input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
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
                                                        {/* <TableHead>Référence</TableHead>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Unité</TableHead> */}
                                                        <TableHead>Quantité</TableHead>
                                                        <TableHead>Prix Unitaire (HT)</TableHead>
                                                        <TableHead>TVA</TableHead>
                                                        <TableHead>Total HT</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {lignes.map((ligne, idx) => (
                                                        <TableRow key={ligne.id}>
                                                            <TableCell className="min-w-[200px]">
                                                                {isMounted && (
                                                                    <Select2<OptionType>
                                                                        options={options}
                                                                        value={options.find(o => o.value === ligne.productId) || null}
                                                                        onChange={(selected: OptionType | null) =>
                                                                            updateLigne(idx, "productId", selected?.value || "")
                                                                        }
                                                                        placeholder="Désignation"
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

                                                            {/* <TableCell className="min-w-[150px]">
                                                                {isMounted && (
                                                                    <Select2<OptionType>
                                                                        options={referenceOptions}
                                                                        value={referenceOptions.find(o => o.value === ligne.productId) || null}
                                                                        onChange={(selected: OptionType | null) =>
                                                                            updateLigne(idx, "productId", selected?.value || "")
                                                                        }
                                                                        placeholder="Référence"
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

                                                            <TableCell className="min-w-[150px]">
                                                                {isMounted && (
                                                                    <Select2<OptionType>
                                                                        options={codeOptions}
                                                                        value={codeOptions.find(o => o.value === ligne.productId) || null}
                                                                        onChange={(selected: OptionType | null) =>
                                                                            updateLigne(idx, "productId", selected?.value || "")
                                                                        }
                                                                        placeholder="Code"
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

                                                            <TableCell>
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
                                                                    className="w-20"
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
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Section Remise - Affichage conditionnel */}
                                        {lignes.some(l => l.productId) && (
                                            <div className="pt-4 border-t">
                                                <div className="flex flex-col items-end gap-2">
                                                    {/* Avertissement si plusieurs taux de TVA */}
                                                    {hasMultipleTVA && (
                                                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg w-80">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <span className="text-xs">
                                                                La remise sera répartie proportionnellement sur chaque ligne
                                                            </span>
                                                        </div>
                                                    )}

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
                                                            <span>- {formatCurrency(totaux.montantRemise)}</span>
                                                        </div>
                                                    )}

                                                    {totaux.totalHTAvantRemise > 0 && remise > 0 && (
                                                        <div className="flex justify-between w-80 text-sm text-muted-foreground">
                                                            <span>Total HT avant remise :</span>
                                                            <span>{formatCurrency(totaux.totalHTAvantRemise)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between w-80">
                                                        <span>Total HT :</span>
                                                        <span className="font-semibold">{formatCurrency(totaux.totalHT)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80">
                                                        <span>TVA :</span>
                                                        <span className="font-semibold">{formatCurrency(totaux.totalTVA)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                                                        <span>Total TTC :</span>
                                                        <span>{formatCurrency(totaux.totalTTC)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Boutons d'action */}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => router.push('/factures')}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isSubmitting || lignes.filter(l => l.productId).length === 0}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Création...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Créer la facture
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