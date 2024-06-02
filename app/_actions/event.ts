"use server";

export async function getAllEvents() {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event`);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    console.error("Error fetching events:", error.message);
  }
}

export async function getAdminNameByEvent(eventId: string) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL}/event/user/${eventId}`
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    console.error("Error fetching events:", error.message);
  }
}

export async function getEventById(eventId: string) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/event/${eventId}`);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    console.error("Error fetching events:", error.message);
  }
}

export async function getEventsByUser(userId: string) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL}/event/up-past/${userId}`
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } catch (error: any) {
    console.error("Error fetching events:", error.message);
  }
}
