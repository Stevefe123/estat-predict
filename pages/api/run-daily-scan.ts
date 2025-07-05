import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const buildUrl = (path: string, params: string = '') => {
    return `https://api.sportmonks.com/v3/football/${path}?api_token=${process.env.SPORTMONKS_API_TOKEN}&${params}`;
};

// Helper to calculate goal average from a list of recent games
const calculateGoalAverage = (games: any[], teamId: string) => {
    if (!games || games.length === 0) return 99;
    const totalGoals = games.reduce((sum, game) => {
        const participant = game.participants.find(p => p.id === teamId);
        // Sportmonks sometimes has score in different places, we check for it
        const score = game.scores.find(s => s.participant_id === participant.id && s.description === 'CURRENT');
        return sum + (score?.score?.goals || 0);
    }, 0);
    return totalGoals / games.length;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`Starting STABLE daily scan for: ${todayStr} using Sportmonks`);

    try {
        // Fetch all fixtures for today, and include the recent form directly in the call
        const fixturesUrl = buildUrl('fixtures/date/' + todayStr, 'include=league;participants.team;latest.participant');
        const response = await axios.get(fixturesUrl);
        const fixturesToProcess = response.data.data || [];
        
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.participants.find(p => p.meta.location === 'home');
            const awayTeam = fixture.participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam || !homeTeam.team || !awayTeam.team) continue;

            // Use the 'latest' games included in the API response
            const homeGoalsAvg = calculateGoalAverage(homeTeam.team.latest, homeTeam.id);
            const awayGoalsAvg = calculateGoalAverage(awayTeam.team.latest, awayTeam.id);

            // The core "low-score" filter
            if (homeGoalsAvg < 1.5 || awayGoalsAvg < 1.5) {
                let weakerTeam = null;
                if (homeGoalsAvg < awayGoalsAvg) {
                    weakerTeam = homeTeam.name;
                } else if (awayGoalsAvg < homeGoalsAvg) {
                    weakerTeam = awayTeam.name;
                }

                if (weakerTeam) {
                    allPredictions.push({
                        id: fixture.id,
                        league: `${fixture.league.name} (${fixture.league.country?.name || ''})`,
                        homeTeam: homeTeam.name,
                        awayTeam: awayTeam.name,
                        prediction: {
                            type: 'LOW_SCORE_WEAKER_TEAM',
                            weakerTeam: weakerTeam,
                        }
                    });
                }
            }
        }
        
        console.log(`Found ${allPredictions.length} Low-Score predictions.`);
        allPredictions.sort((a, b) => a.league.localeCompare(b.league));
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });

        if (error) throw error;
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("Daily Scan Error:", error.response?.data || error.message);
        res.status(500).json({ message: 'Error during daily scan.' });
    }
}