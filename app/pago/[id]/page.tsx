import React from "react";
import { fetchData } from "./fetchData";
import PaymentStepper from "@/components/PaymentStepper";

export default async function DetallePago({ params }: any) {
  let data;
  try {
    data = await fetchData(params.id);
  } catch (error: any) {
    // Handle the error, maybe show a custom error message or redirect
    console.error(error);
    return <div>Error: {error.message}</div>;
  }

  // Destructure the event and paymentMethod from the fetched data
  const { event, paymentMethod, user } = data;

  // Render your components using the fetched data
  return (
    <section className="w-full">
      <PaymentStepper post={event} paymentData={paymentMethod} user={user} />
    </section>
  );
}
