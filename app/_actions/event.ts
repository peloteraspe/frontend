"use server"

export async function getAllEvents() {
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/event`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || response.statusText);
        }
        return data;
    } catch (error: any) {
        console.error('Error fetching events:', error.message);
    }
}