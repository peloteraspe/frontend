import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { log } from "@/lib/logger";

export async function getFeatures() {
    // Await cookies() to obtain the resolved cookies object.
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select("*");
    
    if (featuresError || !features) {
        log.database("SELECT getFeatures", "features", featuresError);
        throw new Error("Failed to fetch data");
    }

    return features;
}