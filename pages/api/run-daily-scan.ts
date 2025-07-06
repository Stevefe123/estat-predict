import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const countWinsInForm = (formString: string = '') => (formString.match(/W/g) || []).length;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`[SCAN START] Starting "The Gauntlet" scan for: ${todayStr}`);

    // --- DEBUGGING STEP 1: Verify the API Key exists in the environment ---
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
        const errorMsg = "CRITICAL: FOOTBALL_API_KEY is MISSING from Vercel Environment Variables.";
        console.error(errorMsg);
        return res.status(500).json({ message: "Server configuration error.", error: errorMsg });
    }
    // Log a masked version of the key to confirm it's loaded
    console.log(`[INFO] API Key loaded. Starts with: ${apiKey.substring(0, 4)}... Ends with: ${apiKey.slice(-4)}`);

    const API_OPTIONS = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey, // Use the verified key
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
    };

    try {
        const fixturesUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${todayStr}`;
        console.log(`[API CALL] Calling: ${fixturesUrl}`);
        const response = await axios.get(fixturesUrl, API_OPTIONS);
        const fixturesToProcess = response.data.response || [];
        console.log(`[API SUCCESS] Found ${fixturesToProcess.length} fixtures globally.`);

        // ... (The rest of your "Gauntlet" logic remains the same)
        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.teams.home;
            const awayTeam = fixture.teams.away;
            if (!homeTeam.last_5_games?.form || !awayTeam.last_5_games?.form) continue;
            const homeFormWins = countWinsInForm(homeTeam.last_5_games.form);
            const awayFormWins = countWinsInForm(awayTeam.last_5_games.form);
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
                const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}`, API_OPTIONS);
                const h2hGames = h2hResponse.data.response;
                if (h2hGames.length >= 3) {
                    let strongerTeamH2HWins = 0;
                    let weakerTeamH2HWins = 0;
                    h2hGames.forEach(game => {
                        if (game.teams.home.id === strongerTeamInForm.id && game.teams.home.winner) strongerTeamH2HWins++;
                        if (game.teams.away.id === strongerTeamInForm.id && game.teams.away.winner) strongerTeamH2HWins++;
                        if (game.teams.home.id === weakerTeamInForm.id && game.teams.home.winner) weakerTeamH2HWins++;
                        if (game.teams.away.id === weakerTeamInForm.id && game.teams.away.winner) weakerTeamH2HWins++;
                    });
                    if (strongerTeamH2HWins >= weakerTeamH2HWins + 2) {
                        const homeGoalsAvg = parseFloat(homeTeam.last_5_games?.goals?.for?.average || '99');
                        const awayGoalsAvg = parseFloat(awayTeam.last_5_games?.goals?.for?.average || '99');
                        let weakerOffensiveTeamName = (homeGoalsAvg < awayGoalsAvg) ? homeTeam.name : awayTeam.name;
                        allPredictions.push({
                            id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
                            homeTeam: homeTeam.name, awayTeam: awayTeam.name,
                            prediction: { type: 'LOW_SCORE_WEAKER_TEAM', weakerTeam: weakerOffensiveTeamName }
                        });
                    }
                }
            }
        }
        
        console.log(`[CACHE] Caching ${allPredictions.length} final "Gauntlet" predictions.`);
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