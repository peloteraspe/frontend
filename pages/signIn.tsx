import { useState, useEffect } from "react";
import { NextPage } from "next";
import { supabase } from "@/supabase";
import { Button, Icon } from "@/components/atoms";
import { Form } from "@/components/organisms";
import { loginForm } from "@/utils/constants/forms";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { logo } from "@/utils/constants/icons";
import { useSessionContext } from "@supabase/auth-helpers-react";

const SignIn: NextPage = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const { isLoading, session, error } = useSessionContext();

  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [isLoading, session]);

  const handleMagicLinkClick = async () => {
    try {
      setLoading(true);
      // const { error } = await supabase.auth.signIn({ email: form.getValues('email') });
      const { data: response, error } = await supabase.auth.signInWithOtp({
        email: form.getValues("email"),
        options: {
          emailRedirectTo: `${
            process?.env?.NEXT_PUBLIC_VERCEL_URL !== undefined
              ? process.env.NEXT_PUBLIC_VERCEL_URL
              : process.env.NEXT_PUBLIC_URL
          }/dashboard`,
        },
      });
      // localStorage.setItem("supabaseSession", response?.session?.access_token);
      router.push("/validate");
      if (error) {
        throw new Error("Error sending magic link");
      }
      // Inform the user to check their email
      console.log("Magic link sent!");
    } catch (error) {
      console.error("Error sending magic link:", error);
    } finally {
      setLoading(false);
    }
  };

  const form = useForm();

  // const handleRegister = form.handleSubmit(async (data: { email: string }) => {
  //   const { data: response, error } = await supabase.auth.signInWithOtp({
  //     email: data.email,
  //     options: {
  //       emailRedirectTo: `${
  //         process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  //       }/dashboard`,
  //     },
  //   });
  //   router.push("/validate");
  // });

  return (
    <div className="flex justify-center items-center w-full h-screen">
      <div className="flex flex-col sm:w-96 p-4 rounded-xl">
        <div className="flex justify-center">
          <Icon
            paths={logo}
            fill="#D943A8"
            width={240}
            height={80}
            viewBox="0 0 1433 329"
          ></Icon>
        </div>
        <div className="my-4">
          <Form formInputs={loginForm} numberOfColumns={1} {...form} />
        </div>
        <Button
          text="Ingresar"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onClick={handleMagicLinkClick}
        />
      </div>
    </div>
  );
};

export default SignIn;
