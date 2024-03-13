import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function  getAllEvents() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.from("event").select("*");

  if (error) {
    console.error("Error fetching data from Supabase:", error.message);
    throw new Error("Failed to fetch data");
  }

  return data;
}
