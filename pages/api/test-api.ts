import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const apiToken = process.env.SPORTMONKS_API_TOKEN;

    // --- DEBUGGING STEP 1: Check if Vercel is even seeing the token ---
    if (!apiToken) {
        console.error("CRITICAL: SPORTMONKS_API_TOKEN is not available in the environment.");
        return res.status(500).json({ error: "API Token not configured on server." });
    }
    console.log("Server has found an API Token.");

    // --- DEBUGGING STEP 2: Make the simplest possible API call ---
    const testUrl = `https://api.sportmonks.com/v3/football/leagues?api_token=${apiToken}`;
    console.log("Attempting to call URL:", testUrl);

    try {
        const response = await axios.get(testUrl);
        console.log("API call successful!");
        // Send back the first league as proof
        res.status(200).json({ success: true, data: response.data.data[0] });
    } catch (error) {
        console.error("--- API TEST FAILED ---");
        // --- DEBUGGING STEP 3: Log the exact error from Sportmonks ---
        console.error("Status:", error.response?.status);
        console.error("Data:", error.response?.data);
        res.status(500).json({ success: false, error: "API call failed.", details: error.response?.data });
    }
}