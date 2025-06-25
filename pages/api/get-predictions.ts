import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format } from 'date-fns';

// This is our simple prediction algorithm.
// It checks if a game is a good candidate for "low score".
const isLowScoringCandidate = (fixture: any) => {
    // We need stats for both teams to make a decision
    if (!fixture.teams.home.last_5_games || !fixture.teams.away.last_5_games) {
        return { isCandidate: false };
    }

    // Rule 1: At least one team must have a poor attack.
    // Let's say "poor attack" means averaging less than 1.2 goals per game.
    const homeGoals = fixture.teams.home.last_5_games.goals.for.average;
    const awayGoals = fixture.teams.away.last_5_games.goals.for.average;

    if (parseFloat(homeGoals) > 1.2 && parseFloat(awayGoals) > 1.2) {
        return { isCandidate: false }; // Both teams score too much
    }

    // Rule 2: At least one team must have a decent defense.
    // Let's say "decent defense" is conceding less than 1.4 goals per game.
    const homeConceded = fixture.teams.home.last_5_games.goals.against.average;
    const awayConceded = fixture.teams.away.last_5_games.goals.against.average;
    
    if (parseFloat(homeConceded) > 1.4 && parseFloat(awayConceded) > 1.4) {
        return { isCandidate: false }; // Both teams have leaky defenses
    }
    
    // If a game passes these rules, it's a candidate!
    // Now, let's identify the weaker team (the one with the worse attack).
    let weakerTeam = null;
    if (parseFloat(homeGoals) < parseFloat(awayGoals)) {
        weakerTeam = fixture.teams.home.name;
    } else if (parseFloat(awayGoals) < parseFloat(homeGoals)) {
        weakerTeam = fixture.teams.away.name;
    }
    // If goals are equal, we don't highlight a weaker team.

    return { isCandidate: true, weakerTeam };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Get today's date in YYYY-MM-DD format
    const today = format(new Date(), 'yyyy-MM-dd');

    // These are some league IDs for popular low-scoring leagues.
    // 135 = Italian Serie A, 140 = Spanish La Liga, 88 = Dutch Eredivisie, 78 = German Bundesliga
    const leagueIds = [135, 140, 88, 78]; 

    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
    };
    
    let allPredictions = [];

    try {
        for (const leagueId of leagueIds) {
            const response = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2023&date=${today}`, options);
            const fixtures = response.data.response;

            for (const fixture of fixtures) {
                const { isCandidate, weakerTeam } = isLowScoringCandidate(fixture);
                
                if (isCandidate) {
                    allPredictions.push({
                        id: fixture.fixture.id,
                        league: fixture.league.name,
                        homeTeam: fixture.teams.home.name,
                        awayTeam: fixture.teams.away.name,
                        weakerTeam: weakerTeam,
                    });
                }
            }
        }
        
        res.status(200).json(allPredictions);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching data from Football API' });
    }
}