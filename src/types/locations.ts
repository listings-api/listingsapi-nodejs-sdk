export interface Location {
  id: string;
  name?: string;
  storeId?: string;
  street?: string;
  city?: string;
  stateIso?: string;
  postalCode?: string;
  countryIso?: string;
  phone?: string;
  description?: string;
  ownerEmail?: string;
  ownerName?: string;
  [key: string]: any;
}

export interface CreateLocationInput {
  name: string;
  storeId: string;
  street: string;
  city: string;
  stateIso: string;
  postalCode: string;
  countryIso: string;
  phone: string;
  subCategoryId: number;
  description?: string;
  ownerEmail?: string;
  ownerName?: string;
  [key: string]: any;
}

export interface UpdateLocationInput {
  id: string | number;
  name?: string;
  storeId?: string;
  street?: string;
  city?: string;
  stateIso?: string;
  postalCode?: string;
  countryIso?: string;
  phone?: string;
  description?: string;
  ownerEmail?: string;
  ownerName?: string;
  [key: string]: any;
}
