export type DemandeStatus = 'en_cours' | 'en_route' | 'terminee' | 'annulee';

export type DemandePaymentMethod = 'bankily_vendeur' | 'bankily_fast' | 'espece';

export interface Demande {
  id: string;
  vendorId: string;
  vendorName?: string;
  vendorPhone?: string;
  productId: string;
  productName: string;
  quantity: number;
  clientPhone: string;
  departure: string;
  destination: string;
  paymentMethod: DemandePaymentMethod;
  status: DemandeStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export const DEMANDE_PAYMENT_METHOD_LABEL: Record<DemandePaymentMethod, string> = {
  bankily_vendeur: 'Bankily vendeur',
  bankily_fast:    'Bankily FAST',
  espece:          'Espèce',
};

export const DEMANDE_NEXT_STATUS: Partial<Record<DemandeStatus, DemandeStatus>> = {
  en_cours: 'en_route',
  en_route: 'terminee',
};

export const DEMANDE_NEXT_LABEL: Partial<Record<DemandeStatus, string>> = {
  en_cours: 'En route',
  en_route: 'Terminer',
};

export const DEMANDE_CANCELLABLE = new Set<DemandeStatus>(['en_cours', 'en_route']);

export const DEMANDE_STATUS_LABEL: Record<DemandeStatus, string> = {
  en_cours: 'En cours',
  en_route: 'En route',
  terminee: 'Terminée',
  annulee:  'Annulée',
};
