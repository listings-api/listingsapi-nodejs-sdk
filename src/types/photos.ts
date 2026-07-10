export interface Photo {
  [key: string]: any;
}

export interface PhotoInput {
  photo: string;
  type: 'LOGO' | 'COVER' | 'ADDITIONAL';
  partnerMediaId?: string;
}
