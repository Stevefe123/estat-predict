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

// Final check on individual team form
const hasLowScoringForm = (fixture: any) => {
    const homeGoals = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
    const awayGoals = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
    return homeGoals < 1.6 || awayGoals < 1.6; // If either team is struggling to score
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const queryDate = req.query.date as string || format(new Date(), 'yyyy-MM-dd');
    const dateToFetch = parseISO(queryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Using the comprehensive global league list
    const leagueIds = [
        39, 140, 135, 78, 61, 94, 88, 197, 203, 253, 262, 71, 103, 218, 144, 40,
        2, 79, 136, 141, 62, 89, 207, 98, 239, 119, 113, 202, 290, 233, 99
    ]; 

    let allGames = [];
    
    try {
        const fixturePromises = leagueIds.map(leagueId =>
            axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2023&date=${queryDate}`, API_OPTIONS)
        );
        const fixtureResults = await Promise.allSettled(fixturePromises);

        let fixturesToProcess = [];
        for (const result of fixtureResults) {
            if (result.status === 'fulfilled') {
                fixturesToProcess.push(...result.value.data.response);
            }
        }

        for (const fixture of fixturesToProcess) {
            let gameData: any = {
                id: fixture.fixture.id,
                league: fixture.league.name,
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
            };

            // Handle past games for scores
            if (dateToFetch < today && fixture.fixture.status.short === 'FT') {
                gameData.score = { home: fixture.score.fulltime.home, away: fixture.score.fulltime.away };
                allGames.push(gameData);
                continue; // Move to the next fixture
            }
            
            // Handle future games for predictions
            if (dateToFetch >= today) {
                // H2H Check (Primary Filter)
                const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${fixture.teams.home.id}-${fixture.teams.away.id}&last=5`, API_OPTIONS);
                const h2hGames = h2hResponse.data.response;

                let isH2HLowScoring = false;
                if (h2hGames.length === 0) {
                    isH2HLowScoring = true; // No data, so we don't disqualify it
                } else {
                    let totalGoals = 0;
                    h2hGames.forEach(game => { totalGoals += game.goals.home + game.goals.away; });
                    const avgH2HGoals = totalGoals / h2hGames.length;
                    if (avgH2HGoals <= 2.5) { // A reasonable threshold
                        isH2HLowScoring = true;
                    }
                }

                // If it passes the H2H check, proceed to the form check
                if (isH2HLowScoring) {
                    if (hasLowScoringForm(fixture)) {
                        let weakerTeam = null;
                        const homeGoalsAvg = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
                        const awayGoalsAvg = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
                        if (homeGoalsAvg < awayGoalsAvg) weakerTeam = fixture.teams.home.name;
                        else if (awayGoalsAvg < homeGoalsAvg) weakerTeam = fixture.teams.away.name;
                        
                        gameData.weakerTeam = weakerTeam;
                        allGames.push(gameData);
                    }
                }
            }
        }
        
        allGames.sort((a, b) => a.league.localeCompare(b.league));
        res.status(200).json(allGames);

    } catch (error) {
        console.error("API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching data.' });
    }
}