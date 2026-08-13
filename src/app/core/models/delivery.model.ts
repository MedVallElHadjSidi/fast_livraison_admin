// Valeurs identiques à RequestStatus (driver) et DeliveryStatus (client Flutter)
export type DeliveryStatus = 'pending' | 'accepted' | 'inProgress' | 'delivered' | 'cancelled';

export type PackageSize = 'small' | 'medium' | 'large';

// Compatible avec DeliveryAddress dans les apps Flutter (client & driver)
export interface GeoPoint {
  label:        string;
  moughatta:    string;   // moughataa mauritanienne (ex : Arafat, Tevragh Zeina)
  fullAddress:  string;   // adresse complète formatée
  lat:          number;
  lng:          number;
}

export interface Delivery {
  id?:            string;
  departure:      GeoPoint;
  destination:    GeoPoint;
  clientPhone:    string;
  packageSize:    PackageSize;
  prix:           number;           // champ admin (affichage)
  estimatedPrice: number;           // même valeur — compatibilité apps Flutter
  distance?:      number;           // km (route réelle ou vol d'oiseau)
  notes?:         string;
  status:         DeliveryStatus;
  assignmentType: 'auto' | 'specific';
  driverId?:      string;
  driverName?:    string;
  createdAt?:     unknown;
  createdBy?:     string;
}
