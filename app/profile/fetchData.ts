import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function fetchPlayersPosition() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: positionsData, error: positionsError } = await supabase
        .from('player_position')
        .select('id, name')
    if (positionsError || !positionsData) {
        throw new Error("Player position not found");
    }

    return positionsData
}


export async function fetchLevels() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {data: levelData , error : levelError} = await supabase
    .from('level')
    .select("*")

    if (levelError || !levelData) {
        throw new Error("level not found");
    }

    return levelData;
}