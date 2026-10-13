import type { PageInfo } from './common.js';

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
  /** Required unless the country's `hasCity` is false. */
  city?: string;
  /** Required when the country's `stateRequired` is true. */
  stateIso?: string;
  /** Send when the country's `hasPostalCode` is true. */
  postalCode?: string;
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

/**
 * A single page of locations, returned by `fetchAllLocations` and
 * `searchLocations` when `fetchAll` is not set to `true`.
 */
export interface LocationPaginatedResponse {
  success: boolean;
  locations: Location[];
  pageInfo: PageInfo;
  raw: any;
}
