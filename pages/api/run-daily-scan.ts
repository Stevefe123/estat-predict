import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const footballApiOptions = { method: 'GET', headers: { 'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' } };

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

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`[SCAN START] Starting Dual-Model scan for: ${todayStr}`);

    let allPredictions = [];

    try {
        // --- DATA GATHERING ---
        // Get all fixtures from API-Football
        const fixturesUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${todayStr}`;
        const fixturesResponse = await axios.get(fixturesUrl, footballApiOptions);
        const allFixtures = fixturesResponse.data.response || [];
        console.log(`Found ${allFixtures.length} fixtures from API-Football.`);

        // Get all odds from The Odds API (Note: free plan is limited to a few leagues)
        const oddsResponse = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer/odds/?regions=eu,uk,us,au&markets=h2h&oddsFormat=decimal&date=${todayStr}&apiKey=${process.env.ODDS_API_KEY}`);
        const oddsFixtures = oddsResponse.data || [];
        console.log(`Found ${oddsFixtures.length} fixtures from The Odds API.`);

        // --- ANALYSIS LOOP ---
        for (const fixture of allFixtures) {
            const homeTeam = fixture.teams.home;
            const awayTeam = fixture.teams.away;

            // --- CATEGORY A: "HEAVY FAVORITE" (DOUBLE CHANCE) MODEL ---
            const correspondingOdds = oddsFixtures.find(o => o.home_team.includes(homeTeam.name) || o.away_team.includes(awayTeam.name));
            if (correspondingOdds) {
                const bookmaker = correspondingOdds.bookmakers[0];
                if (bookmaker) {
                    const prices = bookmaker.markets[0].outcomes;
                    const odds = {
                        home: prices.find(p => p.name === homeTeam.name)?.price,
                        away: prices.find(p => p.name === awayTeam.name)?.price,
                        draw: prices.find(p => p.name === 'Draw')?.price,
                    };

                    if (odds.home && odds.draw && odds.away) {
                        const dc1X = (odds.home * odds.draw) / (odds.home + odds.draw);
                        const dcX2 = (odds.away * odds.draw) / (odds.away + odds.draw);

                        let strongerTeam = null;
                        let doubleChanceType = null;
                        if (dc1X <= 1.10) { strongerTeam = homeTeam; doubleChanceType = '1x'; }
                        else if (dcX2 <= 1.10) { strongerTeam = awayTeam; doubleChanceType = '2x'; }

                        if (strongerTeam) {
                            // Found a heavy favorite, now check form and H2H
                            const weakerTeam = (strongerTeam.id === homeTeam.id) ? awayTeam : homeTeam;
                            const strongerForm = calculateFormScore(strongerTeam.last_5_games?.form);
                            const weakerForm = calculateFormScore(weakerTeam.last_5_games?.form);

                            if (strongerForm > weakerForm) {
                                const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}`, footballApiOptions);
                                const h2hGames = h2hResponse.data.response;
                                if (h2hGames.length > 0) {
                                    let strongerWins = 0, weakerWins = 0;
                                    h2hGames.forEach(g => {
                                        if (g.teams.home.id === strongerTeam.id && g.teams.home.winner) strongerWins++;
                                        if (g.teams.away.id === strongerTeam.id && g.teams.away.winner) strongerWins++;
                                        if (g.teams.home.id === weakerTeam.id && g.teams.home.winner) weakerWins++;
                                        if (g.teams.away.id === weakerTeam.id && g.teams.away.winner) weakerWins++;
                                    });
                                    if (strongerWins > weakerWins) {
                                        allPredictions.push({
                                            id: `${fixture.fixture.id}-A`,
                                            league: `${fixture.league.name} (${fixture.league.country})`,
                                            homeTeam: homeTeam.name, awayTeam: awayTeam.name,
                                            prediction: { type: 'DOUBLE_CHANCE', strongerTeam: strongerTeam.name, value: doubleChanceType }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // --- CATEGORY B: "LOW-SCORE DOMINANCE" MODEL ---
            // This is a simplified version for demonstration
            const homeGoalsAvg = parseFloat(homeTeam.last_5_games?.goals?.for?.average || '99');
            const awayGoalsAvg = parseFloat(awayTeam.last_5_games?.goals?.for?.average || '99');
            if (homeGoalsAvg < 2.0 && awayGoalsAvg < 2.0) { // Check if it's a low-scoring environment
                const homeForm = calculateFormScore(homeTeam.last_5_games?.form);
                const awayForm = calculateFormScore(awayTeam.last_5_games?.form);
                if (homeForm !== awayForm) {
                    const strongerFormTeam = (homeForm > awayForm) ? homeTeam : awayTeam;
                    const weakerFormTeam = (homeForm > awayForm) ? awayTeam : homeTeam;
                    // Simplified H2H check
                    allPredictions.push({
                        id: `${fixture.fixture.id}-B`,
                        league: `${fixture.league.name} (${fixture.league.country})`,
                        homeTeam: homeTeam.name, awayTeam: awayTeam.name,
                        prediction: { type: 'LOW_SCORE_WEAKER_TEAM', weakerTeam: weakerFormTeam.name }
                    });
                }
            }
        }
        
        console.log(`[CACHE] Caching a total of ${allPredictions.length} predictions.`);
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });
        if (error) throw error;
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("--- [CRITICAL SCAN ERROR] ---", error.message);
        res.status(500).json({ message: 'Error during daily scan.', error: error.message });
    }
}