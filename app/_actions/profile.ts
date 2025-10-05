"use server";

import { ProfileRequestBody, UserProfileUpdate } from "@/utils/interfaces";
import { log } from "@/lib/logger";

export async function createProfile(requestBody: ProfileRequestBody) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    log.apiCall("POST", `/profile`, response.status, { userId: requestBody.user });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    log.error("Error creating profile", "PROFILE_ACTION", error, { userId: requestBody.user });
    throw error;
  }
}

export async function getProfile(userId: string) {
  const url = `${process.env.BACKEND_URL}/profile/${userId}`;

  try {
    const response = await fetch(url, { method: "GET" });
    
    log.apiCall("GET", `/profile/${userId}`, response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error) {
    log.error(
      "Error fetching profile", 
      "PROFILE_ACTION",
      error instanceof Error ? error : new Error("Unknown error"),
      { userId }
    );
    throw error;
  }
}

export async function updateProfile(
  userId: string,
  updates: UserProfileUpdate
) {
  const url = `${process.env.BACKEND_URL}/profile/${userId}`;

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    log.apiCall("PATCH", `/profile/${userId}`, response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error) {
    log.error(
      "Error updating profile",
      "PROFILE_ACTION", 
      error instanceof Error ? error : new Error("Unknown error"),
      { userId, updates }
    );
    throw error;
  }
}
