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
import { Loader2, Plus, Trash2, Save, ArrowLeft, Building2, AlertCircle, Wrench, Package } from "lucide-react";
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

interface Product {
    id: string;
    reference: string;
    code: string;
    designation: string;
    prixVente: number;
    prixVenteHT: number;
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
    prixUnitaireTTC: number;
    tva: number;
    remiseLigne: number;
    uniteSymbole?: string;
    type?: 'STOCK' | 'SERVICE';
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
    const [products, setProducts] = useState<Product[]>([]);
    const [services, setServices] = useState<Product[]>([]); // ← AJOUT: services uniquement
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [remise, setRemise] = useState(0);
    const [remiseType, setRemiseType] = useState<"PERCENT" | "FIXED">("PERCENT");

    const [selectedClientId, setSelectedClientId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lignes, setLignes] = useState<LigneFacture[]>([
        {
            id: `ligne-${Date.now()}`,
            productId: "",
            quantite: 1,
            prixUnitaire: 0,
            prixUnitaireTTC: 0,
            tva: 0,
            remiseLigne: 0
        }
    ]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        fetchClients();
        fetchServices(); // ← MODIFICATION: fetchServices au lieu de fetchProducts
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

    // ← NOUVELLE FONCTION: Récupérer uniquement les services
    const fetchServices = async () => {
        try {
            const response = await fetch("/api/products?limit=1000&type=SERVICE");
            const data = await response.json();
            setServices(data.data || []);
        } catch (error) {
            console.error("Error fetching services:", error);
            toast({ title: "Erreur", description: "Impossible de charger les services", variant: "destructive" });
        }
    };

    const addLigne = () => {
        setLignes([...lignes, {
            id: `ligne-${Date.now()}-${Math.random()}`,
            productId: "",
            quantite: 1,
            prixUnitaire: 0,
            prixUnitaireTTC: 0,
            tva: 0,
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
            const product = services.find(p => p.id === value); // ← MODIFICATION: utiliser services au lieu de products
            if (product) {
                // Pour les services, le prix est TTC
                const prixTTC = product.prixVente;
                const prixHT = product.prixVenteHT || (prixTTC / (1 + product.tva / 100));
                newLignes[index].prixUnitaireTTC = prixTTC;
                newLignes[index].prixUnitaire = prixHT;
                newLignes[index].productDesignation = product.designation;
                newLignes[index].productReference = product.reference;
                newLignes[index].productCode = product.code;
                newLignes[index].tva = product.tva;
                newLignes[index].uniteSymbole = product.unite?.symbole || product.unite?.nom || 'pc';
                newLignes[index].type = product.type;
            }
        }

        // Si on modifie le prix TTC, recalculer le HT
        if (field === 'prixUnitaireTTC') {
            const tva = newLignes[index].tva;
            newLignes[index].prixUnitaire = tva > 0 ? value / (1 + tva / 100) : value;
        }

        // Si on modifie le prix HT, recalculer le TTC
        if (field === 'prixUnitaire') {
            const tva = newLignes[index].tva;
            newLignes[index].prixUnitaireTTC = value * (1 + tva / 100);
        }

        // Si on modifie la TVA, recalculer les prix
        if (field === 'tva') {
            const prixHT = newLignes[index].prixUnitaire || 0;
            newLignes[index].prixUnitaireTTC = prixHT * (1 + value / 100);
        }

        setLignes(newLignes);
    };

    // Calcul des totaux
    const calculerTotaux = () => {
        const lignesValides = lignes.filter(l => l.productId && l.quantite > 0);

        if (lignesValides.length === 0) {
            return { totalHT: 0, totalTVA: 0, totalTTC: 0, montantRemise: 0, totalHTAvantRemise: 0, timbreFiscal: 1, totalTTCAvecTimbre: 1 };
        }

        // Calculer le total HT avant remise (utiliser prixUnitaire qui est le HT)
        const totalHTAvantRemise = lignesValides.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);

        // Calculer le montant de la remise
        let montantRemise = 0;
        if (remiseType === 'PERCENT') {
            montantRemise = (totalHTAvantRemise * remise) / 100;
        } else {
            montantRemise = remise;
        }

        let totalHT = totalHTAvantRemise - montantRemise;
        let totalTVA = 0;
        let totalTTC = 0;

        // Calculer la TVA pour chaque ligne
        lignesValides.forEach(l => {
            const htLigne = l.quantite * l.prixUnitaire;
            const proportion = htLigne / totalHTAvantRemise;
            const remiseLigne = montantRemise * proportion;
            const htApresRemise = htLigne - remiseLigne;
            const tvaLigne = htApresRemise * (l.tva / 100);

            totalTVA += tvaLigne;
            totalTTC += htApresRemise + tvaLigne;
        });

        return {
            totalHT: Number(totalHT.toFixed(3)),
            totalTVA: Number(totalTVA.toFixed(3)),
            totalTTC: Number(totalTTC.toFixed(3)),
            timbreFiscal: 1,
            totalTTCAvecTimbre: Number((totalTTC + 1).toFixed(3)),
            montantRemise: Number(montantRemise.toFixed(3)),
            totalHTAvantRemise: Number(totalHTAvantRemise.toFixed(3))
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
            toast({ title: "Erreur", description: "Ajoutez au moins un service", variant: "destructive" });
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
                    date: date,
                    totalHT: totaux.totalHT,
                    totalTVA: totaux.totalTVA,
                    totalTTC: totaux.totalTTC,
                    lignes: lignesValides.map(l => ({
                        productId: l.productId,
                        quantite: l.quantite,
                        prixUnitaire: l.prixUnitaire,
                        prixUnitaireTTC: l.prixUnitaireTTC,
                        tva: l.tva,
                        remiseLigne: l.remiseLigne || 0,
                        homeId: null,
                        type: l.type || 'SERVICE',
                    })),
                    remise: remise,
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

    // Options pour les services uniquement
    const options: OptionType[] = services.map((p) => ({
        value: p.id,
        label: `${p.designation} ${p.unite?.symbole ? `(${p.unite.symbole})` : ''}`,
        data: p,
    }));

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="Nouvelle Facture de Services" subtitle="Créer une facture pour des services" />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Link href="/factures">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour à la liste
                            </Button>
                        </Link>
                    </div>

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

                            {/* Services */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Wrench className="h-5 w-5 text-primary" />
                                        Services
                                    </CardTitle>
                                    <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                                        <Plus className="h-4 w-4 mr-1" /> Ajouter un service
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="border rounded-lg overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Désignation</TableHead>
                                                        <TableHead className="w-[80px]">Qté</TableHead>
                                                        <TableHead className="w-[120px]">Prix HT</TableHead>
                                                        <TableHead className="w-[120px]">Prix TTC</TableHead>
                                                        <TableHead className="w-[80px]">TVA</TableHead>
                                                        <TableHead className="w-[100px]">Total HT</TableHead>
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
                                                                        placeholder="Rechercher un service..."
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
                                                                    value={ligne.prixUnitaire?.toFixed(3) ?? "0.000"}
                                                                    onChange={(e) => updateLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                                                    className="w-32"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.001"
                                                                    value={ligne.prixUnitaireTTC || 0}
                                                                    onChange={(e) => updateLigne(idx, 'prixUnitaireTTC', parseFloat(e.target.value) || 0)}
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

                                        {/* Section Totaux */}
                                        {lignes.some(l => l.productId) && (
                                            <div className="pt-4 border-t">
                                                <div className="flex flex-col items-end gap-2">
                                                    {/* Remise */}
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

                                                    <div className="flex justify-between w-80 text-sm">
                                                        <span>Total HT :</span>
                                                        <span className="font-semibold">{formatCurrency(totaux.totalHT)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80 text-sm">
                                                        <span>TVA :</span>
                                                        <span className="font-semibold">{formatCurrency(totaux.totalTVA)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                                                        <span>Total TTC :</span>
                                                        <span className="text-primary">{formatCurrency(totaux.totalTTC)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80 text-sm border-t pt-2 mt-1">
                                                        <span>Timbre Fiscal :</span>
                                                        <span>{formatCurrency(totaux.timbreFiscal)}</span>
                                                    </div>

                                                    <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1 text-green-600">
                                                        <span>Total avec Timbre :</span>
                                                        <span>{formatCurrency(totaux.totalTTCAvecTimbre)}</span>
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
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || lignes.filter(l => l.productId).length === 0}
                                    className="gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Création...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
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