import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Signature verification failed');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
        const { user_id } = event.data.metadata;
        if (!user_id) {
            return res.status(400).send('User ID missing');
        }

        // --- NEW LOGIC ---
        // Instead of just setting status to 'active', we set the days remaining.
        // We also reset the trial status to ensure they get a fresh start on their sub.
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_status: 'active',
                subscription_days_remaining: 30, // Give them 30 active days
                trial_days_used: 0 // Reset trial counter
            })
            .eq('id', user_id);

        if (error) {
            console.error('Supabase subscription update error:', error);
            return res.status(500).send('Error updating user profile');
        }

        console.log(`Successfully credited 30 subscription days for user ${user_id}`);
    }

    res.status(200).send('Webhook received');
}