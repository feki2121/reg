// ============= ENUMS =============
export enum TypeArticle {
  STOCK = "STOCK",
  SERVICE = "SERVICE",
}

export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  CAISSIER = "CAISSIER",
}

export enum TypeMouvementStock {
  ENTREE = "ENTREE",
  SORTIE = "SORTIE",
  AJUSTEMENT = "AJUSTEMENT",
}

export enum StatutDevis {
  EN_ATTENTE = "EN_ATTENTE",
  ACCEPTE = "ACCEPTE",
  REFUSE = "REFUSE",
  TRANSFORME_EN_FACTURE = "TRANSFORME_EN_FACTURE",
}

export enum StatutBL {
  EN_ATTENTE = "EN_ATTENTE",
  LIVRE = "LIVRE",
  ANNULE = "ANNULE",
}

export enum StatutFacture {
  PAYEE = "PAYEE",
  IMPAYEE = "IMPAYEE",
  PARTIELLE = "PARTIELLE",
}

export enum TypeFacture {
  DEVIS = "DEVIS",
  DIRECTE = "DIRECTE",
}

export enum TypeReglement {
  ESPECE = "ESPECE",
  CHEQUE = "CHEQUE",
  TRAITE_DOMICILE = "TRAITE_DOMICILE",
  TRAITE_BANCAIRE = "TRAITE_BANCAIRE",
  VIREMENT = "VIREMENT",
  CREDIT = "CREDIT",
  MIXTE = "MIXTE",
}

export enum StatutReglement {
  EN_ATTENTE = "EN_ATTENTE",
  PARTIELLE = "PARTIELLE",
  ENCAISSE = "ENCAISSE",
  PAYE = "PAYE",
  REJETE = "REJETE",
  RENOUVELE = "RENOUVELE",
}

export enum StatutCaisse {
  OUVERTE = "OUVERTE",
  CLOTUREE = "CLOTUREE",
}

export enum TypeMouvementCaisse {
  ENCAISSEMENT = "ENCAISSEMENT",
  DECAISSEMENT = "DECAISSEMENT",
  DECAISSEMENTVIRTUEL = "DECAISSEMENTVIRTUEL",
  ENCAISSEMENTVIRTUEL = "ENCAISSEMENTVIRTUEL",
  ENCAISSEMENTCREDIT = "ENCAISSEMENTCREDIT",
}

export enum CategorieDepense {
  ESSENCE = "ESSENCE",
  ELECTRICITE = "ELECTRICITE",
  EAU = "EAU",
  TELECOM = "TELECOM",
  REPARATION = "REPARATION",
  FOURNITURE = "FOURNITURE",
  AUTRE = "AUTRE",
}

// ============= NOUVEAUX ENUMS =============
export enum StatutChantier {
  EN_COURS = "EN_COURS",
  TERMINE = "TERMINE",
  ANNULE = "ANNULE",
  EN_ATTENTE = "EN_ATTENTE",
}

// ============= INTERFACES EXISTANTES =============
export interface User {
  id: string;
  email: string;
  password: string;
  nom: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Home {
  id: string;
  nom: string;
  description?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  nom: string;
  description?: string;
  createdAt: Date;
}

export interface StockLocation {
  id: string;
  productId: string;
  homeId: string;
  quantite: number;
  home?: Home;
}

// ============= NOUVELLES INTERFACES =============
export interface Unite {
  id: string;
  nom: string;
  symbole?: string;
  createdAt: Date;
  updatedAt: Date;
  produits?: Product[];
}

export interface Chantier {
  id: string;
  nom: string;
  reference?: string;
  clientId?: string;
  client?: Client;
  adresse?: string;
  description?: string;
  dateDebut?: Date;
  dateFin?: Date;
  statut: StatutChantier;
  budgetPrevu?: number;
  coutActuel: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  bonSorties?: BonSortie[];
  devis?: Devis[];
  factures?: Facture[];
  reglementDivers?: ReglementDivers[];
  consommations?: ConsommationChantier[];
}

export interface ConsommationChantier {
  id: string;
  chantierId: string;
  chantier?: Chantier;
  productId: string;
  product?: Product;
  quantite: number;
  date: Date;
  bonSortieId?: string;
  bonSortie?: BonSortie;
}

// ============= INTERFACES MODIFIÉES =============
export interface Product {
  id: string;
  imageUrl: string;
  reference: string;
  code?: string;
  designation: string;
  categoryId: string;
  category?: Category;
  homeId: string;
  home?: Home;
  prixAchat: number;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
  quantiteStock: number;
  seuilAlerte: number;
  stockLocations?: StockLocation[];
  createdAt: Date;
  updatedAt: Date;

  // NOUVEAUX CHAMPS
  uniteId?: string;           // ← AJOUT
  unite?: Unite;              // ← AJOUT
  type: TypeArticle;
  consommations?: ConsommationChantier[]; // ← AJOUT
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  type: TypeMouvementStock;
  quantite: number;
  motif: string;
  date: Date;
  bonSortieId?: string;
  bonSortie?: BonSortie;
}

export interface ClientAddress {
  id: string;
  clientId: string;
  adresse: string;
  lieuDit: string | null;
  codePostal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  estPrincipale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string | null;
  mf: string | null;
  cin: string | null;
  adresse: string | null;
  solde: number;
  latitude: number | null;
  longitude: number | null;
  lieuDit: string | null;
  codePostal: string | null;
  ville: string | null;
  createdAt: string;
  updatedAt: string;
  addresses?: ClientAddress[];

  // Relations avec les chantiers
  chantiers?: Chantier[];
}

export interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  adresse?: string;
  email?: string;
  solde: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneDevis {
  id: string;
  devisId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

export interface Devis {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTTC: number;
  validite: Date;
  statut: StatutDevis;
  remise: number;
  remiseType: string;
  lignes: LigneDevis[];
  createdAt: Date;
  updatedAt: Date;

  // NOUVEAU CHAMP
  chantierId?: string;    // ← AJOUT
  chantier?: Chantier;    // ← AJOUT
}

export interface LigneBL {
  id: string;
  bonLivraisonId: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  quantiteRetournee: number;
  prixVente: number;
  remiseLigne: number;
}

export interface BonLivraison {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  factureId?: string;
  facture?: Facture;
  chauffeurId?: string;
  homeId?: string;
  home?: Home;
  statut: StatutBL;
  modeReglement?: TypeReglement;
  montantTotal: number;
  montantHT: number;
  montantTVA: number;
  resteCredit?: number;
  montantCredit?: number;
  montantPaye: number;
  montantRestant: number;
  remise: number;
  detailsMixte?: string;
  lignes: LigneBL[];
  reglements: ReglementClientBL[];
  retourClients: RetourClient[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneFacture {
  id: string;
  factureId: string;
  productId: string;
  product?: Product;
  homeId?: string;
  home?: Home;
  quantite: number;
  prixUnitaire: number;
  remiseLigne: number;
  tva: number;
}

export interface Facture {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  bonLivraisonId?: string;
  bonLivraisonRef?: BonLivraison;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
  statut: StatutFacture;
  type: TypeFacture;
  lignes: LigneFacture[];
  reglements: ReglementFacture[];
  retourClients: RetourClient[];
  bonLivraisons: BonLivraison[];
  createdAt: Date;
  updatedAt: Date;

  // NOUVEAU CHAMP
  chantierId?: string;    // ← AJOUT
  chantier?: Chantier;    // ← AJOUT
}

export interface LigneRetourClient {
  id: string;
  retourClientId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
}

export interface RetourClient {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  factureId?: string;
  facture?: Facture;
  bonLivraisonId?: string;
  bonLivraison?: BonLivraison;
  montant: number;
  lignes: LigneRetourClient[];
  createdAt: Date;
}

export interface LigneRetourFournisseur {
  id: string;
  retourFournisseurId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  ligneBonEntreeId?: string;
}

export interface RetourFournisseur {
  id: string;
  numero: string;
  date: Date;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  bonEntreeId?: string;
  bonEntree?: BonEntree;
  motif?: string;
  montant: number;
  lignes: LigneRetourFournisseur[];
  createdAt: Date;
}

export interface ReglementFacture {
  id: string;
  reglementId: string;
  factureId: string;
  facture?: Facture;
  montantApplique: number;
}

export interface ReglementClientBL {
  id: string;
  reglementId: string;
  bonLivraisonId: string;
  bonLivraison?: BonLivraison;
  montant: number;
}

export interface ReglementClient {
  id: string;
  date: Date;
  clientId: string;
  client?: Client;
  nameSecondClient?: string;
  chauffeurId?: string;
  montant: number;
  typeReglement: TypeReglement;
  reference?: string;
  statut: StatutReglement;
  echeance?: Date;
  banque?: string;
  detailsMixte: string | null;
  domiciliation?: string;
  imageUrl?: string;
  factures: ReglementFacture[];
  bonLivraisons: ReglementClientBL[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReglementFournisseur {
  id: string;
  date: Date;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  montant: number;
  typeReglement: TypeReglement;
  reference?: string;
  statut: StatutReglement;
  echeance?: Date;
  banque?: string;
  domiciliation?: string;
  imageUrl?: string;
  detailsMixte?: string;
  factures: ReglementFactureFournisseur[];
  bonsEntree: ReglementFournisseurBE[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReglementFactureFournisseur {
  id: string;
  reglementId: string;
  factureId: string;
  facture?: FactureFournisseur;
  montantApplique: number;
}

export interface ReglementFournisseurBE {
  id: string;
  reglementId: string;
  bonEntreeId: string;
  bonEntree?: BonEntree;
  montant: number;
}

export interface ReglementDivers {
  id: string;
  date: Date;
  libelle: string;
  categorie: CategorieDepense;
  montant: number;
  modeReglement: TypeReglement;
  reference?: string;
  justificatif?: string;
  imageUrl?: string;
  chauffeurId?: string;
  createdAt: Date;
  updatedAt: Date;

  // NOUVEAU CHAMP
  chantierId?: string;    // ← AJOUT
  chantier?: Chantier;    // ← AJOUT
}

export interface MouvementCaisse {
  id: string;
  date: Date;
  caisseId: string;
  type: TypeMouvementCaisse;
  modeReglement: TypeReglement;
  montant: number;
  reference?: string;
  libelle: string;
  createdAt: Date;
  caisse?: Caisse;
}

export interface Caisse {
  id: string;
  date: Date;
  chauffeurId?: string;
  soldeOuverture: number;
  totalEncaissements: number;
  totalDecaissements: number;
  soldeTheorique: number;
  soldeReel?: number;
  ecart?: number;
  statut: StatutCaisse;
  mouvements: MouvementCaisse[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= INTERFACES BON SORTIE =============
export interface LigneBonSortie {
  id: string;
  bonSortieId: string;
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
  tva: number;
}

export interface BonSortie {
  id: string;
  numero: string;
  date: Date;
  dateDebut: Date;
  dateFin: Date;
  destination: string;
  nomConducteur: string;
  matriculeVehicule: string;
  numCIN: string;
  clientId?: string;
  client?: Client;
  destinataire: string;
  motif: string;
  adresseLivraison?: string;
  observation?: string;
  statut: string;
  totalHT: number;
  totalTTC: number;
  createdBy: string;
  validePar?: string;
  dateValidation?: Date;
  annulePar?: string;
  dateAnnulation?: Date;
  createdAt: Date;
  updatedAt: Date;

  // NOUVEAUX CHAMPS
  chantierId?: string;       // ← AJOUT
  chantier?: Chantier;       // ← AJOUT

  // Relations
  lignes: LigneBonSortie[];
  stockMovements: StockMovement[];
  consommations?: ConsommationChantier[];
}

// ============= INTERFACES FACTURES FOURNISSEURS =============
export interface FactureFournisseur {
  id: string;
  numero: string;
  date: Date;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
  statut: string;
  lignes: LigneFactureFournisseur[];
  reglements: ReglementFactureFournisseur[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneFactureFournisseur {
  id: string;
  factureId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaireHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  homeId: string;
  home?: Home;
}

// ============= INTERFACES BONS D'ENTREE =============
export interface BonEntree {
  id: string;
  numero: string;
  date: Date;
  fournisseurId?: string;
  fournisseur?: Fournisseur;
  type: string;
  referenceDoc?: string;
  description?: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  createdBy: string;
  validePar?: string;
  dateValidation?: Date;
  lignes: LigneBonEntree[];
  reglements: ReglementFournisseurBE[];
  retourFournisseurs: RetourFournisseur[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneBonEntree {
  id: string;
  bonEntreeId: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  quantiteRetournee: number;
  prixUnitaireHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  retourLignes: LigneRetourFournisseur[];
}

// ============= INTERFACES INVENTAIRE =============
export interface Inventaire {
  id: string;
  numero: string;
  date: Date;
  dateDebut: Date;
  dateFin: Date;
  description?: string;
  statut: string;
  chauffeurId?: string;
  validePar?: string;
  dateValidation?: Date;
  lignes: LigneInventaire[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneInventaire {
  id: string;
  inventaireId: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantiteTheorique: number;
  quantitePhysique: number;
  ecart: number;
  commentaire?: string;
}

// ============= INTERFACES TRANSFERT STOCK =============
export interface TransfertStock {
  id: string;
  numero: string;
  date: Date;
  productId: string;
  product?: Product;
  sourceHomeId: string;
  sourceHome?: Home;
  destinationHomeId: string;
  destinationHome?: Home;
  quantite: number;
  motif?: string;
  statut: string;
  validePar?: string;
  dateValidation?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============= INTERFACES TOURNÉES =============
export interface Tournee {
  id: string;
  numero: string;
  date: Date;
  chauffeurId?: string;
  chauffeur?: Chauffeur;
  ville: string;
  statut: string;
  missions: Mission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Mission {
  id: string;
  tourneeId: string;
  tournee?: Tournee;
  clientId: string;
  client?: Client;
  adresseId: string;
  adresse?: ClientAddress;
  ordre: number;
  action: string;
  commentaire?: string;
  statut: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  dateRealisation?: Date;
  actionHistory?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ============= INTERFACES CHAUFFEUR ET VEHICULE =============
export interface Chauffeur {
  id: string;
  userId: string;
  user?: User;
  vehiculeId?: string;
  vehicule?: Vehicule;
  nom: string;
  telephone: string;
  cin?: string;
  bonLivraisons: BonLivraison[];
  inventaires: Inventaire[];
  reglements: ReglementClient[];
  caisses: Caisse[];
  tournees: Tournee[];
  reglementDivers: ReglementDivers[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicule {
  id: string;
  immatricule: string;
  nom: string;
  description?: string;
  homeId: string;
  home?: Home;
  chauffeurs: Chauffeur[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= UTILITY FUNCTIONS =============

export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "0.000 TND";
  }
  return amount.toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " TND";
}

export function formatDate(date: Date | string): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============= LABEL MAPPINGS =============

export const typeArticleLabels: Record<TypeArticle, string> = {
  [TypeArticle.STOCK]: "Stock",
  [TypeArticle.SERVICE]: "Service",
};

export const typeArticleColors: Record<TypeArticle, string> = {
  [TypeArticle.STOCK]: "bg-blue-100 text-blue-800 border-blue-200",
  [TypeArticle.SERVICE]: "bg-purple-100 text-purple-800 border-purple-200",
};

export const statutDevisLabels: Record<StatutDevis, string> = {
  [StatutDevis.EN_ATTENTE]: "En attente",
  [StatutDevis.ACCEPTE]: "Accepté",
  [StatutDevis.REFUSE]: "Refusé",
  [StatutDevis.TRANSFORME_EN_FACTURE]: "Transformé en facture",
};

export const statutFactureLabels: Record<StatutFacture, string> = {
  [StatutFacture.PAYEE]: "Payée",
  [StatutFacture.IMPAYEE]: "Impayée",
  [StatutFacture.PARTIELLE]: "Partielle",
};

export const statutBLLabels: Record<StatutBL, string> = {
  [StatutBL.EN_ATTENTE]: "En attente",
  [StatutBL.LIVRE]: "Livré",
  [StatutBL.ANNULE]: "Annulé",
};

export const typeReglementLabels: Record<TypeReglement, string> = {
  [TypeReglement.ESPECE]: "Espèce",
  [TypeReglement.CHEQUE]: "Chèque",
  [TypeReglement.TRAITE_DOMICILE]: "Traite à domicile",
  [TypeReglement.TRAITE_BANCAIRE]: "Traite bancaire",
  [TypeReglement.VIREMENT]: "Virement",
  [TypeReglement.CREDIT]: "Crédit",
  [TypeReglement.MIXTE]: "Paiement Mixte",
};

export const statutReglementLabels: Record<StatutReglement, string> = {
  [StatutReglement.EN_ATTENTE]: "En attente",
  [StatutReglement.PARTIELLE]: "Partielle",
  [StatutReglement.ENCAISSE]: "Encaissé",
  [StatutReglement.PAYE]: "Payé",
  [StatutReglement.REJETE]: "Rejeté",
  [StatutReglement.RENOUVELE]: "Renouvelé",
};

export const categorieDepenseLabels: Record<CategorieDepense, string> = {
  [CategorieDepense.ESSENCE]: "Essence",
  [CategorieDepense.ELECTRICITE]: "Électricité",
  [CategorieDepense.EAU]: "Eau",
  [CategorieDepense.TELECOM]: "Télécom",
  [CategorieDepense.REPARATION]: "Réparation",
  [CategorieDepense.FOURNITURE]: "Fourniture",
  [CategorieDepense.AUTRE]: "Autre",
};

export const typeMouvementStockLabels: Record<TypeMouvementStock, string> = {
  [TypeMouvementStock.ENTREE]: "Entrée",
  [TypeMouvementStock.SORTIE]: "Sortie",
  [TypeMouvementStock.AJUSTEMENT]: "Ajustement",
};

// ============= NOUVEAUX LABEL MAPPINGS =============
export const statutChantierLabels: Record<StatutChantier, string> = {
  [StatutChantier.EN_COURS]: "En cours",
  [StatutChantier.TERMINE]: "Terminé",
  [StatutChantier.ANNULE]: "Annulé",
  [StatutChantier.EN_ATTENTE]: "En attente",
};

export const statutChantierColors: Record<StatutChantier, string> = {
  [StatutChantier.EN_COURS]: "bg-blue-100 text-blue-800",
  [StatutChantier.TERMINE]: "bg-green-100 text-green-800",
  [StatutChantier.ANNULE]: "bg-red-100 text-red-800",
  [StatutChantier.EN_ATTENTE]: "bg-yellow-100 text-yellow-800",
};