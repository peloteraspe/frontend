import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function getEvents() {
  // Await cookies() to get the resolved cookies object.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.from("event").select("*");

  if (error) {
    console.error("Error fetching data from Supabase:", error.message);
    throw new Error("Failed to fetch data");
  }

  return data;
}