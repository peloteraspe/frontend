import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PostItem from "../../post-item";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import LogoYape from "../../assets/Logo.Yape.webp";

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Estas a punto de pagar por el siguiente evento:
        </h2>
        <h3 className="font-bold text-gray-800">Evento: {post.title}</h3>
        <h2 className=" font-bold text-gray-800">
          Organizado por: {post.created_by}{" "}
        </h2>
        <hr className="my-4" />
        <h1 className="font-bold text-gray-800 text-center"> Paga con yape</h1>

        <div className="flex flex-col items-center bg-[#742384] m-auto w-[150px] h-[150px] p-4 rounded-xl mb-4">
          <Image src={LogoYape} width={100} height={100} alt="yape logo" />
        </div>

        <div className="max-w-xs mx-auto">
          <Link
            className="btn w-full text-white bg-indigo-500 hover:bg-indigo-600 group shadow-sm"
            href={`/pago/${post.id}`}
          >
            Realizar pago
            <span className="tracking-normal text-indigo-200 group-hover:translate-x-0.5 transition-transform duration-150 ease-in-out ml-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                />
              </svg>
            </span>
          </Link>
        </div>

        {/* <p className="text-gray-800">
          1. Ingresa a la aplicación de Yape y escanea el siguiente código QR
        </p> */}
      </div>
    </section>
  );
}