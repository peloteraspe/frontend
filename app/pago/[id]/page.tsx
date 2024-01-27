import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import PaymentStepper from "@/components/Stepper";

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
  }
  const post = await dataPost[0];

  return (
    <section>
      <PaymentStepper post={post} />
    </section>
  );
}
