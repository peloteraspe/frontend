'use client';

import dynamic from 'next/dynamic';
import { PaymentLoading } from '../ui/Loading';

// Define the props interface for PaymentStepper
interface PaymentStepperProps {
  post: any; // You might want to create a proper Event interface
  user: any; // You might want to create a proper User interface
  paymentData: any; // You might want to create a proper PaymentData interface
}

// Dynamic import for PaymentStepper with loading state
const DynamicPaymentStepper = dynamic(
  () => import('./PaymentStepperComponent'),
  {
    loading: () => <PaymentLoading />,
    ssr: false, // Payment components often need client-side state
  }
);

// Re-export with proper typing
const PaymentStepper: React.FC<PaymentStepperProps> = (props) => {
  return <DynamicPaymentStepper {...props} />;
};

export default PaymentStepper;
