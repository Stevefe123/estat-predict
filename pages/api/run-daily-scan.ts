import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

// Helper to build the Sportmonks API URL
const buildUrl = (path: string, params: string = '') => {
    return `https://api.sportmonks.com/v3/football/${path}?api_token=${process.env.SPORTMONKS_API_TOKEN}&${params}`;
};

// Helper to get team stats
const getTeamForm = async (teamId: string, seasonId: string) => {
    try {
        const url = buildUrl(`teams/${teamId}`, `include=latest.events`);
        const response = await axios.get(url);
        const latestGames = response.data.data.latest?.filter(game => game.season_id === seasonId) || [];
        
        if (latestGames.length === 0) return { goalsAvg: 99 };

        const totalGoals = latestGames.reduce((sum, game) => {
            const event = game.events.find(e => e.team_id === teamId);
            return sum + (event?.value || 0);
        }, 0);

        return { goalsAvg: totalGoals / latestGames.length };
    } catch (error) {
        console.error(`Failed to get form for team ${teamId}`);
        return { goalsAvg: 99 };
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`Starting daily scan for: ${todayStr} using Sportmonks`);

    try {
        // Sportmonks free plan has access to a specific set of leagues. We will query for today's games across all of them.
        const fixturesUrl = buildUrl('fixtures/date/' + todayStr, 'include=league;participants');
        const response = await axios.get(fixturesUrl);
        const fixturesToProcess = response.data.data || [];
        
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.participants.find(p => p.meta.location === 'home');
            const awayTeam = fixture.participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam) continue;

            // Get form for both teams
            const homeForm = await getTeamForm(homeTeam.id, fixture.season_id);
            const awayForm = await getTeamForm(awayTeam.id, fixture.season_id);

            // The core "low-score" filter
            if (homeForm.goalsAvg < 1.5 || awayForm.goalsAvg < 1.5) {
                let weakerTeam = null;
                if (homeForm.goalsAvg < awayForm.goalsAvg) {
                    weakerTeam = homeTeam.name;
                } else if (awayForm.goalsAvg < homeForm.goalsAvg) {
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