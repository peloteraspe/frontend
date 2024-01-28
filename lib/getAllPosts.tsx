import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export default async function getAllPosts() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  // Replace 'your_table_name' with the actual table name in your Supabase database
  const { data, error } = await supabase.from("event").select("*");

  if (error) {
    console.error("Error fetching data from Supabase:", error.message);
    throw new Error("Failed to fetch data");
  }

  return data;
}
