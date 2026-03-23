export type EventLocation = {
  lat: number;
  lng: number;
};

export type EventEntity = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  startTime: string | null;
  endTime: string | null;
  locationText: string;
  district: string;
  locationReference?: string;
  location: EventLocation;
  price: number;
  minUsers: number;
  maxUsers: number;
  eventTypeId: number | null;
  eventTypeName: string;
  levelId: number | null;
  levelName: string;
  createdBy: string;
  createdById: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  approvedCount?: number;
  placesLeft?: number;
  isSoldOut?: boolean;
  distanceKm?: number;
};

export type CatalogOption = {
  id: number;
  name: string;
};

export type CreateEventPayload = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  price: number;
  minUsers: number;
  maxUsers: number;
  district: string;
  locationText: string;
  locationReference?: string;
  lat: number;
  lng: number;
  eventTypeId: number;
  levelId: number;
};
