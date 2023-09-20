import { useEffect } from "react";
import { NextPage } from "next";
import { Button, Icon } from "@/components/atoms";
import { Form } from "@/components/organisms";
import { signUpForm } from "@/utils/constants/forms";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { logo } from "@/utils/constants/icons";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { Text } from "@/components/atoms";
import { updateUser } from "@/api/user";

const SignUp: NextPage = () => {
  const form = useForm();
  const router = useRouter();
  const { isLoading, session, error } = useSessionContext();

  const handleUpdateUser = () => {
    updateUser(form.getValues(), session);
    router.push("/dashboard");
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="flex flex-col sm:w-96 p-4 rounded-xl">
        <div className="flex mt-3 flex-row-reverse justify-between items-center align-middle">
          <Icon
            paths={logo}
            fill="#D943A8"
            width={100}
            height={30}
            viewBox="0 0 1433 329"
          ></Icon>
          <Text color="primary" variant="sm">
            Crea tu cuenta
          </Text>
        </div>
        <div className="my-4 w-full">
          <Form formInputs={signUpForm} numberOfColumns={1} {...form} />
        </div>
        <Button
          text="Registrarse"
          disabled={
            !form.formState.isValid || form.watch("playerPosition").length === 0
          }
          onClick={() => handleUpdateUser()}
        />
      </div>
    </div>
  );
};

export default SignUp;
