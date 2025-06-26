import { useState } from 'react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // The fix is applied inside this function call
  const [supabaseClient] = useState(() => createBrowserSupabaseClient({
    cookieOptions: {
      name: 'sb-auth-token',
      maxAge: 60 * 60 * 24 * 365, // Set to 1 year for persistence
      // The property was renamed from 'lifetime' to 'maxAge' in newer versions.
    }
  }));

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}

export default MyApp;
