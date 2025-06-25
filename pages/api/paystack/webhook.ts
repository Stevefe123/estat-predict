import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// IMPORTANT: Use the Service Role Key for admin-level access
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
        console.warn("Webhook signature verification failed.");
        return res.status(401).send('Signature verification failed');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
        const { user_id } = event.data.metadata;
        const customerEmail = event.data.customer.email;

        if (!user_id) {
            console.error('Webhook Error: user_id not found in metadata');
            return res.status(400).send('User ID missing');
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', user_id);

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).send('Error updating user profile');
        }

        console.log(`Successfully updated subscription for user ${user_id} (${customerEmail})`);
    }

    res.status(200).send('Webhook received');
}