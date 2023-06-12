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
  }, [isLoading, session])
  
  return (
    <>
      <Image className="m-auto" src="/assets/init-soccer-ball.gif" alt="Init soccer ball" width={300} height={300} />
      <Button text="Ingresar" onClick={() => router.push("/signIn")} />
    </>
  );
};

export default Index;
