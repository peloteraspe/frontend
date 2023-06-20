import { Session, UserAttributes } from "@supabase/supabase-js";
import { supabase } from "@/supabase";
import { NextRouter } from "next/router";

export const updateUser = async (
  data: any,
  session: Session
) => {
  const { id } = session.user;
  console.log(data);
  const { error } = await supabase.auth.updateUser({
    id,
    data: {
      username: data.username,
      playerPosition: data.playerPosition,
    },
  } as UserAttributes);
  if (error) {
    console.log("error", error);
    throw error;
  }
};

export const resetUser = async (
  session: Session,
  router: NextRouter
) => {
  const { id } = session.user;
  const { error } = await supabase.auth.updateUser({
    id,
    data: {
      username: null,
      playerPosition: null,
    },
  } as UserAttributes);
  if (error) {
    console.log("error", error);
    throw error;
  }
  router.push("/signUp");
};
