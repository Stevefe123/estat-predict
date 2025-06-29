import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const API_OPTIONS = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
    }
};

// --- NEW: Helper function to calculate a team's form score from the last 5 games ---
const calculateFormScore = (formString: string) => {
    if (!formString) return 0;
    let score = 0;
    for (const result of formString) {
        if (result === 'W') score += 3;
        if (result === 'D') score += 1;
    }
    return score;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();
    const season = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
    const todayStr = format(now, 'yyyy-MM-dd');
    console.log(`Starting Dominance & Form scan for: ${todayStr}, season: ${season}`);

    try {
        // --- STAGE 1: Use our curated list of low-scoring leagues ---
        const lowScoringLeagueIds = [
            135, 197, 262, 71, 98, 202, 290, 233, 129, 239, // Core low-scoring
            39, 140, 78, 61, 94, 88, 103, 218, 144, 40, // Major/Other relevant leagues
        ];
        console.log(`Scanning ${lowScoringLeagueIds.length} curated low-scoring leagues.`);

        let fixturesToProcess: any[] = [];
        const fixturePromises = lowScoringLeagueIds.map(id => axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${id}&season=${season}&date=${todayStr}`, API_OPTIONS));
        const fixtureResults = await Promise.allSettled(fixturePromises);
        for (const result of fixtureResults) {
            if (result.status === 'fulfilled' && result.value.data.response) {
                fixturesToProcess.push(...result.value.data.response);
            }
        }
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);

        let allPredictions = [];
        for (const fixture of fixturesToProcess) {
            const homeTeamId = fixture.teams.home.id;
            const awayTeamId = fixture.teams.away.id;

            // --- STAGE 2: H2H Dominance Filter ---
            const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`, API_OPTIONS);
            const h2hGames = h2hResponse.data.response;

            if (h2hGames.length >= 3) { // Need at least 3 games for a meaningful comparison
                let homeWins = 0;
                let awayWins = 0;
                h2hGames.forEach(game => {
                    if (game.teams.home.winner) homeWins++;
                    if (game.teams.away.winner) awayWins++;
                });

                let strongerTeamH2H = null;
                let weakerTeamH2H = null;

                if (homeWins >= awayWins + 2) {
                    strongerTeamH2H = fixture.teams.home;
                    weakerTeamH2H = fixture.teams.away;
                } else if (awayWins >= homeWins + 2) {
                    strongerTeamH2H = fixture.teams.away;
                    weakerTeamH2H = fixture.teams.home;
                }

                // If a dominant team is found, proceed to Stage 3
                if (strongerTeamH2H) {
                    // --- STAGE 3: Current Form Confirmation ---
                    const strongerTeamForm = calculateFormScore(strongerTeamH2H.last_5_games?.form);
                    const weakerTeamForm = calculateFormScore(weakerTeamH2H.last_5_games?.form);

                    if (strongerTeamForm > weakerTeamForm) {
                        // This is a high-quality prediction!
                        allPredictions.push({
                            id: fixture.fixture.id,
                            league: `${fixture.league.name} (${fixture.league.country})`,
                            homeTeam: fixture.teams.home.name,
                            awayTeam: fixture.teams.away.name,
                            // The prediction is now about the winner, not low score
                            prediction: {
                                type: 'WINNER',
                                strongerTeam: strongerTeamH2H.name,
                                weakerTeam: weakerTeamH2H.name,
                            }
                        });
                    }
                }
            }
        }
        
        console.log(`Found ${allPredictions.length} Dominance & Form predictions.`);
        allPredictions.sort((a, b) => a.league.localeCompare(b.league));
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allPredictions }, { onConflict: 'prediction_date' });

        if (error) throw error;
        res.status(200).json({ message: `Success: Cached ${allPredictions.length} predictions.` });

    } catch (error) {
        console.error("Daily Scan Error:", error.message);
        res.status(500).json({ message: 'Error during daily scan.', error: error.message });
    }
}