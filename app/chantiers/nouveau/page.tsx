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
import { Loader2, Save, ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { StatutChantier } from "@/lib/types";

interface Client {
    id: string;
    nom: string;
    prenom?: string;
    telephone: string;
}

export default function NouveauChantierPage() {
    const { sidebarClasses } = useSidebar();
    const router = useRouter();
    const { toast } = useToast();

    const [clients, setClients] = useState<Client[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingClients, setLoadingClients] = useState(true);

    const [formData, setFormData] = useState({
        nom: "",
        reference: "",
        clientId: "",
        adresse: "",
        description: "",
        dateDebut: "",
        dateFin: "",
        statut: StatutChantier.EN_COURS,
        budgetPrevu: 0,
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoadingClients(true);
        try {
            const response = await fetch("/api/clients?limit=500");
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const data = await response.json();
            setClients(data.data || []);
        } catch (error) {
            console.error("Error fetching clients:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les clients",
                variant: "destructive",
            });
        } finally {
            setLoadingClients(false);
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nom) {
            toast({
                title: "Erreur",
                description: "Le nom du chantier est obligatoire",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/chantiers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    dateDebut: formData.dateDebut ? new Date(formData.dateDebut) : null,
                    dateFin: formData.dateFin ? new Date(formData.dateFin) : null,
                    budgetPrevu: parseFloat(formData.budgetPrevu.toString()) || 0,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erreur lors de la création");
            }

            toast({
                title: "Succès",
                description: "Chantier créé avec succès",
            });
            router.push("/chantiers");
        } catch (error) {
            console.error("Error creating chantier:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de créer le chantier",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="Nouveau Chantier" subtitle="Créer un nouveau chantier" />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Link href="/chantiers">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour à la liste
                            </Button>
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Informations du chantier
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Nom */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nom">Nom du chantier *</Label>
                                        <Input
                                            id="nom"
                                            name="nom"
                                            placeholder="Ex: Résidence El Hana"
                                            value={formData.nom}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    {/* Référence */}
                                    <div className="space-y-2">
                                        <Label htmlFor="reference">
                                            Référence
                                            <span className="text-muted-foreground ml-1 text-xs">
                                                (laissez vide pour auto-génération)
                                            </span>
                                        </Label>
                                        <Input
                                            id="reference"
                                            name="reference"
                                            placeholder="Ex: CH-2026-0001"
                                            value={formData.reference}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Client */}
                                    <div className="space-y-2">
                                        <Label htmlFor="clientId">Client</Label>
                                        <Select
                                            value={formData.clientId}
                                            onValueChange={(value) => handleSelectChange("clientId", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un client" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun client</SelectItem>

                                                {loadingClients ? (
                                                    <SelectItem value="loading" disabled>
                                                        Chargement...
                                                    </SelectItem>
                                                ) : (
                                                    clients.map((client) => (
                                                        <SelectItem key={client.id} value={client.id}>
                                                            {client.nom} {client.prenom || ""} - {client.telephone}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Statut */}
                                    <div className="space-y-2">
                                        <Label htmlFor="statut">Statut</Label>
                                        <Select
                                            value={formData.statut}
                                            onValueChange={(value) => handleSelectChange("statut", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un statut" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={StatutChantier.EN_COURS}>En cours</SelectItem>
                                                <SelectItem value={StatutChantier.EN_ATTENTE}>En attente</SelectItem>
                                                <SelectItem value={StatutChantier.TERMINE}>Terminé</SelectItem>
                                                <SelectItem value={StatutChantier.ANNULE}>Annulé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Adresse */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="adresse">Adresse</Label>
                                        <Input
                                            id="adresse"
                                            name="adresse"
                                            placeholder="Ex: Rue Habib Bourguiba, Sfax"
                                            value={formData.adresse}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            name="description"
                                            placeholder="Description du chantier..."
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows={3}
                                        />
                                    </div>

                                    {/* Date de début */}
                                    <div className="space-y-2">
                                        <Label htmlFor="dateDebut">Date de début</Label>
                                        <Input
                                            id="dateDebut"
                                            name="dateDebut"
                                            type="date"
                                            value={formData.dateDebut}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Date de fin */}
                                    <div className="space-y-2">
                                        <Label htmlFor="dateFin">Date de fin prévue</Label>
                                        <Input
                                            id="dateFin"
                                            name="dateFin"
                                            type="date"
                                            value={formData.dateFin}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Budget prévu */}
                                    <div className="space-y-2">
                                        <Label htmlFor="budgetPrevu">Budget prévu (TND)</Label>
                                        <Input
                                            id="budgetPrevu"
                                            name="budgetPrevu"
                                            type="number"
                                            step="0.001"
                                            placeholder="0.000"
                                            value={formData.budgetPrevu || ""}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/chantiers")}
                            >
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
                                        Créer le chantier
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