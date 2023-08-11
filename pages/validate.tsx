import { NextPage } from "next";

const Validate: NextPage = () => {
  return (
    <div className="realtive flex flex-col justify-center h-screen text-center">
      <h1 className="mt-4 text-2xl font-semibold ">Revisa tu correo</h1>
      <p className="mt-10 text-lg px-20">
        Te enviamos un correo para validar tu cuenta.
      </p>
    </div>
  );
};

export default Validate;
