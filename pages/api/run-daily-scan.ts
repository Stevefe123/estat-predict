import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const API_OPTIONS = { method: 'GET', headers: { 'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' } };

const calculateFormScore = (formString: string = '') => {
    let score = 0;
    for (const result of formString) {
        if (result === 'W') score += 3;
        if (result === 'D') score += 1;
    }
    return score;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) { return res.status(401).json({ message: 'Unauthorized' }); }

    // Get today's date in the correct YYYY-MM-DD format. This is all we need.
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`Starting scan for all fixtures on date: ${todayStr}`);

    try {
        // --- THE CORRECTED API CALL ---
        // We ask for all fixtures on a specific date. The API will find the correct leagues and seasons.
        const fixturesUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${todayStr}`;
        const response = await axios.get(fixturesUrl, API_OPTIONS);
        const fixturesToProcess = response.data.response || [];
        
        console.log(`Found ${fixturesToProcess.length} total fixtures globally to analyze.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeam = fixture.teams.home;
            const awayTeam = fixture.teams.away;

            // Stage 1: H2H Dominance
            const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}`, API_OPTIONS);
            const h2hGames = h2hResponse.data.response;

            if (h2hGames.length >= 3) {
                let homeWins = 0;
                let awayWins = 0;
                h2hGames.forEach(game => {
                    if (game.teams.home.winner) homeWins++;
                    if (game.teams.away.winner) awayWins++;
                });

                let strongerTeamH2H = null;
                let weakerTeamH2H = null;
                if (homeWins >= awayWins + 2) {
                    strongerTeamH2H = homeTeam;
                    weakerTeamH2H = awayTeam;
                } else if (awayWins >= homeWins + 2) {
                    strongerTeamH2H = awayTeam;
                    weakerTeamH2H = homeTeam;
                }

                if (strongerTeamH2H) {
                    // Stage 2: Current Form Confirmation
                    const strongerTeamForm = calculateFormScore(strongerTeamH2H.last_5_games?.form);
                    const weakerTeamForm = calculateFormScore(weakerTeamH2H.last_5_games?.form);

                    if (strongerTeamForm > weakerTeamForm) {
                        const homeGoalsAvg = parseFloat(homeTeam.last_5_games?.goals?.for?.average || '99');
                        const awayGoalsAvg = parseFloat(awayTeam.last_5_games?.goals?.for?.average || '99');
                        
                        let weakerOffensiveTeamName = (homeGoalsAvg < awayGoalsAvg) ? homeTeam.name : awayTeam.name;

                        allPredictions.push({
                            id: fixture.fixture.id,
                            league: `${fixture.league.name} (${fixture.league.country})`,
                            homeTeam: homeTeam.name,
                            awayTeam: awayTeam.name,
                            prediction: {
                                type: 'LOW_SCORE_WEAKER_TEAM',
                                weakerTeam: weakerOffensiveTeamName,
                            }
                        });
                    }
                }
            }
        }
        
        console.log(`Found ${allPredictions.length} final predictions.`);
        allPredictions.sort((a, b) => a.league.localeCompare(b.league));
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });

        if (error) throw error;
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("Daily Scan Error:", error.message);
        res.status(500).json({ message: 'Error during daily scan.', error: error.message });
    }
}