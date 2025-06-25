import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import PaystackPop from '@paystack/inline-js';

// --- Reusable Components (Styled with Tailwind CSS) ---

const Header = ({ onLogout, isLoggedIn }) => (
    <header className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-9 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
            Estat Predict
        </div>
        <div>
            {isLoggedIn && (
                <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Sign Out</button>
            )}
        </div>
    </header>
);

// --- NEW AUTHENTICATION PAGE ---
const AuthPage = () => {
    const supabase = useSupabaseClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true); // Default to Sign Up view
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (isSignUp) {
            // Handle Sign Up
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) setError(error.message);
            else setMessage('Account created! Please check your email to confirm and log in.');
        } else {
            // Handle Sign In
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) setError('Invalid login credentials. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border border-gray-700">
                <h2 className="text-3xl font-bold text-center mb-2">{isSignUp ? 'Create Your Account' : 'Sign In'}</h2>
                <p className="text-center text-gray-400 mb-6">{isSignUp ? 'Get your 7-day free trial.' : 'Welcome back!'}</p>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-400">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-400">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg text-lg">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                {message && <p className="text-green-400 text-center mt-4">{message}</p>}
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}

                <div className="text-center mt-6">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-gray-400 hover:text-white text-sm">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};


const PredictionsDashboard = () => { /* This component remains the same */
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        axios.get('/api/get-predictions').then(res => { setPredictions(res.data); setLoading(false); }).catch(err => { console.error(err); setLoading(false); });
    }, []);
    if (loading) return <p className="text-center text-gray-300 py-10">Analyzing today's games...</p>;
    if (predictions.length === 0) return <p className="text-center text-gray-300 py-10">No low-scoring candidate games found for today.</p>;
    return ( <div className="p-4 md:p-6 max-w-4xl mx-auto"> <h2 className="text-3xl font-bold text-center mb-6">Today's Predictions</h2> <div className="space-y-4"> {predictions.map((game: any) => ( <div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg"> <p className="text-sm text-gray-400 font-semibold">{game.league}</p> {game.weakerTeam && <p className="text-red-500 font-bold mt-2">({game.weakerTeam} - Excluded number of goals - 3)</p>} <div className="flex justify-between items-center text-xl md:text-2xl font-bold mt-3"> <span className={`text-right flex-1 ${game.weakerTeam === game.homeTeam ? 'text-red-500' : ''}`}>{game.homeTeam}</span> <span className="text-gray-500 mx-4">vs</span> <span className={`text-left flex-1 ${game.weakerTeam === game.awayTeam ? 'text-red-500' : ''}`}>{game.awayTeam}</span> </div> </div> ))} </div> </div> );
};

const PaywallPage = ({ user }) => { /* This component remains the same */
    const payWithPaystack = async () => {
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        paystack.newTransaction({ key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!, email: user.email, amount: 250000, metadata: { user_id: user.id }, onSuccess: () => alert('Thanks for subscribing! Please refresh.'), onCancel: () => alert("Payment window closed."), });
    };
    return ( <div className="text-center py-20 px-6"> <h1 className="text-4xl font-bold mb-4">Your Free Trial Has Ended</h1> <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">Please subscribe to continue receiving daily predictions.</p> <button onClick={payWithPaystack} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg">Subscribe Now for $25</button> </div> );
};


// --- Main Page Component ---
export default function Home() {
    const user = useUser();
    const supabase = useSupabaseClient();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            supabase.from('profiles').select('*').eq('id', user.id).single()
                .then(({ data }) => { setProfile(data); setLoading(false); });
        } else { setLoading(false); }
    }, [user, supabase]);
    
    const handleLogout = async () => { await supabase.auth.signOut(); setProfile(null); };

    const renderContent = () => {
        if (loading) return <p className="text-center text-gray-300 py-10">Loading...</p>;
        if (!user) return <AuthPage />; // Show AuthPage if not logged in
        if (!profile) return <p className="text-center text-gray-300 py-10">Loading profile...</p>;

        const trialEndsAt = new Date(profile.trial_ends_at);
        const isSubscribed = profile.subscription_status === 'active';
        if (isSubscribed || (new Date() <= trialEndsAt)) return <PredictionsDashboard />;
        
        return <PaywallPage user={user} />;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Header onLogout={handleLogout} isLoggedIn={!!user} />
            <main>{renderContent()}</main>
        </div>
    );
}
