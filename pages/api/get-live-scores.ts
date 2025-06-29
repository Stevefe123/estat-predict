import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_OPTIONS = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log("--- [get-live-scores] Received a request ---");
    try {
        const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all`;
        
        console.log("Fetching all live games from API-Football...");
        const response = await axios.get(url, API_OPTIONS);
        
        // --- DEBUGGING STEP 1: See the raw response ---
        console.log(`API-Football returned ${response.data.results} results.`);
        // If results > 0, let's log the raw fixture data to see what we got
        if (response.data.results > 0) {
            console.log("Raw fixtures received:", JSON.stringify(response.data.response, null, 2));
        }

        const liveFixtures = response.data.response;

        const formattedLiveScores = liveFixtures.map((fixture: any) => ({
            id: fixture.fixture.id,
            league: `${fixture.league.name} (${fixture.league.country})`,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            goals: fixture.goals,
            elapsed: fixture.fixture.status.elapsed,
        }));

        console.log(`--- [get-live-scores] Successfully processed ${formattedLiveScores.length} games. Sending to client. ---`);
        res.status(200).json(formattedLiveScores);

    } catch (error) {
        console.error("--- [get-live-scores] CRITICAL ERROR ---");
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching live scores.' });
    }
}