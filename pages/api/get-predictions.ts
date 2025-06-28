import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabase = createServerSupabaseClient({ req, res });
    const queryDate = req.query.date as string || format(new Date(), 'yyyy-MM-dd');

    try {
        // Fetch the pre-calculated predictions from our cache table
        const { data, error } = await supabase
            .from('daily_cached_predictions')
            .select('games_data')
            .eq('prediction_date', queryDate)
            .single();

        if (error) {
            // If no row is found for that date, it's not a server error, just no data.
            if (error.code === 'PGRST116') {
                return res.status(200).json([]);
            }
            throw error;
        }

        // If data exists, return the games_data array. If not, return an empty array.
        res.status(200).json(data?.games_data || []);

    } catch (error) {
        console.error("Cache fetch error:", error);
        res.status(500).json({ message: 'Error fetching cached predictions.' });
    }
}