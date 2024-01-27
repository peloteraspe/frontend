import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import PaymentStepper from "@/components/PaymentStepper";

export default async function DetallePago({
  params,
}: {
  params: { id: number };
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: dataPost, error } = await supabase
    .from("event")
    .select("*")
    .eq("id", params.id);
  if (!dataPost) {
    notFound();
    return { props: {} };
  }

  const { data: dataPayment, error: errorPayment } = await supabase
    .from("paymentMethod")
    .select("*")
    .eq("id", 1);
  // .eq("id", dataPost[0]?.event);
  if (!dataPayment) {
    notFound();
  }
  const payment = await dataPayment[0];
  console.log(dataPayment);

  const post = await dataPost[0];

  return (
    <section>
      <PaymentStepper post={post} paymentData={payment} />
    </section>
  );
}
