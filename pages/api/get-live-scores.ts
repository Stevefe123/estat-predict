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
    try {
        // --- NEW, MORE POWERFUL METHOD ---
        // Use the 'live=all' parameter to get every single live game the API is tracking.
        // This is the most reliable way to ensure no live game is missed.
        const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all`;
        
        console.log("Fetching all live games...");
        const response = await axios.get(url, API_OPTIONS);
        const liveFixtures = response.data.response;
        console.log(`Found ${liveFixtures.length} live games globally.`);

        // We only need to send the most important data to the frontend
        const formattedLiveScores = liveFixtures.map((fixture: any) => ({
            id: fixture.fixture.id,
            league: `${fixture.league.name} (${fixture.league.country})`, // Add country for clarity
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            goals: fixture.goals,
            elapsed: fixture.fixture.status.elapsed, // The current minute of the match
        }));

        res.status(200).json(formattedLiveScores);

    } catch (error) {
        console.error("Live Score API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching live scores.' });
    }
}