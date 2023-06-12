import { supabase } from "@/supabase";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/atoms";
import { useSessionContext } from "@supabase/auth-helpers-react";

const Dashboard = () => {
  const router = useRouter();

  const { session } = useSessionContext();

  useEffect(() => {
    if (session === null) {
      router.push("/signIn");
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <Button onClick={() => handleLogout()}>Logout</Button>
    </div>
  );
};

export default Dashboard;
