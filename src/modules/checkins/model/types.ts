export type CheckinEventSummary = {
  id: string;
  title: string;
  startTime: string | null;
  locationText: string | null;
};

export type CheckinEventOption = {
  id: string;
  title: string;
  label: string;
  startTime: string | null;
};

export type CheckinListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  isActive: boolean;
  publicUrl: string;
  qrImageUrl: string;
  registrationCount: number;
  event: CheckinEventSummary;
};

export type CheckinRegistration = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
};

export type CheckinDetail = CheckinListItem & {
  registrations: CheckinRegistration[];
};

export type CheckinPublicView = {
  id: string;
  name: string;
  slug: string;
  publicUrl: string;
  qrImageUrl: string;
  event: CheckinEventSummary;
};
