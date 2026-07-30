"use client";

import { Sidebar } from "@/components/layout/sidebartest";
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
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Plus,
    Loader2,
    Search,
    Filter,
    Building2,
    Calendar,
    MapPin,
    User,
    FileText,
    Package,
    TrendingUp,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency, StatutChantier, statutChantierLabels, statutChantierColors } from "@/lib/types";

interface Chantier {
    id: string;
    nom: string;
    reference?: string;
    clientId?: string;
    client?: {
        id: string;
        nom: string;
        prenom?: string;
        telephone: string;
    };
    adresse?: string;
    description?: string;
    dateDebut?: Date;
    dateFin?: Date;
    statut: StatutChantier;
    budgetPrevu?: number;
    coutActuel: number;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        bonSorties: number;
        devis: number;
        factures: number;
    };
}

export default function ChantiersPage() {
    const { sidebarClasses } = useSidebar();
    const { toast } = useToast();

    const [chantiers, setChantiers] = useState<Chantier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statutFilter, setStatutFilter] = useState<string>("TOUS");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [chantierToDelete, setChantierToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchChantiers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statutFilter !== "TOUS") params.append("statut", statutFilter);
            if (search) params.append("search", search);
            params.append("limit", "100");

            const response = await fetch(`/api/chantiers?${params.toString()}`);
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const data = await response.json();
            setChantiers(data.data || []);
        } catch (error) {
            console.error("Error fetching chantiers:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les chantiers",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChantiers();
    }, [statutFilter]);

    const filteredChantiers = useMemo(() => {
        if (!search) return chantiers;
        const searchLower = search.toLowerCase();
        return chantiers.filter(
            (c) =>
                c.nom.toLowerCase().includes(searchLower) ||
                c.reference?.toLowerCase().includes(searchLower) ||
                c.client?.nom.toLowerCase().includes(searchLower) ||
                c.adresse?.toLowerCase().includes(searchLower)
        );
    }, [chantiers, search]);

    const handleDelete = async () => {
        if (!chantierToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/chantiers/${chantierToDelete}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erreur lors de la suppression");
            }

            toast({
                title: "Succès",
                description: "Chantier supprimé avec succès",
            });
            setChantiers((prev) => prev.filter((c) => c.id !== chantierToDelete));
            setDeleteDialogOpen(false);
            setChantierToDelete(null);
        } catch (error) {
            console.error("Error deleting chantier:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de supprimer le chantier",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatutBadge = (statut: StatutChantier) => {
        const colors = {
            [StatutChantier.EN_COURS]: "bg-blue-100 text-blue-800 border-blue-200",
            [StatutChantier.TERMINE]: "bg-green-100 text-green-800 border-green-200",
            [StatutChantier.ANNULE]: "bg-red-100 text-red-800 border-red-200",
            [StatutChantier.EN_ATTENTE]: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
        return colors[statut] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Chantiers" subtitle="Gestion des chantiers" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="p-8">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span>Chargement des chantiers...</span>
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
                <Header title="Chantiers" subtitle="Gestion des chantiers de construction" />
                <main className="p-4 md:p-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <CardTitle>Liste des Chantiers</CardTitle>
                                    <Badge variant="secondary" className="ml-2">
                                        {filteredChantiers.length}
                                    </Badge>
                                </div>
                                <Link href="/chantiers/nouveau">
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Nouveau chantier
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Filtres */}
                            <div className="mb-6 flex flex-wrap gap-4 items-center">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Rechercher un chantier..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Select value={statutFilter} onValueChange={setStatutFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Tous les statuts" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TOUS">Tous les statuts</SelectItem>
                                            <SelectItem value={StatutChantier.EN_COURS}>En cours</SelectItem>
                                            <SelectItem value={StatutChantier.EN_ATTENTE}>En attente</SelectItem>
                                            <SelectItem value={StatutChantier.TERMINE}>Terminé</SelectItem>
                                            <SelectItem value={StatutChantier.ANNULE}>Annulé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setStatutFilter("TOUS");
                                    }}
                                >
                                    Réinitialiser
                                </Button>
                            </div>

                            {/* Liste des chantiers */}
                            {filteredChantiers.length === 0 ? (
                                <div className="text-center py-12">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Aucun chantier trouvé</p>
                                    <Link href="/chantiers/nouveau">
                                        <Button variant="outline" className="mt-4">
                                            Créer un chantier
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredChantiers.map((chantier) => (
                                        <Card key={chantier.id} className="hover:shadow-lg transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-lg truncate">
                                                            {chantier.nom}
                                                        </h3>
                                                        {chantier.reference && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {chantier.reference}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge className={getStatutBadge(chantier.statut)}>
                                                        {statutChantierLabels[chantier.statut]}
                                                    </Badge>
                                                </div>

                                                {chantier.client && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>{chantier.client.nom} {chantier.client.prenom}</span>
                                                    </div>
                                                )}

                                                {chantier.adresse && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        <span className="truncate">{chantier.adresse}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-sm mt-2">
                                                    {chantier.dateDebut && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>Début: {formatDate(chantier.dateDebut)}</span>
                                                        </div>
                                                    )}
                                                    {chantier.dateFin && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>Fin: {formatDate(chantier.dateFin)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Bon sorties</p>
                                                        <p className="font-semibold">{chantier._count.bonSorties}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Devis</p>
                                                        <p className="font-semibold">{chantier._count.devis}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Factures</p>
                                                        <p className="font-semibold">{chantier._count.factures}</p>
                                                    </div>
                                                </div>

                                                {/* Budget */}
                                                <div className="mt-3 pt-3 border-t">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Budget:</span>
                                                        <span className="font-medium">{formatCurrency(chantier.budgetPrevu || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Coût actuel:</span>
                                                        <span className="font-medium text-primary">{formatCurrency(chantier.coutActuel)}</span>
                                                    </div>
                                                    {chantier.budgetPrevu && chantier.budgetPrevu > 0 && (
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                            <div
                                                                className={cn(
                                                                    "h-1.5 rounded-full",
                                                                    chantier.coutActuel / chantier.budgetPrevu > 0.9
                                                                        ? "bg-red-500"
                                                                        : chantier.coutActuel / chantier.budgetPrevu > 0.7
                                                                            ? "bg-yellow-500"
                                                                            : "bg-green-500"
                                                                )}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        (chantier.coutActuel / chantier.budgetPrevu) * 100,
                                                                        100
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                                                    <Link href={`/chantiers/${chantier.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/chantiers/${chantier.id}/modifier`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            setChantierToDelete(chantier.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>

            {/* Dialog de confirmation de suppression */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Êtes-vous sûr de vouloir supprimer ce chantier ?</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Cette action est irréversible et supprimera toutes les données associées.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Suppression...
                                </>
                            ) : (
                                "Supprimer"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}