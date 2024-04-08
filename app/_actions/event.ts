"use server"

export async function getAllEvents() {
    console.log('Process.env.BACKEND_URL:', `${process.env.BACKEND_URL}/event`)
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/event`);
        console.log('Response:', response)
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || response.statusText);
        }
        return data;
    } catch (error: any) {
        console.log(error)
        console.error('Error fetching events:', error.message);
    }
}