export type CourseStatus = 'en_cours' | 'accepter' | 'en_route' | 'a_bord' | 'terminer' | 'annulee';

// Commande produit liée à une course — suivi séparé du cycle de la course
// elle-même (en_cours→accepter→...), géré indépendamment par l'admin.
export type ProductOrderStatus = 'en_instance' | 'recue' | 'envoyer' | 'terminee';

export interface Course {
  id: string;
  driverId?: string;
  driverPhone?: string;
  driverName?: string;
  clientPhone: string;
  departure: string;
  destination: string;
  date: Date;
  prix: number;
  commission?: number;
  status: CourseStatus;
  productId?: string;
  productName?: string;
  productQuantity?: number;
  productStatus?: ProductOrderStatus;
  createdAt: Date;
  updatedAt?: Date;
}

// en_cours → accepter → en_route → a_bord → terminer, annulation possible avant "a_bord".
export const COURSE_NEXT_STATUS: Partial<Record<CourseStatus, CourseStatus>> = {
  en_cours: 'accepter',
  accepter: 'en_route',
  en_route: 'a_bord',
  a_bord:   'terminer',
};

export const COURSE_NEXT_LABEL: Partial<Record<CourseStatus, string>> = {
  en_cours: 'Accepter',
  accepter: 'En route',
  en_route: 'À bord',
  a_bord:   'Terminer',
};

export const COURSE_NEXT_ICON: Partial<Record<CourseStatus, string>> = {
  en_cours: 'check_circle',
  accepter: 'navigation',
  en_route: 'airline_seat_recline_normal',
  a_bord:   'flag',
};

export const COURSE_CANCELLABLE = new Set<CourseStatus>(['en_cours', 'accepter', 'en_route']);

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  en_cours: 'En cours',
  accepter: 'Acceptée',
  en_route: 'En route',
  a_bord:   'À bord',
  terminer: 'Terminée',
  annulee:  'Annulée',
};

// en_instance (attente validation admin) → recue → envoyer → terminee.
export const PRODUCT_NEXT_STATUS: Partial<Record<ProductOrderStatus, ProductOrderStatus>> = {
  en_instance: 'recue',
  recue:       'envoyer',
  envoyer:     'terminee',
};

export const PRODUCT_NEXT_LABEL: Partial<Record<ProductOrderStatus, string>> = {
  en_instance: 'Valider (reçue)',
  recue:       'Marquer envoyée',
  envoyer:     'Marquer terminée',
};

export const PRODUCT_STATUS_LABEL: Record<ProductOrderStatus, string> = {
  en_instance: 'En instance',
  recue:       'Reçue',
  envoyer:     'Envoyée',
  terminee:    'Terminée',
};

export function courseWhatsAppUrl(course: Course): string {
  const dateStr = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(course.date);

  const message = [
    course.departure,
    course.destination,
    `${course.prix} MRU`,
    dateStr,
  ].join('\n');

  const phone = course.driverPhone?.replace(/\D/g, '');
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
