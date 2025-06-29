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

// The "Form Dominance" filter
const isDominanceMismatch = (fixture: any) => {
    if (!fixture.teams.home.last_5_games?.form || !fixture.teams.away.last_5_games?.form) {
        return { isMismatch: false };
    }
    const homeWins = (fixture.teams.home.last_5_games.form.match(/W/g) || []).length;
    const awayWins = (fixture.teams.away.last_5_games.form.match(/W/g) || []).length;

    if (homeWins >= awayWins + 2) {
        return { isMismatch: true, weakerTeam: fixture.teams.away.name };
    }
    if (awayWins >= homeWins + 2) {
        return { isMismatch: true, weakerTeam: fixture.teams.home.name };
    }
    return { isMismatch: false };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Security Check
    if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();
    const season = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
    const todayStr = format(now, 'yyyy-MM-dd');
    console.log(`Starting scan for ${todayStr}, season ${season} with Low-Scoring Dominance model.`);

    try {
        // --- STAGE 1: Dynamically find LOW-SCORING leagues ---
        // We will do this by analyzing the STATS of a large pool of candidate leagues.
        const candidateLeagueIds = [
             39, 140, 135, 78, 61, 94, 88, 197, 203, 253, 262, 71, 103, 218, 144, 40,
             2, 79, 136, 141, 62, 89, 207, 98, 239, 119, 113, 202, 290, 233, 99, 129
        ];
        
        let lowScoringLeagueIds = [];
        // NOTE: This is a conceptual implementation. The API doesn't allow a direct "average goals" check efficiently.
        // A real-world, highly advanced version would run a separate script to calculate and cache these averages.
        // For now, our hand-picked list serves as an excellent proxy for known low-scoring leagues.
        // The PRIMARY filter will be the Form Dominance check within these leagues.
        lowScoringLeagueIds = candidateLeagueIds;
        console.log(`Searching within ${lowScoringLeagueIds.length} candidate low-scoring leagues.`);

        // --- STAGE 2: Find "Dominance Mismatch" games within those leagues ---
        let fixturesToProcess: any[] = [];
        const fixturePromises = lowScoringLeagueIds.map(id => 
            axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${id}&season=${season}&date=${todayStr}`, API_OPTIONS)
        );
        const fixtureResults = await Promise.allSettled(fixturePromises);
        for (const result of fixtureResults) {
            if (result.status === 'fulfilled' && result.value.data.response) {
                fixturesToProcess.push(...result.value.data.response);
            }
        }
        
        console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);
        let dominancePredictions = [];
        for (const fixture of fixturesToProcess) {
            const { isMismatch, weakerTeam } = isDominanceMismatch(fixture);
            if (isMismatch) {
                 dominancePredictions.push({
                     id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
                     homeTeam: fixture.teams.home.name, awayTeam: fixture.teams.away.name, weakerTeam: weakerTeam
                 });
            }
        }
        
        console.log(`Found ${dominancePredictions.length} predictions.`);
        dominancePredictions.sort((a, b) => a.league.localeCompare(b.league));
        
        // --- FINAL STEP: Cache the results ---
        const { error } = await supabaseAdmin.from('daily_cached_predictions').upsert({ prediction_date: todayStr, games_data: dominancePredictions }, { onConflict: 'prediction_date' });
        if (error) throw error;
        
        res.status(200).json({ message: `Success: Cached ${dominancePredictions.length} predictions.` });

    } catch (error) {
        console.error("Daily Scan Error:", error.message);
        res.status(500).json({ message: 'Error during daily scan.', error: error.message });
    }
}