export type TicketStatus = 'pending' | 'active' | 'used' | 'revoked';

export type TicketMeta = {
  id: number | null;
  assistantId: number | null;
  status: TicketStatus;
  qrToken: string | null;
  qrValue: string | null;
  qrImageUrl: string | null;
  googleWalletUrl: string | null;
  appleWalletUrl: string | null;
};

export type TicketEvent = {
  id: string | number;
  formattedDateTime: string;
  startTime?: string | null;
  title?: string;
  locationText?: string;
  ticket?: TicketMeta;
  [key: string]: any;
};
