import { supabase } from "@/supabase";
import { useEffect, useState } from "react";
import { useRouter } from 'next/router';
import { Button } from "@/components/atoms";
import { useSessionContext } from "@supabase/auth-helpers-react";

const Dashboard = () => {
  const router = useRouter();

  const { isLoading, session, error } = useSessionContext();

  useEffect(() => {
    console.log(session);
    if (isLoading && !session) {
      router.push("/signIn");
    }
  }, [isLoading, session])

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <Button onClick={()=>handleLogout()}>Logout</Button>
    </div>
  );
};

export default Dashboard;
