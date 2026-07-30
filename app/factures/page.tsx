// app/factures/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Eye, Edit, Trash2, MoreHorizontal, Search, Filter, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/types";

interface Facture {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client: {
    id: string;
    nom: string;
    prenom?: string;
  };
  chantierId?: string;
  chantier?: {
    id: string;
    nom: string;
    reference?: string;
  };
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
  statut: string;
  type: string;
}

export default function FacturesPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("TOUS");
  const [chantierFilter, setChantierFilter] = useState<string>("TOUS");
  const [chantiers, setChantiers] = useState<Array<{ id: string; nom: string }>>([]);

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statutFilter !== "TOUS") params.append("statut", statutFilter);
      if (chantierFilter !== "TOUS") params.append("chantierId", chantierFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/factures?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFactures(data.data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChantiers = async () => {
    try {
      const response = await fetch("/api/chantiers?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setChantiers(data.data || []);
    } catch (error) {
      console.error("Error fetching chantiers:", error);
    }
  };

  useEffect(() => {
    fetchFactures();
    fetchChantiers();
  }, [statutFilter, chantierFilter]);

  const filteredFactures = factures.filter(f => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      f.numero.toLowerCase().includes(searchLower) ||
      f.client.nom.toLowerCase().includes(searchLower) ||
      f.chantier?.nom.toLowerCase().includes(searchLower)
    );
  });

  const getStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      PAYEE: "bg-green-100 text-green-800",
      IMPAYEE: "bg-red-100 text-red-800",
      PARTIELLE: "bg-yellow-100 text-yellow-800",
    };
    const labels: Record<string, string> = {
      PAYEE: "Payée",
      IMPAYEE: "Impayée",
      PARTIELLE: "Partielle",
    };
    return (
      <Badge className={colors[statut] || "bg-gray-100"}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Factures" subtitle="Gestion des factures" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Chargement des factures...</span>
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
        <Header title="Factures" subtitle="Gestion des factures" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle>Liste des Factures</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {filteredFactures.length}
                  </Badge>
                </div>
                <Link href="/factures/nouveau">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle facture
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
                      placeholder="Rechercher..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statutFilter} onValueChange={setStatutFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOUS">Tous</SelectItem>
                      <SelectItem value="PAYEE">Payée</SelectItem>
                      <SelectItem value="IMPAYEE">Impayée</SelectItem>
                      <SelectItem value="PARTIELLE">Partielle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={chantierFilter} onValueChange={setChantierFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Chantier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOUS">Tous les chantiers</SelectItem>
                      {chantiers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatutFilter("TOUS");
                    setChantierFilter("TOUS");
                  }}
                >
                  Réinitialiser
                </Button>
              </div>

              {/* Tableau */}
              {filteredFactures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune facture trouvée
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Chantier</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead className="text-right">Total TTC</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFactures.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.numero}</TableCell>
                          <TableCell>{formatDate(new Date(f.date))}</TableCell>
                          <TableCell>{f.client.nom}</TableCell>
                          <TableCell>
                            {f.chantier ? (
                              <Link
                                href={`/chantiers/${f.chantier.id}`}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <Building2 className="h-3 w-3" />
                                {f.chantier.nom}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(f.totalHT)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(f.totalTTC)}
                          </TableCell>
                          <TableCell>{getStatutBadge(f.statut)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/factures/${f.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir
                                  </Link>
                                </DropdownMenuItem>
                                {f.statut === "IMPAYEE" && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/factures/${f.id}/modifier`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modifier
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}