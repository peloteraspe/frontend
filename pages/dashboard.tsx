import { supabase } from "@/supabase";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { resetUser } from "@/api/user";

const Dashboard = () => {
  const router = useRouter();

  const { session } = useSessionContext();

  useMemo(() => {
    if (session === null) {
      router.push("/signIn");
    } else {
      if (Object.keys(session.user.user_metadata).length === 0) {
        router.push("/signUp");
      }
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div>
      <h1>Hola, {session?.user.user_metadata.username}! </h1>
      <Button onClick={() => resetUser(session, router)}>Reset userData</Button>
      <Button onClick={() => handleLogout()}>Cerrar Sesión</Button>
    </div>
  );
};

export default Dashboard;
