"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Loader2, ArrowLeft, Package, Calendar, Search, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/types";

interface Consommation {
    id: string;
    chantierId: string;
    productId: string;
    product: {
        id: string;
        designation: string;
        reference: string;
        unite?: {
            nom: string;
            symbole?: string;
        };
    };
    quantite: number;
    date: string;
    bonSortieId?: string;
    bonSortie?: {
        id: string;
        numero: string;
        date: string;
    };
}

interface ResumeItem {
    productId: string;
    product: Consommation["product"];
    totalQuantite: number;
    totalCout: number;
    derniereUtilisation: string;
}

export default function ConsommationChantierPage() {
    const { sidebarClasses } = useSidebar();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const chantierId = params.id as string;

    const [consommations, setConsommations] = useState<Consommation[]>([]);
    const [loading, setLoading] = useState(true);
    const [chantierNom, setChantierNom] = useState("");
    const [search, setSearch] = useState("");
    const [dateDebut, setDateDebut] = useState("");
    const [dateFin, setDateFin] = useState("");

    const fetchConsommations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("chantierId", chantierId);
            if (dateDebut) params.append("dateDebut", dateDebut);
            if (dateFin) params.append("dateFin", dateFin);

            const response = await fetch(`/api/chantiers/consommation?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const data = await response.json();

            setConsommations(data.consommations || []);

            // Récupérer le nom du chantier depuis la première consommation
            if (data.consommations && data.consommations.length > 0) {
                // On pourrait récupérer via une autre API
            }
        } catch (error) {
            console.error("Error fetching consommations:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les consommations",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsommations();
        fetchChantierInfo();
    }, [chantierId, dateDebut, dateFin]);

    const fetchChantierInfo = async () => {
        try {
            const response = await fetch(`/api/chantiers/${chantierId}`);
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const data = await response.json();
            setChantierNom(data.nom || "Chantier");
        } catch (error) {
            console.error("Error fetching chantier:", error);
        }
    };

    const filteredConsommations = useMemo(() => {
        if (!search) return consommations;
        const searchLower = search.toLowerCase();
        return consommations.filter(
            (c) =>
                c.product.designation.toLowerCase().includes(searchLower) ||
                c.product.reference.toLowerCase().includes(searchLower)
        );
    }, [consommations, search]);

    // Résumé par produit
    const resume = useMemo(() => {
        const map = new Map<string, ResumeItem>();
        filteredConsommations.forEach((c) => {
            const key = c.productId;
            if (!map.has(key)) {
                map.set(key, {
                    productId: c.productId,
                    product: c.product,
                    totalQuantite: 0,
                    totalCout: 0,
                    derniereUtilisation: c.date,
                });
            }
            const item = map.get(key)!;
            item.totalQuantite += c.quantite;
            item.totalCout += c.quantite * (c.product?.prixVente || 0);
            if (new Date(c.date) > new Date(item.derniereUtilisation)) {
                item.derniereUtilisation = c.date;
            }
        });
        return Array.from(map.values()).sort((a, b) => b.totalQuantite - a.totalQuantite);
    }, [filteredConsommations]);

    const totalQuantite = filteredConsommations.reduce((sum, c) => sum + c.quantite, 0);
    const totalCout = filteredConsommations.reduce(
        (sum, c) => sum + c.quantite * (c.product?.prixVente || 0),
        0
    );

    const exportCSV = () => {
        if (filteredConsommations.length === 0) {
            toast({
                title: "Information",
                description: "Aucune donnée à exporter",
                variant: "default",
            });
            return;
        }

        const headers = ["Date", "Produit", "Référence", "Quantité", "Unité", "Bon de sortie"];
        const rows = filteredConsommations.map((c) => [
            formatDate(new Date(c.date)),
            c.product.designation,
            c.product.reference,
            c.quantite,
            c.product.unite?.symbole || c.product.unite?.nom || "pc",
            c.bonSortie?.numero || "-",
        ]);

        const csvContent = [
            headers.join(";"),
            ...rows.map((row) => row.join(";")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `consommations_${chantierNom}_${formatDate(new Date())}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Consommations" subtitle="Chargement..." />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="p-8">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span>Chargement des consommations...</span>
                                </div>
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
                <Header title="Consommations" subtitle={`Chantier: ${chantierNom}`} />
                <main className="p-4 md:p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <Link href={`/chantiers/${chantierId}`}>
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour au chantier
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={exportCSV} className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Exporter CSV
                            </Button>
                        </div>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Total consommations</p>
                                <p className="text-2xl font-bold">{filteredConsommations.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Quantité totale</p>
                                <p className="text-2xl font-bold">{totalQuantite}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Produits distincts</p>
                                <p className="text-2xl font-bold">{resume.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Coût total</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalCout)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filtres */}
                    <Card className="mb-6">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Rechercher un produit..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={dateDebut}
                                        onChange={(e) => setDateDebut(e.target.value)}
                                        className="w-[150px]"
                                        placeholder="Date début"
                                    />
                                    <span className="text-muted-foreground">à</span>
                                    <Input
                                        type="date"
                                        value={dateFin}
                                        onChange={(e) => setDateFin(e.target.value)}
                                        className="w-[150px]"
                                        placeholder="Date fin"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setDateDebut("");
                                        setDateFin("");
                                    }}
                                >
                                    Réinitialiser
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tableau des consommations */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Détail des consommations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredConsommations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Aucune consommation trouvée pour ce chantier
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Produit</TableHead>
                                                <TableHead>Référence</TableHead>
                                                <TableHead className="text-right">Quantité</TableHead>
                                                <TableHead>Unité</TableHead>
                                                <TableHead>Bon de sortie</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredConsommations.map((c) => (
                                                <TableRow key={c.id}>
                                                    <TableCell>{formatDate(new Date(c.date))}</TableCell>
                                                    <TableCell className="font-medium">
                                                        {c.product.designation}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {c.product.reference}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {c.quantite}
                                                    </TableCell>
                                                    <TableCell>
                                                        {c.product.unite?.symbole || c.product.unite?.nom || "pc"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {c.bonSortie ? (
                                                            <Link
                                                                href={`/bons-sortie/${c.bonSortie.id}`}
                                                                className="text-primary hover:underline"
                                                            >
                                                                {c.bonSortie.numero}
                                                            </Link>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Résumé par produit */}
                    {resume.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Résumé par produit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produit</TableHead>
                                                <TableHead>Référence</TableHead>
                                                <TableHead className="text-right">Quantité totale</TableHead>
                                                <TableHead className="text-right">Coût total</TableHead>
                                                <TableHead>Dernière utilisation</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {resume.map((item) => (
                                                <TableRow key={item.productId}>
                                                    <TableCell className="font-medium">
                                                        {item.product.designation}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {item.product.reference}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {item.totalQuantite}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(item.totalCout)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(new Date(item.derniereUtilisation))}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}