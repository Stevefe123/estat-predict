import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const buildUrl = (path: string, params: string = '') => {
    return `https://api.sportmonks.com/v3/football/${path}?api_token=${process.env.SPORTMONKS_API_TOKEN}&${params}`;
};

const calculateGoalAverage = (games: any[], teamId: string) => {
    if (!games || games.length === 0) return 99;
    let totalGoals = 0;
    games.forEach(game => {
        const participant = game.participants?.find(p => p.team_id === teamId);
        if (participant) {
            const score = game.scores?.find(s => s.participant_id === participant.id && s.description === 'CURRENT');
            if (score) {
                totalGoals += score.score.goals;
            }
        }
    });
    return games.length > 0 ? totalGoals / games.length : 99;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`[SCAN START] Starting scan for: ${todayStr}`);

    try {
        const fixturesUrl = buildUrl('fixtures/date/' + todayStr, 'include=league;participants.team;latest.participant;latest.scores');
        console.log(`[API CALL] Fetching fixtures from: ${fixturesUrl}`);
        const response = await axios.get(fixturesUrl);
        const fixturesToProcess = response.data.data || [];
        console.log(`[API SUCCESS] Found ${fixturesToProcess.length} fixtures.`);

        let allPredictions = [];
        for (const [index, fixture] of fixturesToProcess.entries()) {
            console.log(`[PROCESSING ${index + 1}/${fixturesToProcess.length}] Analyzing fixture ID: ${fixture.id}`);
            
            const homeTeam = fixture.participants.find(p => p.meta.location === 'home');
            const awayTeam = fixture.participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam || !homeTeam.team || !awayTeam.team) {
                console.log(`[SKIP] Fixture ${fixture.id} is missing team data.`);
                continue;
            }

            const homeGoalsAvg = calculateGoalAverage(homeTeam.team.latest, homeTeam.id);
            const awayGoalsAvg = calculateGoalAverage(awayTeam.team.latest, awayTeam.id);
            console.log(`[STATS] ${homeTeam.name} (Avg Goals: ${homeGoalsAvg.toFixed(2)}) vs ${awayTeam.name} (Avg Goals: ${awayGoalsAvg.toFixed(2)})`);

            if (homeGoalsAvg < 1.5 || awayGoalsAvg < 1.5) {
                let weakerTeam = null;
                if (homeGoalsAvg < awayGoalsAvg) weakerTeam = homeTeam.name;
                else if (awayGoalsAvg < homeGoalsAvg) weakerTeam = awayTeam.name;

                if (weakerTeam) {
                    console.log(`[PREDICTION FOUND] Match ID ${fixture.id} is a candidate.`);
                    allPredictions.push({
                        id: fixture.id,
                        league: `${fixture.league.name} (${fixture.league.country?.name || ''})`,
                        homeTeam: homeTeam.name,
                        awayTeam: awayTeam.name,
                        prediction: { type: 'LOW_SCORE_WEAKER_TEAM', weakerTeam: weakerTeam }
                    });
                }
            }
        }
        
        console.log(`[CACHE] Caching ${allPredictions.length} predictions.`);
        allPredictions.sort((a, b) => a.league.localeCompare(b.league));
        const { error: cacheError } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });

        if (cacheError) {
            console.error('[CACHE ERROR]', cacheError);
            throw new Error('Failed to save predictions to cache.');
        }

        console.log('[SCAN SUCCESS] Daily scan completed successfully.');
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("--- [CRITICAL SCAN ERROR] ---");
        // Log the specific part of the error that is most useful
        const errorMessage = error.response?.data?.message || error.message;
        console.error("Error Message:", errorMessage);
        res.status(500).json({ message: 'Error during daily scan.', error: errorMessage });
    }
}