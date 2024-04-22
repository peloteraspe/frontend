"use server";

import { ProfileRequestBody, UserProfileUpdate } from "@/utils/interfaces";

export async function createProfile(requestBody: ProfileRequestBody) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    console.log(error);
    console.error("Error fetching events:", error.message);
  }
}

export async function getProfile(userId: string) {
  const url = `${process.env.BACKEND_URL}/profile/${userId}`;

  try {
    const response = await fetch(url, { method: "GET" });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error) {
    console.error(
      "Error fetching profile:",
      error instanceof Error ? error.message : "Unknown error"
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return data;
  } catch (error) {
    console.error(
      "Error updating profile:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}
