export type CourseStatus = 'en_cours' | 'accepter' | 'en_route' | 'a_bord' | 'terminer' | 'annulee';

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
