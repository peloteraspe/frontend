export type EventUpsertInput = {
  title: string;
  price: number;
  date: string;
  capacity: number;
  locationText: string;
};

export function parseEventFormData(fd: FormData): EventUpsertInput {
  return {
    title: String(fd.get('title') || ''),
    price: Number(fd.get('price') || 0),
    date: String(fd.get('date') || ''),
    capacity: Number(fd.get('capacity') || 0),
    locationText: String(fd.get('locationText') || ''),
  };
}
