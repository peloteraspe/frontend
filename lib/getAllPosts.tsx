import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export default async function getAllPosts() {
  // Await cookies() so that cookieStore is the resolved cookies object.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  // Replace 'event' with the actual table name in your Supabase database if needed.
  const { data, error } = await supabase.from("event").select("*");

  if (error) {
    console.error("Error fetching data from Supabase:", error.message);
    throw new Error("Failed to fetch data");
  }

  return data;
}