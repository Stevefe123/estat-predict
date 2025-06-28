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

const hasLowScoringForm = (fixture: any) => {
    const homeGoals = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
    const awayGoals = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
    return homeGoals < 1.6 || awayGoals < 1.6;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const queryDate = req.query.date as string || format(new Date(), 'yyyy-MM-dd');
    const dateToFetch = parseISO(queryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // --- STEP 1: FETCH ALL CURRENTLY ACTIVE LEAGUES ---
        console.log("Fetching all active leagues from API-Football...");
        const leaguesResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/leagues?season=2023¤t=true`, API_OPTIONS);
        const activeLeagues = leaguesResponse.data.response;
        const leagueIdsToSearch = activeLeagues.map(leagueData => leagueData.league.id);
        console.log(`Found ${leagueIdsToSearch.length} active leagues to scan.`);

        // --- STEP 2: FETCH ALL FIXTURES FROM THOSE LEAGUES ---
        let fixturesToProcess: any[] = [];
        const fixturePromises = leagueIdsToSearch.map(leagueId =>
            axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2023&date=${queryDate}`, API_OPTIONS)
        );
        const fixtureResults = await Promise.allSettled(fixturePromises);

        for (const result of fixtureResults) {
            if (result.status === 'fulfilled' && result.value.data.response) {
                fixturesToProcess.push(...result.value.data.response);
            }
        }
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze globally.`);

        // --- STEP 3: RUN THE COMPREHENSIVE FILTER ---
        let allGames = [];
        for (const fixture of fixturesToProcess) {
            let gameData: any = {
                id: fixture.fixture.id,
                league: `${fixture.league.name} (${fixture.league.country})`, // Add country for clarity
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
            };

            if (dateToFetch < today && fixture.fixture.status.short === 'FT') {
                gameData.score = { home: fixture.score.fulltime.home, away: fixture.score.fulltime.away };
                allGames.push(gameData);
                continue;
            }
            
            if (dateToFetch >= today) {
                const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${fixture.teams.home.id}-${fixture.teams.away.id}&last=5`, API_OPTIONS);
                const h2hGames = h2hResponse.data.response;
                const avgH2HGoals = h2hGames.length > 0 ? h2hGames.reduce((sum, game) => sum + game.goals.home + game.goals.away, 0) / h2hGames.length : 99;
                
                const individualTeamFormIsLow = hasLowScoringForm(fixture);
                
                if (avgH2HGoals <= 2.5 || individualTeamFormIsLow) {
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
        
        allGames.sort((a, b) => a.league.localeCompare(b.league));
        console.log(`Finished analysis. Found ${allGames.length} high-quality predictions globally.`);
        res.status(200).json(allGames);

    } catch (error) {
        console.error("API Error:", error);
        // Provide a more user-friendly error message
        const errorMessage = error.response?.data?.message || 'Error fetching data. The API may be busy or the request limit was reached.';
        res.status(500).json({ message: errorMessage });
    }
}