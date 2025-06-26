import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Create a Supabase client with the user's cookies
  const supabase = createServerSupabaseClient({ req, res });

  // Get the code from the query string
  const { code } = req.query;

  if (code) {
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(String(code));
  }

  // Redirect the user back to the homepage after authentication
  res.redirect('/');
};

export default handler;