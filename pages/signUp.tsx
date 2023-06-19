import { useState, useEffect } from "react";
import { NextPage } from "next";
import { supabase } from "@/supabase";
import { Button, Icon } from "@/components/atoms";
import { Form } from "@/components/organisms";
import { signUpForm } from "@/utils/constants/forms";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { logo } from "@/utils/constants/icons";
import { useSessionContext } from "@supabase/auth-helpers-react";

const SignUp: NextPage = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const { isLoading, session, error } = useSessionContext();

  const form = useForm();

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
          <Form formInputs={signUpForm} numberOfColumns={1} {...form} />
        </div>
        <Button
          text="Registrarse"
          disabled={!form.formState.isDirty || !form.formState.isValid}
          onClick={() => {}}
        />
      </div>
    </div>
  );
};

export default SignUp;
