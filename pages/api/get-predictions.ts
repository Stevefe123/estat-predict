import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const API_OPTIONS = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
    }
};

// --- STAGE 3: Final check on individual team form ---
const hasLowScoringForm = (fixture: any) => {
    const homeGoals = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '2.0');
    const awayGoals = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '2.0');
    return homeGoals < 1.5 && awayGoals < 1.5; // Stricter rule: both teams must be low-scoring
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const queryDate = req.query.date as string || format(new Date(), 'yyyy-MM-dd');

    // Past dates are not supported by this intensive search, only predictions
    if (parseISO(queryDate) < new Date()) {
        return res.status(200).json([]);
    }
    
    try {
        // --- STAGE 1: Find Low-Scoring Leagues ---
        // Fetch a list of all available leagues
        const leaguesResponse = await axios.get('https://api-football-v1.p.rapidapi.com/v3/leagues?season=2023', API_OPTIONS);
        const allLeagues = leaguesResponse.data.response;
        
        const lowScoringLeagues = [];
        for (const leagueData of allLeagues) {
            // Check if the league is a major one and if its country has coverage
            if (leagueData.league.type === 'League' && leagueData.coverage.fixtures.statistics_fixtures) {
                // Check average goals for the league if available (this is a conceptual check, as API-Football doesn't provide this directly)
                // We'll use a curated list as a more reliable proxy for now, but this structure allows for future improvement.
                // For now, we will use our expanded list. The logic below will filter games from them.
                const leagueIdsToSearch = [39, 140, 135, 78, 61, 94, 88, 197, 203, 253, 262, 71, 103, 218];
                if (leagueIdsToSearch.includes(leagueData.league.id)) {
                    lowScoringLeagues.push(leagueData.league.id);
                }
            }
        }
        
        let highQualityPredictions = [];

        // --- STAGE 2: Find Games with Low-Scoring H2H and Form ---
        for (const leagueId of lowScoringLeagues) {
            const fixturesResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2023&date=${queryDate}`, API_OPTIONS);
            const fixtures = fixturesResponse.data.response;

            for (const fixture of fixtures) {
                const homeTeamId = fixture.teams.home.id;
                const awayTeamId = fixture.teams.away.id;

                // 2a. Check Head-to-Head (H2H)
                const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=5`, API_OPTIONS);
                const h2hGames = h2hResponse.data.response;

                if (h2hGames.length > 0) {
                    let totalGoals = 0;
                    h2hGames.forEach(game => {
                        totalGoals += game.goals.home + game.goals.away;
                    });
                    const avgH2HGoals = totalGoals / h2hGames.length;

                    // If average H2H goals are 2.0 or less, proceed
                    if (avgH2HGoals <= 2.0) {
                        
                        // 2b. Check recent form (STAGE 3)
                        if (hasLowScoringForm(fixture)) {
                            let weakerTeam = null;
                            const homeGoalsAvg = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '2.0');
                            const awayGoalsAvg = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '2.0');

                            if(homeGoalsAvg < awayGoalsAvg) weakerTeam = fixture.teams.home.name;
                            else if (awayGoalsAvg < homeGoalsAvg) weakerTeam = fixture.teams.away.name;

                            highQualityPredictions.push({
                                id: fixture.fixture.id,
                                league: fixture.league.name,
                                homeTeam: fixture.teams.home.name,
                                awayTeam: fixture.teams.away.name,
                                weakerTeam: weakerTeam,
                            });
                        }
                    }
                }
            }
        }

        res.status(200).json(highQualityPredictions);

    } catch (error) {
        console.error("API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching data. The API may be busy or the request limit was reached.' });
    }
}