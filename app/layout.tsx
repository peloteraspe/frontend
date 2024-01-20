import { Poppins } from "next/font/google";
import "./css/style.css";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthButton from "@/components/AuthButton";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: "400",
  display: "swap",
});

const poppinsBold = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins-bold",
  weight: "700",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Peloteras",
  description: "Donde las mujeres jugamos fútbol",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <html lang="en" className={`${poppins.variable} ${poppinsBold.variable}`}>
      <body>
        <main className="flex-1 w-full flex flex-col gap-20 items-center">
          <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
              <Image
                src="/logo.png"
                width={50}
                height={50}
                alt="Peloteras logo"
              />
              <AuthButton isLogged={user ? true : false} />
            </div>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}