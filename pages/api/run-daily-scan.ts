import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const API_OPTIONS = { method: 'GET', headers: { 'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' } };

const countWinsInForm = (formString: string = '') => (formString.match(/W/g) || []).length;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`[SCAN START] Starting "The Gauntlet" scan for: ${todayStr}`);

    try {
        const fixturesUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${todayStr}`;
        const response = await axios.get(fixturesUrl, API_OPTIONS);
        const fixturesToProcess = response.data.response || [];
        console.log(`[INFO] Found ${fixturesToProcess.length} total fixtures globally.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.teams.home;
            const awayTeam = fixture.teams.away;
            
            // --- START OF ANALYSIS FOR ONE GAME ---
            console.log(`\n--- Analyzing: ${homeTeam.name} vs ${awayTeam.name} (ID: ${fixture.fixture.id}) ---`);

            if (!homeTeam.last_5_games?.form || !awayTeam.last_5_games?.form) {
                console.log("[FILTERED] Reason: Missing form data for one or both teams.");
                continue;
            }

            // --- STAGE 1: Form Dominance Filter ---
            const homeFormWins = countWinsInForm(homeTeam.last_5_games.form);
            const awayFormWins = countWinsInForm(awayTeam.last_5_games.form);
            console.log(`[FORM CHECK] Home Wins (Last 5): ${homeFormWins}, Away Wins (Last 5): ${awayFormWins}`);

            let strongerTeamInForm = null;
            let weakerTeamInForm = null;
            if (homeFormWins >= awayFormWins + 2) {
                strongerTeamInForm = homeTeam;
                weakerTeamInForm = awayTeam;
                console.log(`[FORM CHECK] PASS. Stronger team on form: ${homeTeam.name}`);
            } else if (awayFormWins >= homeFormWins + 2) {
                strongerTeamInForm = awayTeam;
                weakerTeamInForm = homeTeam;
                console.log(`[FORM CHECK] PASS. Stronger team on form: ${awayTeam.name}`);
            } else {
                console.log("[FILTERED] Reason: Neither team has 2+ more wins in recent form.");
                continue; // Skip to the next game
            }

            // --- STAGE 2: H2H Dominance Filter ---
            const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}`, API_OPTIONS);
            const h2hGames = h2hResponse.data.response;

            if (h2hGames.length < 3) {
                console.log(`[FILTERED] Reason: Not enough H2H games (${h2hGames.length}). Need at least 3.`);
                continue;
            }

            let strongerTeamH2HWins = 0;
            let weakerTeamH2HWins = 0;
            h2hGames.forEach(game => {
                if (game.teams.home.id === strongerTeamInForm.id && game.teams.home.winner) strongerTeamH2HWins++;
                if (game.teams.away.id === strongerTeamInForm.id && game.teams.away.winner) strongerTeamH2HWins++;
                if (game.teams.home.id === weakerTeamInForm.id && game.teams.home.winner) weakerTeamH2HWins++;
                if (game.teams.away.id === weakerTeamInForm.id && game.teams.away.winner) weakerTeamH2HWins++;
            });
            console.log(`[H2H CHECK] Stronger Team H2H Wins: ${strongerTeamH2HWins}, Weaker Team H2H Wins: ${weakerTeamH2HWins}`);

            if (strongerTeamH2HWins >= weakerTeamH2HWins + 2) {
                console.log("[H2H CHECK] PASS. The in-form team is also dominant in H2H.");
                // --- STAGE 3: Final Prediction ---
                const homeGoalsAvg = parseFloat(homeTeam.last_5_games?.goals?.for?.average || '99');
                const awayGoalsAvg = parseFloat(awayTeam.last_5_games?.goals?.for?.average || '99');
                let weakerOffensiveTeamName = (homeGoalsAvg < awayGoalsAvg) ? homeTeam.name : awayTeam.name;

                console.log(`[SUCCESS] Game passed all filters! Adding to predictions. Weaker offensive team: ${weakerOffensiveTeamName}`);
                allPredictions.push({
                    id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
                    homeTeam: homeTeam.name, awayTeam: awayTeam.name,
                    prediction: { type: 'LOW_SCORE_WEAKER_TEAM', weakerTeam: weakerOffensiveTeamName }
                });
            } else {
                console.log("[FILTERED] Reason: The in-form team is NOT dominant enough in H2H.");
            }
        }
        
        console.log(`\n[CACHE] Caching ${allPredictions.length} final "Gauntlet" predictions.`);
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });
        if (error) throw error;
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("--- [CRITICAL SCAN ERROR] ---");
        const errorMessage = error.response?.data?.message || error.message;
        console.error("Error Message:", errorMessage);
        res.status(500).json({ message: 'Error during daily scan.', error: errorMessage });
    }
}