import type { Metadata } from 'next';
import CustomerSupportPage from '@modules/support/ui/CustomerSupportPage';

export const metadata: Metadata = {
  title: 'Atención al cliente | Peloteras',
  description:
    'Contacta al equipo de Peloteras para recibir ayuda con entradas, pagos o validación de QR.',
  alternates: { canonical: '/customer-support' },
};

export default function Page() {
  return <CustomerSupportPage />;
}
