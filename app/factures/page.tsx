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
import { Loader2, Plus, Eye, Edit, Trash2, MoreHorizontal, Search, Filter, Building2, Printer, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency, Client, Product } from "@/lib/types";
import { FacturePrintData, PrintFormat } from "@/types/print";
import { generateFacturePrintHTML, openPrintWindow } from "@/lib/print-utils-jsx";
import router from "next/router";
interface LigneFacture {
  id?: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  remiseLigne?: number;
  tva: number;
  isNewProduct?: boolean;
  newProduct?: {
    reference: string;
    designation: string;
    categoryId: string;
    prixAchat: number;
    prixVente: number;
    tva: number;
    seuilAlerte: number;
  };
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise: number | null;
  statut: string;
  type: string;
  lignes: LigneFacture[];
  createdAt: string;
  updatedAt: string;
}

export default function FacturesPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("TOUS");

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statutFilter !== "TOUS") params.append("statut", statutFilter);
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

  useEffect(() => {
    fetchFactures();
  }, [statutFilter]);

  const filteredFactures = factures.filter(f => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      f.numero.toLowerCase().includes(searchLower) ||
      f.client?.nom.toLowerCase().includes(searchLower)
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

  const handleDeleteFacture = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) return;

    try {
      const response = await fetch(`/api/factures/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({
        title: "Succès",
        description: "Facture supprimée avec succès",
      });

      // Rafraîchir la page
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la facture",
        variant: "destructive",
      });
    }
  };

  const handlePrintFacture = (facture: Facture, format: PrintFormat = "A4") => {
    const clientAddress = facture.client?.addresses?.find(addr => addr.estPrincipale) || facture.client?.addresses?.[0];

    // ✅ Déterminer si on utilise la remise globale
    const hasIndividualRemises = facture.lignes.some(l => (l.remiseLigne || 0) > 0);
    const useGlobalRemise = !hasIndividualRemises && (facture.remise || 0) > 0;

    // ✅ Calculer les totaux par ligne avec remises en DT
    const lignesWithDetails = facture.lignes.map(ligne => {
      const quantite = ligne.quantite || 0;
      const prixUnitaireBrut = ligne.prixUnitaire || 0;

      // ✅ La remise est en DT (pas en pourcentage)
      const remiseLigneDT = useGlobalRemise ? 0 : (ligne.remiseLigne || 0);

      // ✅ Montant HT brut (sans remise)
      const totalHTBrut = quantite * prixUnitaireBrut;

      // ✅ Montant de la remise en DT
      const montantRemise = remiseLigneDT;

      // ✅ Montant HT après remise
      const totalHTApresRemise = Math.max(0, totalHTBrut - montantRemise);

      // ✅ Calcul de la TVA sur le HT après remise
      const tva = ligne.tva;
      const totalTVA = totalHTApresRemise * (tva / 100);
      const totalTTC = totalHTApresRemise + totalTVA;

      // ✅ Prix unitaire après remise (pour l'affichage)
      const prixUnitaireApresRemise = quantite > 0 ? totalHTApresRemise / quantite : 0;

      // ✅ Récupérer les informations du produit
      const product = ligne.product || {
        reference: '',
        designation: '',
        prixVente: 0,
        tva: 0,
      };

      return {
        product: {
          reference: product.reference || '',
          designation: product.designation || 'Service sans désignation', // ← Valeur par défaut
          prixUnitaire: product.prixVente || 0,
          tva: product.tva,
        },
        quantite: quantite,
        prixUnitaire: prixUnitaireApresRemise,
        prixUnitaireBrut: prixUnitaireBrut,
        remiseLigne: remiseLigneDT,
        montantRemise: montantRemise,
        tva: tva,
        totalHT: totalHTApresRemise,
        totalHTBrut: totalHTBrut,
        totalTVA: totalTVA,
        totalTTC: totalTTC,
      };
    });

    // ✅ Calculer les totaux
    const totalHTBrut = lignesWithDetails.reduce((sum, l) => sum + (l.totalHTBrut || 0), 0);
    const totalRemiseLignes = lignesWithDetails.reduce((sum, l) => sum + (l.montantRemise || 0), 0);
    const totalHT = lignesWithDetails.reduce((sum, l) => sum + l.totalHT, 0);
    const totalTVA = lignesWithDetails.reduce((sum, l) => sum + (l.totalTVA || 0), 0);
    const totalTTC = lignesWithDetails.reduce((sum, l) => sum + (l.totalTTC || 0), 0);

    // ✅ Si on utilise la remise globale, appliquer la remise en DT
    let totalRemiseFinale = totalRemiseLignes;
    let totalHTFinal = totalHT;
    let totalTVAFinal = totalTVA;
    let totalTTCFinal = totalTTC;

    if (useGlobalRemise && facture.remise && facture.remise > 0) {
      totalRemiseFinale = facture.remise;
      totalHTFinal = Math.max(0, totalHT - totalRemiseFinale);

      if (totalHT > 0) {
        const ratioTVA = totalTVA / totalHT;
        totalTVAFinal = totalHTFinal * ratioTVA;
      } else {
        totalTVAFinal = 0;
      }
      totalTTCFinal = totalHTFinal + totalTVAFinal;
    }

    const printData: FacturePrintData = {
      id: facture.id,
      numero: facture.numero,
      date: facture.date,
      client: facture.client ? {
        nom: facture.client.nom,
        adresse: clientAddress?.adresse,
        addresses: clientAddress ? [clientAddress] : [],
        telephone: facture.client.telephone,
        email: facture.client.email || undefined,
        matriculeFiscale: facture.client.mf || undefined,
      } : undefined,
      totalHT: totalHTFinal,
      totalTVA: totalTVAFinal,
      totalTTC: facture.totalTTC || totalTTCFinal,
      remise: facture.remise || 0,
      totalHTBrut: totalHTBrut,
      totalRemise: totalRemiseFinale,
      useGlobalRemise: useGlobalRemise,
      remiseGlobaleDT: useGlobalRemise ? facture.remise || 0 : 0,
      lignes: lignesWithDetails,
    };

    // Générer le HTML et ouvrir la fenêtre d'impression
    const htmlContent = generateFacturePrintHTML(printData, format);

    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>Impression Facture - ${facture.numero}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: #fff;
          }
          .print-copy {
            page-break-after: always;
            margin: 0;
            padding: 20px;
          }
          .copy-label {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: -10px;
            margin-bottom: 20px;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${htmlContent}
        </div>
      </body>
    </html>`);

      printWindow.document.close();
      printWindow.focus();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) printWindow.close();
          }, 500);
        }
      }, 1000);
    } else {
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups pour ce site.');
    }
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
                        <TableHead className="text-right">Total TTC</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFactures.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.numero}</TableCell>
                          <TableCell>{formatDate(new Date(f.date))}</TableCell>
                          <TableCell>{f.client?.nom}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(f.totalTTC + 1)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Bouton Voir */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                asChild
                              >
                                <Link href={`/factures/view/${f.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              {/* Bouton Imprimer */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handlePrintFacture(f, "A4")}
                                title="Imprimer facture"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>

                              {/* Bouton Modifier */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                asChild
                              >
                                <Link href={`/factures/edit/${f.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>

                              {/* Bouton Supprimer (optionnel) */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteFacture(f.id)}
                                title="Supprimer la facture"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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