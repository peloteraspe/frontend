import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import { Session } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@/supabase";
import "../styles/globals.scss";

const MyApp = ({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={pageProps.initialSession}
    >
      {/* @ts-ignore */}
      {isHydrated && <Component {...pageProps} />}
    </SessionContextProvider>
  );
};

export default MyApp;
