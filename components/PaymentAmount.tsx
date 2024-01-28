type PaymentAmountProps = {
  price: number;
};
const PaymentAmount: React.FC<PaymentAmountProps> = ({ price }) => {
  return (
    <div className="border-indigo-600 rounded-2xl border-2 h-20 w-20 flex items-center justify-center">
      <h1 className="text-2xl">s/. {price}</h1>
    </div>
  );
};

export default PaymentAmount;
