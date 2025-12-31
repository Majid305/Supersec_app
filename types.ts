
export enum DocStatus {
  EN_COURS = "En cours",
  CLOTURE = "Clôturé"
}

export enum DocLanguage {
  FR = "Français",
  AR = "Arabe"
}

export enum DocType {
  LETTRE = "Lettre",
  RECLAMATION = "Réclamation",
  PROCES_VERBAL = "Procès-verbal",
  FACTURE = "Facture",
  NOTE = "Note",
  MESSAGE = "Message",
  COMPTE_RENDU = "Compte rendu",
  AVIS = "Avis",
  CONTROLE_CHARGE = "Contrôle de charge",
  SIMULATION = "Simulation",
  DEMANDE = "Demande",
  RAPPEL = "Rappel",
  BORDEREAU = "Bordereau",
  AUTRE = "Autre"
}

export interface DocumentData {
  id: string;
  document_image: string;
  mimeType: string;
  langue_document: DocLanguage;
  type_objet: string;
  date_document: string;
  objet: string;
  emetteur: string;
  destinataire: string;
  reference: string;
  resume: string;
  suite_a_reserver: string;
  observation: string;
  autres_infos: string;
  reponse: string;
  date_heure_rappel: string;
  statut: DocStatus;
  created_at: number;
}

export enum CheckRejectionClass {
  FOND = "Fond",
  FORME = "Forme"
}

export enum CheckSituation {
  COFFRE = "En coffre-fort",
  COMPTABILITE = "En comptabilité",
  RESTITUE = "Restitué",
  REGULARISE = "Régularisé",
  CONTENTIEUX = "En contentieux",
  AUTRE = "Autre"
}

export interface RejectedCheck {
  id: string;
  document_image: string;
  mimeType: string;
  mois_rejet: string;
  date_systeme: string;
  banque: string;
  numero_cheque: string;
  numero_compte: string;
  rib: string;
  montant: number;
  date_rejet: string;
  motif_rejet: string;
  classe_rejet: CheckRejectionClass;
  situation_actuelle: CheckSituation;
  date_operation: string;
  agence: string;
  ville: string;
  nom_proprietaire: string;
  nom_beneficiaire: string;
  encaisseur: string;
  observation: string;
  date_heure_rappel: string;
  created_at: number;
}

export type ScreenName = 'scanner' | 'dashboard' | 'stats' | 'settings';
export type AppModule = 'courriers' | 'cheques';

export interface AppSettings {
  apiKey: string;
  theme: 'light' | 'dark';
  enableReminders: boolean;
}