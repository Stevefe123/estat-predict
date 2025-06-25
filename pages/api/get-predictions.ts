
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';

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
    // Generate dates: 14 days back to 2 days forward
    const today = new Date();
    const dates = [];
    
    // Add past 14 days
    for (let i = 14; i >= 1; i--) {
        dates.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }
    
    // Add today
    dates.push(format(today, 'yyyy-MM-dd'));
    
    // Add next 2 days
    for (let i = 1; i <= 2; i++) {
        dates.push(format(addDays(today, i), 'yyyy-MM-dd'));
    }

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
        for (const date of dates) {
            for (const leagueId of leagueIds) {
                try {
                    const response = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=2023&date=${date}`, options);
                    const fixtures = response.data.response;

                    for (const fixture of fixtures) {
                        const { isCandidate, weakerTeam } = isLowScoringCandidate(fixture);
                        
                        if (isCandidate) {
                            const matchDate = new Date(fixture.fixture.date);
                            const isCompleted = fixture.fixture.status.short === 'FT';
                            
                            allPredictions.push({
                                id: fixture.fixture.id,
                                date: format(matchDate, 'yyyy-MM-dd'),
                                time: format(matchDate, 'HH:mm'),
                                league: fixture.league.name,
                                homeTeam: fixture.teams.home.name,
                                awayTeam: fixture.teams.away.name,
                                weakerTeam: weakerTeam,
                                status: fixture.fixture.status.short,
                                isCompleted: isCompleted,
                                homeScore: isCompleted ? fixture.goals.home : null,
                                awayScore: isCompleted ? fixture.goals.away : null,
                                totalGoals: isCompleted ? (fixture.goals.home + fixture.goals.away) : null,
                                isPredictionCorrect: isCompleted ? (fixture.goals.home + fixture.goals.away) <= 2 : null
                            });
                        }
                    }
                    
                    // Add delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (apiError: any) {
                    console.error(`API Error for league ${leagueId} on ${date}:`, apiError.response?.data || apiError.message);
                    
                    // If rate limited, skip this request but continue with others
                    if (apiError.response?.status === 429) {
                        console.log('Rate limited - skipping this request');
                        continue;
                    }
                    
                    // For other errors, continue to next request
                    continue;
                }
            }
        }
        
        // Sort by date (newest first for better UX)
        allPredictions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Return available predictions even if some API calls failed
        res.status(200).json(allPredictions);

    } catch (error) {
        console.error('General error:', error);
        res.status(500).json({ message: 'Error fetching data from Football API', predictions: [] });
    }
}
