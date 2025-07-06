import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const buildUrl = (path: string, params: string = '') => {
    return `https://api.sportmonks.com/v3/football/${path}?api_token=${process.env.SPORTMONKS_API_TOKEN}&${params}`;
};

// Helper to count wins from a list of recent games provided by Sportmonks
const countWinsInLatest = (games: any[] = [], teamId: number) => {
    let wins = 0;
    games.forEach(game => {
        const participant = game.participants.find(p => p.id === teamId);
        if (participant && participant.meta.winner === true) {
            wins++;
        }
    });
    return wins;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`[SCAN START] Starting Sportmonks "Form Dominance" scan for: ${todayStr}`);

    try {
        // Fetch all fixtures for today, including the 'latest' games for each participant (team)
        const fixturesUrl = buildUrl('fixtures/date/' + todayStr, 'include=league;participants.latest.scores;participants.latest.participants');
        const response = await axios.get(fixturesUrl);
        const fixturesToProcess = response.data.data || [];
        console.log(`[API SUCCESS] Found ${fixturesToProcess.length} fixtures to analyze.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.participants.find(p => p.meta.location === 'home');
            const awayTeam = fixture.participants.find(p => p.meta.location === 'away');

            if (!homeTeam || !awayTeam || !homeTeam.latest || !awayTeam.latest) continue;

            // --- The Form Dominance Filter ---
            const homeFormWins = countWinsInLatest(homeTeam.latest, homeTeam.id);
            const awayFormWins = countWinsInLatest(awayTeam.latest, awayTeam.id);

            let strongerTeamInForm = null;
            let weakerTeamInForm = null;

            if (homeFormWins >= awayFormWins + 2) {
                strongerTeamInForm = homeTeam;
                weakerTeamInForm = awayTeam;
            } else if (awayFormWins >= homeFormWins + 2) {
                strongerTeamInForm = awayTeam;
                weakerTeamInForm = homeTeam;
            }

            if (strongerTeamInForm) {
                console.log(`[PREDICTION FOUND] ${strongerTeamInForm.name} vs ${weakerTeamInForm.name} is a candidate.`);
                allPredictions.push({
                    id: fixture.id,
                    league: `${fixture.league.name} (${fixture.league.country?.name || ''})`,
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                    prediction: {
                        type: 'LOW_SCORE_WEAKER_TEAM',
                        weakerTeam: weakerTeamInForm.name,
                    }
                });
            }
        }
        
        console.log(`[CACHE] Caching ${allPredictions.length} predictions.`);
        allPredictions.sort((a, b) => a.league.localeCompare(b.league));
        const { error: cacheError } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });

        if (cacheError) throw cacheError;

        console.log('[SCAN SUCCESS] Daily scan completed successfully.');
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("--- [CRITICAL SCAN ERROR] ---");
        const errorMessage = error.response?.data?.message || error.message;
        console.error("Error Message:", errorMessage);
        res.status(500).json({ message: 'Error during daily scan.', error: errorMessage });
    }
}