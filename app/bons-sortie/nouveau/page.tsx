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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Save, ArrowLeft, Plus, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatCurrency } from "@/lib/types";
import Select2 from "react-select";
import { useSession } from "next-auth/react";

interface Product {
    id: string;
    reference: string;
    code: string;
    designation: string;
    prixVente: number;
    prixVenteHT: number;
    tva: number;
    quantiteStock: number;
    stockLocations?: Array<{
        homeId: string;
        quantite: number;
    }>;
    unite?: {
        id: string;
        nom: string;
        symbole?: string;
    };
}

interface Home {
    id: string;
    nom: string;
}

interface Client {
    id: string;
    nom: string;
    prenom?: string;
    telephone: string;
}

interface Chantier {
    id: string;
    nom: string;
    reference?: string;
    clientId?: string;
}

interface LigneBonSortie {
    id: string;
    productId: string;
    product?: Product;
    homeId: string;
    home?: Home;
    quantite: number;
    prixUnitaireHT: number;
    prixUnitaireTTC: number;
    remise: number;
    totalHT: number;
    totalTTC: number;
}

type OptionType = {
    value: string;
    label: string;
    isDisabled?: boolean;
    data?: Product;
};

export default function NouveauBonSortiePage() {
    const { sidebarClasses } = useSidebar();
    const router = useRouter();
    const { toast } = useToast();
    const { data: session } = useSession();

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [homes, setHomes] = useState<Home[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [chantiers, setChantiers] = useState<Chantier[]>([]);
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedChantier, setSelectedChantier] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const [defaultHomeId, setDefaultHomeId] = useState<string>("");

    const [formData, setFormData] = useState({
        destination: "",
        nomConducteur: "",
        matriculeVehicule: "",
        numCIN: "",
        dateDebut: "",
        dateFin: "",
        adresseLivraison: "",
        observation: "",
        motif: "VENTE",
        clientId: "",
        chantierId: "",
        destinataire: "",
    });

    const [lignes, setLignes] = useState<LigneBonSortie[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedHome, setSelectedHome] = useState("");
    const [quantite, setQuantite] = useState(1);
    const [prixUnitaireTTC, setPrixUnitaireTTC] = useState(0);
    const [remise, setRemise] = useState(0);

    useEffect(() => {
        setIsMounted(true);
        fetchUserRole();
        fetchData();
    }, []);

    const fetchUserRole = async () => {
        try {
            const response = await fetch(`/api/users/me`);
            if (response.ok) {
                const data = await response.json();
                setUserRole(data.role || "ADMIN");
                if (data.role === "CHAUFFEUR" && data.chauffeur?.vehicule?.homeId) {
                    setDefaultHomeId(data.chauffeur.vehicule.homeId);
                    setSelectedHome(data.chauffeur.vehicule.homeId);
                }
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            setUserRole("ADMIN");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, homesRes, clientsRes, chantiersRes] = await Promise.all([
                fetch("/api/products?limit=1000&includeStock=true"),
                fetch("/api/homes?limit=100"),
                fetch("/api/clients?limit=500"),
                fetch("/api/chantiers?limit=500"),
            ]);

            const productsData = await productsRes.json();
            const homesData = await homesRes.json();
            const clientsData = await clientsRes.json();
            const chantiersData = await chantiersRes.json();

            setProducts(productsData.data || []);
            setHomes(homesData.data || []);
            setClients(clientsData.data || []);
            setChantiers(chantiersData.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les données",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Effet pour mettre à jour le prix unitaire quand le produit change
    useEffect(() => {
        if (selectedProduct) {
            setPrixUnitaireTTC(selectedProduct.prixVente);
        }
    }, [selectedProduct]);

    // Effet pour mettre à jour le client quand le chantier change
    useEffect(() => {
        if (selectedChantier) {
            const chantier = chantiers.find((c) => c.id === selectedChantier);
            if (chantier && chantier.clientId) {
                setSelectedClient(chantier.clientId);
                setFormData((prev) => ({
                    ...prev,
                    clientId: chantier.clientId || "",
                }));
            }
        }
    }, [selectedChantier, chantiers]);

    const getStockDisponible = (productId: string, homeId: string): number => {
        const product = products.find(p => p.id === productId);
        if (!product) return 0;
        const stockLocation = product.stockLocations?.find(sl => sl.homeId === homeId);
        return stockLocation?.quantite || 0;
    };

    // Options pour les sélecteurs (comme dans BL)
    const designationOptions = (): OptionType[] => {
        return products.map(product => ({
            value: product.id,
            label: product.designation,
            isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId
                ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0)
                : product.quantiteStock === 0,
            data: product
        }));
    };

    const referenceOptions = (): OptionType[] => {
        return products.map(product => ({
            value: product.id,
            label: product.reference,
            isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId
                ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0)
                : product.quantiteStock === 0,
            data: product
        }));
    };

    const codeOptions = (): OptionType[] => {
        return products.map(product => ({
            value: product.id,
            label: product.code || product.reference,
            isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId
                ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0)
                : product.quantiteStock === 0,
            data: product
        }));
    };

    const getHomeOptions = (productId?: string) => {
        if (userRole !== 'ADMIN') {
            // Pour les chauffeurs, retourner uniquement leur home par défaut
            const defaultHome = homes.find(h => h.id === defaultHomeId);
            if (defaultHome) {
                return [{
                    value: defaultHome.id,
                    label: defaultHome.nom,
                    isDisabled: false,
                    data: defaultHome
                }];
            }
            return [];
        }

        const homesToShow = homes;

        return homesToShow.map(home => {
            const stockDisponible = productId ? getStockDisponible(productId, home.id) : 0;
            const isDisabled = productId ? stockDisponible <= 0 : true;

            return {
                value: home.id,
                label: productId
                    ? `${home.nom} (Stock: ${stockDisponible})`
                    : home.nom,
                isDisabled: isDisabled,
                stock: stockDisponible,
                data: home
            };
        });
    };

    const selectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            '&:hover': { borderColor: 'hsl(var(--primary))' },
            boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
            minHeight: '36px',
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isDisabled
                ? '#fef2f2'
                : state.isFocused
                    ? 'hsl(var(--accent))'
                    : 'transparent',
            color: state.isDisabled ? '#dc2626' : 'inherit',
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            opacity: state.isDisabled ? 0.7 : 1,
        }),
        singleValue: (base: any) => ({
            ...base,
            color: 'hsl(var(--foreground))',
            fontSize: '13px',
            fontWeight: '500',
            overflow: 'visible',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
        }),
        valueContainer: (base: any) => ({
            ...base,
            padding: '2px 8px',
            overflow: 'visible',
        }),
        input: (base: any) => ({
            ...base,
            color: 'hsl(var(--foreground))',
        }),
        placeholder: (base: any) => ({
            ...base,
            color: 'hsl(var(--muted-foreground))',
            fontSize: '13px',
        }),
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    };

    const addLigne = () => {
        if (!selectedProduct || !selectedHome || quantite <= 0) {
            toast({
                title: "Erreur",
                description: "Veuillez sélectionner un produit, un emplacement et une quantité valide",
                variant: "destructive",
            });
            return;
        }

        // Vérifier le stock
        const stockDisponible = getStockDisponible(selectedProduct.id, selectedHome);
        if (stockDisponible < quantite) {
            toast({
                title: "Stock insuffisant",
                description: `Stock disponible: ${stockDisponible}, Demandé: ${quantite}`,
                variant: "destructive",
            });
            return;
        }

        const product = selectedProduct;
        const home = homes.find((h) => h.id === selectedHome);

        const ligneHT = quantite * (prixUnitaireTTC / (1 + product.tva / 100));
        const ligneTTC = quantite * prixUnitaireTTC;

        const newLigne: LigneBonSortie = {
            id: `ligne-${Date.now()}`,
            productId: selectedProduct.id,
            product,
            homeId: selectedHome,
            home,
            quantite,
            prixUnitaireHT: prixUnitaireTTC / (1 + product.tva / 100),
            prixUnitaireTTC,
            remise,
            totalHT: ligneHT * (1 - remise / 100),
            totalTTC: ligneTTC * (1 - remise / 100),
        };

        setLignes([...lignes, newLigne]);

        // Réinitialiser les champs
        setSelectedProduct(null);
        setSelectedHome(userRole === 'CHAUFFEUR' && defaultHomeId ? defaultHomeId : "");
        setQuantite(1);
        setPrixUnitaireTTC(0);
        setRemise(0);
    };

    const removeLigne = (id: string) => {
        setLignes(lignes.filter((l) => l.id !== id));
    };

    const updateLigneQuantite = (id: string, newQuantite: number) => {
        setLignes(lignes.map(l => {
            if (l.id === id) {
                const ligneHT = newQuantite * l.prixUnitaireHT;
                const ligneTTC = newQuantite * l.prixUnitaireTTC;
                return {
                    ...l,
                    quantite: newQuantite,
                    totalHT: ligneHT * (1 - l.remise / 100),
                    totalTTC: ligneTTC * (1 - l.remise / 100),
                };
            }
            return l;
        }));
    };

    const calculateTotals = () => {
        const totalHT = lignes.reduce((sum, l) => sum + l.totalHT, 0);
        const totalTTC = lignes.reduce((sum, l) => sum + l.totalTTC, 0);
        return { totalHT, totalTTC };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (lignes.length === 0) {
            toast({
                title: "Erreur",
                description: "Ajoutez au moins une ligne au bon de sortie",
                variant: "destructive",
            });
            return;
        }

        if (!formData.destination) {
            toast({
                title: "Erreur",
                description: "La destination est obligatoire",
                variant: "destructive",
            });
            return;
        }

        // Vérifier le stock pour toutes les lignes
        for (const ligne of lignes) {
            const stockDisponible = getStockDisponible(ligne.productId, ligne.homeId);
            if (stockDisponible < ligne.quantite) {
                toast({
                    title: "Stock insuffisant",
                    description: `Stock insuffisant pour ${ligne.product?.designation} dans ${ligne.home?.nom}. Disponible: ${stockDisponible}, Demandé: ${ligne.quantite}`,
                    variant: "destructive",
                });
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const { totalHT, totalTTC } = calculateTotals();

            const payload = {
                ...formData,
                clientId: formData.clientId || null,
                chantierId: formData.chantierId || null,
                dateDebut: formData.dateDebut ? new Date(formData.dateDebut) : new Date(),
                dateFin: formData.dateFin ? new Date(formData.dateFin) : new Date(),
                lignes: lignes.map((l) => ({
                    productId: l.productId,
                    homeId: l.homeId,
                    quantite: l.quantite,
                    prixUnitaireHT: l.prixUnitaireHT,
                    prixUnitaireTTC: l.prixUnitaireTTC,
                    remise: l.remise,
                })),
                totalHT,
                totalTTC,
                statut: "VALIDE", // Le bon de sortie est directement validé
            };

            const response = await fetch("/api/bons-sortie", {
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
                description: "Bon de sortie créé avec succès. Le stock a été mis à jour.",
            });
            router.push("/bons-sortie");
        } catch (error) {
            console.error("Error creating bon-sortie:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de créer le bon de sortie",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Nouveau Bon de Sortie" subtitle="Chargement..." />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="p-8">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span>Chargement des données...</span>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
        );
    }

    const { totalHT, totalTTC } = calculateTotals();

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="Nouveau Bon de Sortie" subtitle="Créer un bon de sortie" />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Link href="/bons-sortie">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour à la liste
                            </Button>
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Informations générales */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Informations du bon de sortie</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="destination">Destination *</Label>
                                        <Input
                                            id="destination"
                                            placeholder="Ex: Chantier El Hana"
                                            value={formData.destination}
                                            onChange={(e) =>
                                                setFormData({ ...formData, destination: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="destinataire">Destinataire</Label>
                                        <Input
                                            id="destinataire"
                                            placeholder="Nom du destinataire"
                                            value={formData.destinataire}
                                            onChange={(e) =>
                                                setFormData({ ...formData, destinataire: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="clientId">Client</Label>
                                        <Select
                                            value={formData.clientId || "none"}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, clientId: value === "none" ? "" : value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un client" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun client</SelectItem>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id}>
                                                        {client.nom} {client.prenom || ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Chantier */}
                                    <div className="space-y-2">
                                        <Label htmlFor="chantierId" className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-primary" />
                                            Chantier
                                        </Label>
                                        <Select
                                            value={formData.chantierId || "none"}
                                            onValueChange={(value) => {
                                                const val = value === "none" ? "" : value;
                                                setFormData({ ...formData, chantierId: val });
                                                setSelectedChantier(val);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un chantier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun chantier</SelectItem>
                                                {chantiers.map((chantier) => (
                                                    <SelectItem key={chantier.id} value={chantier.id}>
                                                        {chantier.nom} {chantier.reference ? `(${chantier.reference})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Sélectionnez un chantier pour suivre les consommations
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="motif">Motif</Label>
                                        <Select
                                            value={formData.motif}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, motif: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un motif" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VENTE">Vente</SelectItem>
                                                <SelectItem value="TRANSFERT">Transfert</SelectItem>
                                                <SelectItem value="DON">Don</SelectItem>
                                                <SelectItem value="ECHANTILLON">Échantillon</SelectItem>
                                                <SelectItem value="PERTE">Perte</SelectItem>
                                                <SelectItem value="INVENTAIRE">Inventaire</SelectItem>
                                                <SelectItem value="AUTRE">Autre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nomConducteur">Nom du conducteur</Label>
                                        <Input
                                            id="nomConducteur"
                                            placeholder="Nom du conducteur"
                                            value={formData.nomConducteur}
                                            onChange={(e) =>
                                                setFormData({ ...formData, nomConducteur: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="matriculeVehicule">Matricule du véhicule</Label>
                                        <Input
                                            id="matriculeVehicule"
                                            placeholder="1234-TN"
                                            value={formData.matriculeVehicule}
                                            onChange={(e) =>
                                                setFormData({ ...formData, matriculeVehicule: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="numCIN">Numéro CIN</Label>
                                        <Input
                                            id="numCIN"
                                            placeholder="12345678"
                                            value={formData.numCIN}
                                            onChange={(e) =>
                                                setFormData({ ...formData, numCIN: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dateDebut">Date de début</Label>
                                        <Input
                                            id="dateDebut"
                                            type="date"
                                            value={formData.dateDebut}
                                            onChange={(e) =>
                                                setFormData({ ...formData, dateDebut: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dateFin">Date de fin</Label>
                                        <Input
                                            id="dateFin"
                                            type="date"
                                            value={formData.dateFin}
                                            onChange={(e) =>
                                                setFormData({ ...formData, dateFin: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="adresseLivraison">Adresse de livraison</Label>
                                        <Input
                                            id="adresseLivraison"
                                            placeholder="Adresse de livraison"
                                            value={formData.adresseLivraison}
                                            onChange={(e) =>
                                                setFormData({ ...formData, adresseLivraison: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="observation">Observation</Label>
                                        <Textarea
                                            id="observation"
                                            placeholder="Observations..."
                                            value={formData.observation}
                                            onChange={(e) =>
                                                setFormData({ ...formData, observation: e.target.value })
                                            }
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lignes du bon de sortie - Style comme BL */}
                        <Card className="mb-6">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Produits à sortir</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                                    <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Ligne d'ajout */}
                                    <div className="grid gap-3 grid-cols-1 md:grid-cols-5 items-end">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Désignation</Label>
                                            {isMounted && (
                                                <Select2<OptionType>
                                                    options={designationOptions()}
                                                    value={selectedProduct ? { value: selectedProduct.id, label: selectedProduct.designation } : null}
                                                    onChange={(selected: any) => {
                                                        const product = products.find(p => p.id === selected?.value);
                                                        setSelectedProduct(product || null);
                                                        if (product) {
                                                            setPrixUnitaireTTC(product.prixVente);
                                                            // Si chauffeur, forcer le homeId
                                                            if (userRole === 'CHAUFFEUR' && defaultHomeId) {
                                                                setSelectedHome(defaultHomeId);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Désignation"
                                                    isSearchable
                                                    isClearable
                                                    className="text-sm"
                                                    classNamePrefix="select"
                                                    menuPortalTarget={document.body}
                                                    styles={selectStyles}
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Référence</Label>
                                            {isMounted && (
                                                <Select2<OptionType>
                                                    options={referenceOptions()}
                                                    value={selectedProduct ? { value: selectedProduct.id, label: selectedProduct.reference } : null}
                                                    onChange={(selected: any) => {
                                                        const product = products.find(p => p.id === selected?.value);
                                                        setSelectedProduct(product || null);
                                                        if (product) {
                                                            setPrixUnitaireTTC(product.prixVente);
                                                            if (userRole === 'CHAUFFEUR' && defaultHomeId) {
                                                                setSelectedHome(defaultHomeId);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Référence"
                                                    isSearchable
                                                    isClearable
                                                    className="text-sm"
                                                    classNamePrefix="select"
                                                    menuPortalTarget={document.body}
                                                    styles={selectStyles}
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Code</Label>
                                            {isMounted && (
                                                <Select2<OptionType>
                                                    options={codeOptions()}
                                                    value={selectedProduct ? { value: selectedProduct.id, label: selectedProduct.code || selectedProduct.reference } : null}
                                                    onChange={(selected: any) => {
                                                        const product = products.find(p => p.id === selected?.value);
                                                        setSelectedProduct(product || null);
                                                        if (product) {
                                                            setPrixUnitaireTTC(product.prixVente);
                                                            if (userRole === 'CHAUFFEUR' && defaultHomeId) {
                                                                setSelectedHome(defaultHomeId);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Code"
                                                    isSearchable
                                                    isClearable
                                                    className="text-sm"
                                                    classNamePrefix="select"
                                                    menuPortalTarget={document.body}
                                                    styles={selectStyles}
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Emplacement</Label>
                                            {isMounted && (
                                                <Select2<OptionType>
                                                    options={getHomeOptions(selectedProduct?.id)}
                                                    value={getHomeOptions(selectedProduct?.id).find(o => o.value === selectedHome) || null}
                                                    onChange={(selected: any) => setSelectedHome(selected?.value || "")}
                                                    placeholder={selectedProduct ? "Emplacement" : "Choisir produit d'abord"}
                                                    isSearchable
                                                    isClearable
                                                    isDisabled={!selectedProduct || (userRole === 'CHAUFFEUR' && !!defaultHomeId)}
                                                    className="text-sm"
                                                    classNamePrefix="select"
                                                    menuPortalTarget={document.body}
                                                    styles={selectStyles}
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Quantité</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={quantite}
                                                    onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
                                                    className="flex-1"
                                                />
                                                <Button type="button" size="sm" onClick={addLigne}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tableau des lignes */}
                                    {lignes.length > 0 && (
                                        <div className="mt-4 border rounded-lg overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Désignation</TableHead>
                                                        <TableHead>Référence</TableHead>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Emplacement</TableHead>
                                                        <TableHead>Quantité</TableHead>
                                                        <TableHead>TVA</TableHead>
                                                        <TableHead>Prix HT</TableHead>
                                                        <TableHead>Prix TTC</TableHead>
                                                        <TableHead>Total TTC</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {lignes.map((ligne) => (
                                                        <TableRow key={ligne.id}>
                                                            <TableCell className="font-medium">
                                                                {ligne.product?.designation}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {ligne.product?.reference}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {ligne.product?.code || "-"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {ligne.home?.nom}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={ligne.quantite}
                                                                    onChange={(e) => updateLigneQuantite(ligne.id, parseInt(e.target.value) || 1)}
                                                                    className="w-20"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {ligne.product?.tva || 19}%
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {formatCurrency(ligne.prixUnitaireHT)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {formatCurrency(ligne.prixUnitaireTTC)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                {formatCurrency(ligne.totalTTC)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600"
                                                                    onClick={() => removeLigne(ligne.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="font-bold bg-muted/50">
                                                        <TableCell colSpan={8} className="text-right">
                                                            Totaux
                                                        </TableCell>
                                                        <TableCell className="text-right text-primary">
                                                            {formatCurrency(totalTTC)}
                                                        </TableCell>
                                                        <TableCell />
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/bons-sortie")}
                            >
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
                                        Créer le bon de sortie
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