
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

// --- NEW UPGRADED AUTHENTICATION PAGE ---
const AuthPage = () => {
    const supabase = useSupabaseClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // --- NEW: State for password visibility ---
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setError(error.message);
            else setMessage('Account created! Please check your email to confirm your account.');
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError('Invalid login credentials. Please try again.');
        }
        setLoading(false);
    };

    // --- NEW: Function to handle "Forgot Password" ---
    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address in the field above first.');
            return;
        }
        setLoading(true);
        setMessage('');
        setError('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`, // Redirect to reset password page
        });
        if (error) setError(error.message);
        else setMessage('If an account exists for this email, a password reset link has been sent.');
        setLoading(false);
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
                        {/* --- NEW: Wrapper for password input and eye icon --- */}
                        <div className="relative">
                            <input
                                type={isPasswordVisible ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                            >
                                {/* --- NEW: SVG for the eye icon --- */}
                                {isPasswordVisible ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zM10 17a7 7 0 100-14 7 7 0 000 14z" /><path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM10 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* --- NEW: Show "Forgot Password" link only on Sign In view --- */}
                    {!isSignUp && (
                        <div className="text-right">
                            <button type="button" onClick={handlePasswordReset} className="text-sm text-gray-400 hover:text-white hover:underline">Forgot Password?</button>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg text-lg disabled:bg-gray-500">
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                {message && <p className="text-green-400 text-center mt-4">{message}</p>}
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}

                <div className="text-center mt-6">
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} className="text-gray-400 hover:text-white text-sm">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PredictionsDashboard = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'past', 'today', 'future'
    
    useEffect(() => {
        axios.get('/api/get-predictions').then(res => { 
            setPredictions(res.data); 
            setLoading(false); 
        }).catch(err => { 
            console.error(err); 
            setLoading(false); 
        });
    }, []);

    const getFilteredPredictions = () => {
        const today = new Date().toISOString().split('T')[0];
        
        switch (filter) {
            case 'past':
                return predictions.filter((game: any) => game.date < today);
            case 'today':
                return predictions.filter((game: any) => game.date === today);
            case 'future':
                return predictions.filter((game: any) => game.date > today);
            default:
                return predictions;
        }
    };

    const getDateLabel = (dateString: string) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        if (dateString === today) return 'Today';
        if (dateString === yesterday) return 'Yesterday';
        if (dateString === tomorrow) return 'Tomorrow';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const generateDateRange = () => {
        const dates = [];
        const today = new Date();
        
        // Generate past 14 days
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        // Add next 2 days
        for (let i = 1; i <= 2; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return dates;
    };

    const getFilteredDates = () => {
        const today = new Date().toISOString().split('T')[0];
        const allDates = generateDateRange();
        
        switch (filter) {
            case 'past':
                return allDates.filter(date => date < today);
            case 'today':
                return allDates.filter(date => date === today);
            case 'future':
                return allDates.filter(date => date > today);
            default:
                return allDates;
        }
    };

    const groupedPredictions = getFilteredPredictions().reduce((groups: any, game: any) => {
        const date = game.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(game);
        return groups;
    }, {});
    
    if (loading) return <p className="text-center text-gray-300 py-10">Loading predictions...</p>;
    if (predictions.length === 0) return <p className="text-center text-gray-300 py-10">No low-scoring candidate games found.</p>;
    
    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Match Predictions & Results</h2>
            
            {/* Filter Buttons */}
            <div className="flex justify-center mb-6 space-x-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium ${filter === 'all' ? 'bg-green-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('past')}
                    className={`px-4 py-2 rounded-lg font-medium ${filter === 'past' ? 'bg-green-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    Past 2 Weeks
                </button>
                <button
                    onClick={() => setFilter('today')}
                    className={`px-4 py-2 rounded-lg font-medium ${filter === 'today' ? 'bg-green-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    Today
                </button>
                <button
                    onClick={() => setFilter('future')}
                    className={`px-4 py-2 rounded-lg font-medium ${filter === 'future' ? 'bg-green-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                    Next 2 Days
                </button>
            </div>

            {/* Grouped Matches by Date */}
            <div className="space-y-8">
                {getFilteredDates().map((date) => {
                    const games = groupedPredictions[date] || [];
                    return (
                        <div key={date} className="border-t border-gray-700 pt-4 first:border-t-0 first:pt-0">
                            <div className="bg-gray-800 border border-green-500 rounded-lg p-3 mb-4">
                                <h3 className="text-2xl font-bold text-green-400 text-center">
                                    {getDateLabel(date)}
                                </h3>
                                <p className="text-center text-gray-300 text-sm mt-1">{date}</p>
                            </div>
                            {games.length > 0 ? (
                                <div className="space-y-3">
                                    {games.map((game: any) => (
                                        <div key={game.id} className={`bg-gray-800 border rounded-xl p-4 shadow-lg ${
                                            game.isCompleted 
                                                ? (game.isPredictionCorrect ? 'border-green-500' : 'border-red-500')
                                                : 'border-gray-700'
                                        }`}>
                                            {/* League and Time */}
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm text-gray-400 font-semibold">{game.league}</p>
                                                <p className="text-sm text-gray-400">{game.time}</p>
                                            </div>

                                            {/* Weaker Team Note */}
                                            {game.weakerTeam && (
                                                <p className="text-red-400 text-sm mb-2">
                                                    Prediction: Low scoring (≤2 goals) - {game.weakerTeam} expected to struggle
                                                </p>
                                            )}

                                            {/* Teams and Score */}
                                            <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                                                <div className="flex-1 text-right">
                                                    <span className={game.weakerTeam === game.homeTeam ? 'text-red-400' : 'text-white'}>
                                                        {game.homeTeam}
                                                    </span>
                                                    {game.isCompleted && (
                                                        <span className="ml-2 text-2xl font-mono">{game.homeScore}</span>
                                                    )}
                                                </div>
                                                
                                                <div className="mx-4 text-gray-500 text-center">
                                                    {game.isCompleted ? '-' : 'vs'}
                                                </div>
                                                
                                                <div className="flex-1 text-left">
                                                    {game.isCompleted && (
                                                        <span className="mr-2 text-2xl font-mono">{game.awayScore}</span>
                                                    )}
                                                    <span className={game.weakerTeam === game.awayTeam ? 'text-red-400' : 'text-white'}>
                                                        {game.awayTeam}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Match Result */}
                                            {game.isCompleted && (
                                                <div className="mt-3 text-center">
                                                    <div className="text-sm text-gray-400">
                                                        Total Goals: <span className="font-bold">{game.totalGoals}</span>
                                                    </div>
                                                    <div className={`text-sm font-bold mt-1 ${
                                                        game.isPredictionCorrect ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                        Prediction: {game.isPredictionCorrect ? '✅ CORRECT' : '❌ INCORRECT'}
                                                        {game.isPredictionCorrect 
                                                            ? ' (≤2 goals as predicted)' 
                                                            : ` (${game.totalGoals} goals - higher than predicted)`
                                                        }
                                                    </div>
                                                </div>
                                            )}

                                            {/* Future Match Status */}
                                            {!game.isCompleted && game.status !== 'NS' && (
                                                <div className="mt-2 text-center text-sm text-yellow-400">
                                                    Status: {game.status === 'LIVE' ? '🔴 LIVE' : game.status}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                                    <p className="text-gray-400">No matches scheduled for this date</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PaywallPage = ({ user }) => {
    const payWithPaystack = async () => {
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        paystack.newTransaction({
            key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
            email: user.email,
            amount: 250000,
            metadata: { user_id: user.id },
            onSuccess: () => alert('Thanks for subscribing! Please refresh.'),
            onCancel: () => alert("Payment window closed."),
        });
    };
    
    return (
        <div className="text-center py-20 px-6">
            <h1 className="text-4xl font-bold mb-4">Your Free Trial Has Ended</h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">Please subscribe to continue receiving daily predictions.</p>
            <button onClick={payWithPaystack} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg">
                Subscribe Now for $25
            </button>
        </div>
    );
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
        } else { 
            setLoading(false); 
        }
    }, [user, supabase]);
    
    const handleLogout = async () => { 
        await supabase.auth.signOut(); 
        setProfile(null); 
    };

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
