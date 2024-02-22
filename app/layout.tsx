import { Poppins } from "next/font/google";
import { eastmanBold, eastmanExtrabold } from "./fonts";
import "./css/style.css";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthButton from "@/components/AuthButton";
import { Navbar } from "@/components/Navbar";
import { redirect } from "next/navigation";
import { Toaster } from "react-hot-toast";

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
    <html lang="en" className={`${poppins.variable} ${poppinsBold.variable} ${eastmanBold.variable} ${eastmanExtrabold.variable}`}>
      <body>
        <main className="flex-1 w-full flex flex-col gap-20 items-center min-h-screen">
          <Navbar user={user} />
          {children}
        </main>
      </body>
      <Toaster />
    </html>
  );
}
