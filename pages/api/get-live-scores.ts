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
        // We only need a small, curated list of major leagues for live scores to keep it fast
        const liveLeagueIds = [39, 140, 135, 78, 61, 2, 71, 262]; // Top 5 Europe, Champions League, Brazil, Argentina

        // The 'live' parameter is the key here. We ask the API for all live games in our target leagues.
        const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?live=${liveLeagueIds.join('-')}`;
        
        const response = await axios.get(url, API_OPTIONS);
        const liveFixtures = response.data.response;

        // We only need to send the most important data to the frontend
        const formattedLiveScores = liveFixtures.map((fixture: any) => ({
            id: fixture.fixture.id,
            league: fixture.league.name,
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