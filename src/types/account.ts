export interface PlanSite {
  [key: string]: any;
}

export interface CountryState {
  id: string;
  iso: string;
  name: string;
  countryId: number;
}

export interface Country {
  id: string;
  databaseId: number;
  iso: string;
  name: string;
  /** False when the country has no city-level addressing, such as Singapore. */
  hasCity: boolean;
  /** True when a location in this country must have a `stateIso`. */
  stateRequired: boolean;
  /** False when the country has no postal code system; send `postalCode` only when this is true. */
  hasPostalCode: boolean;
  states: CountryState[];
  [key: string]: any;
}

export interface Subscription {
  [key: string]: any;
}

export interface TemporaryCloseInput {
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  locationId: string | number;
  [key: string]: any;
}
