import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";


export async function getFeatures() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: features, error: featuresError } = await supabase.from("features").select("*");
    if (featuresError || !features) {
        console.error("Error fetching data from Supabase:", featuresError.message);
        throw new Error("Failed to fetch data");
      }

    return features 
}


