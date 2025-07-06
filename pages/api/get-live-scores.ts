import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_OPTIONS = { method: 'GET', headers: { 'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all`;
        const response = await axios.get(url, API_OPTIONS);
        const liveFixtures = response.data.response || [];
        const formattedLiveScores = liveFixtures.map((fixture: any) => ({
            id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
            homeTeam: fixture.teams.home.name, awayTeam: fixture.teams.away.name,
            goals: fixture.goals, elapsed: fixture.fixture.status.elapsed,
        }));
        res.status(200).json(formattedLiveScores);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching live scores.' });
    }
}