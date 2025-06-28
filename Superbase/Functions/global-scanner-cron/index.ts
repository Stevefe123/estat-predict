import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { format } from 'https://esm.sh/date-fns@2'
import axios from 'https://esm.sh/axios@1.6.2' // Using esm.sh for Deno compatibility

const API_OPTIONS = {
    method: 'GET',
    headers: { 'X-RapidAPI-Key': Deno.env.get('FOOTBALL_API_KEY')!, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
};

const hasLowScoringForm = (fixture: any) => { /* ... same logic as before ... */ return (parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99') < 1.6 || parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99') < 1.6); };

// This is the main function triggered by the Cron Job
Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // This job will generate predictions for TODAY. It should run once a day, e.g., at 01:00 UTC.
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    console.log(`Starting daily prediction job for: ${todayStr}`);

    // --- 1. Fetch ALL Active Leagues ---
    const leaguesResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/leagues?season=2023¤t=true`, API_OPTIONS);
    const leagueIdsToSearch = leaguesResponse.data.response.map(l => l.league.id);
    console.log(`Found ${leagueIdsToSearch.length} active leagues.`);

    // --- 2. Fetch ALL Fixtures from those leagues ---
    let fixturesToProcess: any[] = [];
    const fixturePromises = leagueIdsToSearch.map(id => axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${id}&season=2023&date=${todayStr}`, API_OPTIONS));
    const fixtureResults = await Promise.allSettled(fixturePromises);
    for (const result of fixtureResults) {
        if (result.status === 'fulfilled' && result.value.data.response) {
            fixturesToProcess.push(...result.value.data.response);
        }
    }
    console.log(`Found ${fixturesToProcess.length} total fixtures to analyze.`);

    // --- 3. Run the Comprehensive Filter ---
    let allGames = [];
    for (const fixture of fixturesToProcess) {
        const h2hResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${fixture.teams.home.id}-${fixture.teams.away.id}&last=5`, API_OPTIONS);
        const h2hGames = h2hResponse.data.response;
        const avgH2HGoals = h2hGames.length > 0 ? h2hGames.reduce((sum, g) => sum + g.goals.home + g.goals.away, 0) / h2hGames.length : 99;
        
        if (avgH2HGoals <= 2.5 || hasLowScoringForm(fixture)) {
            let weakerTeam = null;
            const homeGoalsAvg = parseFloat(fixture.teams.home.last_5_games?.goals?.for?.average || '99');
            const awayGoalsAvg = parseFloat(fixture.teams.away.last_5_games?.goals?.for?.average || '99');
            if (homeGoalsAvg < awayGoalsAvg) weakerTeam = fixture.teams.home.name;
            else if (awayGoalsAvg < homeGoalsAvg) weakerTeam = fixture.teams.away.name;

            allGames.push({
                id: fixture.fixture.id, league: `${fixture.league.name} (${fixture.league.country})`,
                homeTeam: fixture.teams.home.name, awayTeam: fixture.teams.away.name, weakerTeam
            });
        }
    }
    allGames.sort((a, b) => a.league.localeCompare(b.league));
    console.log(`Generated ${allGames.length} predictions for ${todayStr}.`);

    // --- 4. Save the result to the cache table ---
    if (allGames.length > 0) {
        const { error } = await supabaseAdmin
            .from('daily_predictions')
            .upsert({ prediction_date: todayStr, prediction_data: allGames }, { onConflict: 'prediction_date' });

        if (error) throw error;
        console.log(`Successfully cached predictions for ${todayStr}.`);
    }

    return new Response(JSON.stringify({ success: true, games_found: allGames.length }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Cron job failed:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
})