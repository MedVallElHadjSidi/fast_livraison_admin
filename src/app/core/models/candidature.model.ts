export type CandidatureStatus = 'en_attente' | 'approuve' | 'rejete';

export interface VehiculeInfo {
  type: 'moto' | 'voiture' | 'camionnette';
  marque: string;
  modele: string;
  immatriculation: string;
  annee?: number;
}

export interface DocumentsInfo {
  photoIdentite?: string;
  permisConduite?: string;
  photoVehicule?: string;
  carteGrise?: string;
}

export interface Candidature {
  id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  status: CandidatureStatus;
  vehicule: VehiculeInfo;
  documents: DocumentsInfo;
  createdAt: Date;
  notes?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  driverId?: string;
}
