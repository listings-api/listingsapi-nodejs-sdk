export interface PlanSite {
  [key: string]: any;
}

export interface Country {
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
