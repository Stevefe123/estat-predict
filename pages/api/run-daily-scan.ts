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
    console.log(`Starting Final Combined scan for: ${todayStr}, season: ${season}`);

    try {
        const lowScoringLeagueIds = [
    // --- NEW: International Tournaments ---
    1,   // World Cup
    4,   // Euro Championship
    9,   // Copa America
    
    // Core low-scoring leagues
    135, 197, 262, 71, 98, 202, 290, 233, 129, 239, 119, 113,
    
    // Major/Other relevant leagues
    39, 140, 78, 61, 94, 88, 103, 218, 144, 40,
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
                        // Game passes all filters! Now, determine the weaker OFFENSIVE team for the prediction text.
                        const homeGoalsAvg = parseFloat(homeTeam.last_5_games?.goals?.for?.average || '99');
                        const awayGoalsAvg = parseFloat(awayTeam.last_5_games?.goals?.for?.average || '99');
                        
                        let weakerOffensiveTeamName = null;
                        if (homeGoalsAvg < awayGoalsAvg) {
                            weakerOffensiveTeamName = homeTeam.name;
                        } else if (awayGoalsAvg < homeGoalsAvg) {
                            weakerOffensiveTeamName = awayTeam.name;
                        } else {
                            // If scoring form is equal, we can default to the team with weaker H2H as the "weaker" team
                            weakerOffensiveTeamName = weakerTeamH2H.name;
                        }

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