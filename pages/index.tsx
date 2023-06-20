import type { NextPage } from "next";
import { Button } from "@/components/atoms";
import { useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import router from "next/router";

const Index: NextPage = () => {
  const { isLoading, session, error } = useSessionContext();

  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [isLoading, session]);

  return (
    <>
      <div className="flex justify-center items-center w-full h-screen">
        <div className="flex flex-col w-96 p-4 rounded-xl">
          <Button text="Ingresar" onClick={() => router.push("/signIn")} />
        </div>
      </div>
    </>
  );
};

export default Index;
