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

const hasLowScoringForm = (fixture: any) => {
    const homeGoals = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
    const awayGoals = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
    return homeGoals < 1.6 || awayGoals < 1.6;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // --- NEW: DYNAMIC SEASON LOGIC ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
    // If it's July or earlier, the main season is the previous year (e.g., Jan 2025 is part of 2024 season)
    // If it's August or later, the main season is the current year.
    const season = currentMonth < 7 ? currentYear - 1 : currentYear;
    
    const todayStr = format(now, 'yyyy-MM-dd');
    console.log(`Starting daily scan for: ${todayStr} using season: ${season}`);

    try {
        const leaguesResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/leagues?season=${season}¤t=true`, API_OPTIONS);
        const leagueIdsToSearch = leaguesResponse.data.response.map(l => l.league.id);
        console.log(`Found ${leagueIdsToSearch.length} active leagues for season ${season}.`);

        let fixturesToProcess: any[] = [];
        const fixturePromises = leagueIdsToSearch.map(id => axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${id}&season=${season}&date=${todayStr}`, API_OPTIONS));
        const fixtureResults = await Promise.allSettled(fixturePromises);
        
        for (const result of fixtureResults) {
            if (result.status === 'fulfilled' && result.value.data.response) {
                fixturesToProcess.push(...result.value.data.response);
            }
        }
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);

        let allGames = [];
        for (const fixture of fixturesToProcess) {
            const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${fixture.teams.home.id}-${fixture.teams.away.id}&last=5`, API_OPTIONS);
            const h2hGames = h2hResponse.data.response;
            const avgH2HGoals = h2hGames.length > 0 ? h2hGames.reduce((sum, game) => sum + game.goals.home + game.goals.away, 0) / h2hGames.length : 99;
            
            if (avgH2HGoals <= 2.5 || hasLowScoringForm(fixture)) {
                 let weakerTeam = null;
                 const homeGoalsAvg = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
                 const awayGoalsAvg = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
                 if (homeGoalsAvg < awayGoalsAvg) weakerTeam = fixture.teams.home.name;
                 else if (awayGoalsAvg < homeGoalsAvg) weakerTeam = fixture.teams.away.name;

                 allGames.push({
                     id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
                     homeTeam: fixture.teams.home.name, awayTeam: fixture.teams.away.name, weakerTeam: weakerTeam
                 });
            }
        }
        
        console.log(`Found ${allGames.length} predictions for ${todayStr}.`);
        allGames.sort((a, b) => a.league.localeCompare(b.league));
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: allGames }, { onConflict: 'prediction_date' });

        if (error) throw error;
        console.log(`Successfully cached ${allGames.length} predictions.`);
        res.status(200).json({ message: `Success: Cached ${allGames.length} predictions.` });

    } catch (error) {
        console.error("Daily Scan Error:", error.message);
        res.status(500).json({ message: 'Error during daily scan.', error: error.message });
    }
}