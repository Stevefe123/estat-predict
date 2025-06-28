import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }

    try {
        const supabase = createServerSupabaseClient({ req, res });
        const { data, error } = await supabase
            .from('daily_predictions')
            .select('prediction_data')
            .eq('prediction_date', date)
            .single();

        if (error) {
            // If no row is found, it's not a server error, just no data.
            if (error.code === 'PGRST116') {
                return res.status(200).json([]);
            }
            throw error;
        }

        // Return the JSON data, or an empty array if null
        res.status(200).json(data?.prediction_data || []);

    } catch (error) {
        console.error("Cache fetch error:", error);
        res.status(500).json({ message: 'Error fetching cached predictions.' });
    }
}