import type { NextPage } from "next";
import { Form } from "@/components/organisms";
import { loginForm } from "@/utils/constants/forms";
import { useForm } from "react-hook-form";
import { Button, Icon } from "@/components/atoms";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
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
        <div className="flex flex-col sm:w-96 p-4 rounded-xl">
          <Image
            className="m-auto"
            src="/assets/init-soccer.gif"
            alt="Init soccer ball"
            width={300}
            height={300}
          />
          <Button text="Ingresar" onClick={() => router.push("/signIn")} />
        </div>
      </div>
    </>
  );
};

export default Index;
