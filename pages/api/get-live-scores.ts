import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const buildUrl = (path: string, params: string = '') => {
    return `https://api.sportmonks.com/v3/football/${path}?api_token=${process.env.SPORTMONKS_API_TOKEN}&${params}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const url = buildUrl('livescores/inplay', 'include=league;participants;scores');
        const response = await axios.get(url);
        const liveFixtures = response.data.data || [];

        const formattedLiveScores = liveFixtures.map((fixture: any) => {
            const homeTeam = fixture.participants.find(p => p.meta.location === 'home');
            const awayTeam = fixture.participants.find(p => p.meta.location === 'away');
            const scoreInfo = fixture.scores.find(s => s.description === 'CURRENT');
            
            return {
                id: fixture.id,
                league: fixture.league.name,
                homeTeam: homeTeam?.name || 'N/A',
                awayTeam: awayTeam?.name || 'N/A',
                goals: { home: scoreInfo?.score.goals || 0, away: scoreInfo?.score.goals || 0 },
                elapsed: fixture.state.name,
            };
        });

        res.status(200).json(formattedLiveScores);
    } catch (error) {
        console.error("Live Score API Error:", error.response?.data || error.message);
        res.status(500).json({ message: 'Error fetching live scores.' });
    }
}