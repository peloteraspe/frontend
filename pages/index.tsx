import type { NextPage } from "next";
import { useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { Button } from "../components/atoms";

const Index: NextPage = () => {
  const { isLoading, session, error } = useSessionContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [isLoading, session]);

  return (
    <div className="font-sans">
      <Head>
        <title>Peloteras - Landing Page</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <section
          className="relative bg-white bg-center h-screen"
          style={{
            backgroundImage: "url('/background-main2.png')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-background opacity-20"></div>
          <div className="relative flex flex-col items-center justify-center h-full text-center text-white max-sm:justify-end">
            <h1 className="text-5xl font-bold">Bienvenidas a Peloteras</h1>
            <p className="mt-4 text-2xl max-sm:hidden">
              Conectando Mujeres y Disidencias a través del Fútbol
            </p>
            <div className="w-48 mt-8 max-sm:w-48 max-sm:my-8">
              <Button color="green" onClick={() => router.push("signIn")}>
                Comienza Ahora
              </Button>
            </div>
          </div>
        </section>
        <section className="py-20 px-8 bg-secondary">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold">¿Qué es Peloteras?</h2>
              <p className="mt-4 text-xl">
                Peloteras es una innovadora web app que te permite crear y
                gestionar eventos deportivos de fútbol femenino con facilidad y
                eficacia. Además, te brinda la oportunidad de unirte a los
                eventos que más te interesen.
              </p>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <img
                src="/path-to-screenshot.png"
                alt="Peloteras App Screenshot"
              />
            </div>
          </div>
        </section>
        <section className="py-20 bg-background">
          <div className="text-center">
            <h2 className="text-4xl font-bold">
              Crea y Únete a Eventos en Tres Pasos Sencillos
            </h2>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="16" cy="9" r="7" fill="#FFD700" />
                    <path
                      d="M2 29C2 22.3726 7.37258 17 14 17H18C24.6274 17 30 22.3726 30 29V31H2V29Z"
                      fill="#FFD700"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">Registro</h3>
                <p className="mt-2 text-lg">
                  Regístrate en Peloteras y crea tu perfil.
                </p>
              </div>
              {/* Step 2 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="16" cy="10" r="5" fill="#00D084" />
                    <rect
                      x="6"
                      y="18"
                      width="20"
                      height="10"
                      rx="2"
                      fill="#FFD700"
                    />
                    <line
                      x1="6"
                      y1="21"
                      x2="26"
                      y2="21"
                      stroke="#333"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">
                  Organiza o Únete
                </h3>
                <p className="mt-2 text-lg">
                  Crea tu propio evento de fútbol o explora los eventos
                  disponibles para unirte.
                </p>
              </div>
              {/* Step 3 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="20"
                      height="20"
                      rx="3"
                      fill="#4A90E2"
                    />
                    <text
                      x="8"
                      y="20"
                      fill="white"
                      font-size="16px"
                      font-family="Arial"
                    >
                      💲
                    </text>
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">Reserva y Paga</h3>
                <p className="mt-2 text-lg">
                  Reserva tu cupo y realiza el pago de manera segura con
                  diversos métodos de pago.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 px-8 bg-secondary">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-bold">
              Empoderamiento y Comunidad a través del Fútbol
            </h2>
            <p className="mt-4 text-xl">
              Peloteras está comprometido en mejorar la vida de las mujeres y
              disidencias.
            </p>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="16" cy="8" r="4" fill="#6C63FF" />
                    <circle cx="8" cy="16" r="4" fill="#6C63FF" />
                    <circle cx="24" cy="16" r="4" fill="#6C63FF" />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">
                  Construcción de Comunidad
                </h3>
                <p className="mt-2 text-lg">
                  Crea y fortalece lazos con personas que comparten tus
                  intereses y pasiones.
                </p>
              </div>
              {/* Benefit 2 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 2L20.39 12.42L32 12.42L22.32 19.58L26.8 30L16 23L5.2 30L9.68 19.58L0 12.42L11.61 12.42L16 2Z"
                      fill="#FFD700"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">Empoderamiento</h3>
                <p className="mt-2 text-lg">
                  Fomenta la confianza y la fuerza al participar en un deporte
                  de equipo.
                </p>
              </div>
              {/* Benefit 3 */}
              <div className="text-center">
                <div className="flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 2C10.485 2 6 6.485 6 12V16C6 22.085 12.143 30 16 30C19.857 30 26 22.085 26 16V12C26 6.485 21.515 2 16 2ZM16 22C14.346 22 13 20.654 13 19C13 17.346 14.346 16 16 16C17.654 16 19 17.346 19 19C19 20.654 17.654 22 16 22Z"
                      fill="#4A90E2"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-semibold">
                  Facilidad y Seguridad
                </h3>
                <p className="mt-2 text-lg">
                  Organiza y participa en eventos de manera sencilla y segura.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 bg-background text-white text-center">
          <h2 className="text-4xl font-bold">
            Únete a la Comunidad de Peloteras Hoy
          </h2>
          <p className="mt-4 text-xl">
            Da el primer paso para conectar, empoderarte y ser parte de una
            comunidad increíble.
          </p>
          <button className="mt-8 px-8 py-4 text-2xl font-bold rounded-full bg-green" onClick={() => router.push("validate")} >
            Regístrate Ahora
          </button>
        </section>
        <footer className="bg-gray-800 text-white py-12 px-8">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-between">
            {/* Navigation */}
            <div className="mb-8 md:mb-0">
              <h4 className="text-lg font-semibold">Enlaces</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="#" className="hover:underline">
                    Inicio
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Acerca de
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Cómo Funciona
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Testimonios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Contáctanos
                  </a>
                </li>
              </ul>
            </div>
            {/* Social Media */}
            <div className="mb-8 md:mb-0">
              <h4 className="text-lg font-semibold">Redes Sociales</h4>
              <div className="mt-4 space-x-4 flex">
                <a href="#">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="32" height="32" rx="5" fill="#3B5998" />
                    <path
                      d="M20.2817 5.33337H23.9999V0.146446C23.9999 0.146446 22.197 0 20.0076 0C16.3337 0 13.9738 2.95689 13.9738 6.69547V10.6667H9V16H13.9738V32H19.9463V16H24.9198L25.3333 10.6667H19.9463V7.10934C19.9463 5.85198 20.2817 5.33337 20.2817 5.33337Z"
                      fill="white"
                    />
                  </svg>
                </a>
                <a href="#">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="32" height="32" rx="5" fill="#E4405F" />
                    <g transform="translate(8 6)">
                      <ellipse cx="8" cy="8" rx="8" ry="8" fill="white" />
                      <ellipse cx="8" cy="8" rx="5" ry="5" fill="#E4405F" />
                      <circle cx="13" cy="3" r="1" fill="white" />
                    </g>
                  </svg>
                </a>
                <a href="#">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="32" height="32" rx="5" fill="#1DA1F2" />
                    <path
                      d="M26 8.00037C25.0424 8.68583 23.9821 9.20245 22.86 9.51C22.2577 8.84757 21.4573 8.35772 20.54 8.10165C19.6227 7.84558 18.632 7.83866 17.69 8.08297C16.748 8.32728 15.8987 8.81282 15.22 9.49C14.5413 10.1672 14.0584 11.0141 13.8163 11.95C13.5742 12.8859 13.5927 13.8662 13.869 14.79C10.69 14.6972 7.75149 13.165 6.00001 10.71C5.63001 11.54 5.52996 12.47 5.71001 13.36C6.09001 15.09 7.19001 16.57 8.66001 17.37C8.18999 17.38 7.72002 17.29 7.29001 17.13C7.29001 17.14 7.29001 17.18 7.29001 17.21C7.28001 18.68 8.18001 20.05 9.53001 20.69C9.19001 20.8 8.83002 20.84 8.47001 20.79C8.79 22.14 9.94002 23.16 11.36 23.26C10.22 24.24 8.81002 24.79 7.35002 24.79C7.11002 24.79 6.86002 24.78 6.62001 24.76C8.06001 25.76 9.76001 26.36 11.54 26.36C17.47 26.42 21.79 21.11 21.79 15.25C21.79 15.12 21.79 14.99 21.78 14.86C22.61 14.25 23.29 13.47 23.78 12.58C24.58 12.97 25.3 13.22 26 13.31"
                      fill="white"
                    />
                  </svg>
                </a>
              </div>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-lg font-semibold">Información Legal</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="#" className="hover:underline">
                    Términos y condiciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Política de privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
