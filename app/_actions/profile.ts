"use server";

import { ProfileRequestBody } from "@/utils/interfaces";

export async function createProfile(requestBody: ProfileRequestBody) {
  console.log("Process.env.BACKEND_URL:", `${process.env.BACKEND_URL}/profile`);
  console.log(requestBody);
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response:", response);
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
