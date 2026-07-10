export interface Listing {
  id?: string;
  site?: string;
  syncStatus?: string;
  displayStatus?: string;
  listingUrl?: string;
  [key: string]: any;
}

export interface VoiceListing {
  name?: string;
  voiceIdentifier?: string;
  syncStatus?: string;
  [key: string]: any;
}

export interface DuplicateListing {
  id?: string;
  site?: string;
  listingUrl?: string;
  [key: string]: any;
}
