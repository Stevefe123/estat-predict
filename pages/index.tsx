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

const LandingPage = () => {
    const supabase = useSupabaseClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
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

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address in the field above first.');
            return;
        }
        setLoading(true);
        setMessage('');
        setError('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(error.message);
        else setMessage('If an account exists for this email, a password reset link has been sent.');
        setLoading(false);
    };

    if (showAuth) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border border-gray-700">
                    <button 
                        onClick={() => setShowAuth(false)}
                        className="mb-4 text-gray-400 hover:text-white flex items-center"
                    >
                        ← Back to Home
                    </button>
                    <h2 className="text-3xl font-bold text-center mb-2">{isSignUp ? 'Create Your Account' : 'Sign In'}</h2>
                    <p className="text-center text-gray-400 mb-6">{isSignUp ? 'Get your 7-day free trial.' : 'Welcome back!'}</p>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-400">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-400">Password</label>
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
                                    {isPasswordVisible ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zM10 17a7 7 0 100-14 7 7 0 000 14z" /><path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000 11zM10 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

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
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-green-900 via-gray-900 to-black py-20 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3Ccircle cx="53" cy="7" r="7"/%3E%3Ccircle cx="30" cy="30" r="7"/%3E%3Ccircle cx="7" cy="53" r="7"/%3E%3Ccircle cx="53" cy="53" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
                <div className="relative max-w-4xl mx-auto">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                            <div className="w-10 h-10 bg-white" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                        Estat Predict
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                        Master Low-Scoring Football Predictions with AI-Powered Analytics
                    </p>
                    <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
                        Get expert predictions for under 2.5 goals matches from Serie A, La Liga, Bundesliga, and Eredivisie. 
                        Track real-time results and boost your betting success rate.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={() => { setShowAuth(true); setIsSignUp(true); }}
                            className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
                        >
                            🚀 Start 7-Day Free Trial
                        </button>
                        <button 
                            onClick={() => { setShowAuth(true); setIsSignUp(false); }}
                            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-lg text-lg border border-gray-600 transition-all duration-300"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="py-16 px-6 bg-gray-900">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12 text-green-400">What Makes Us Different</h2>
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-2xl font-bold mb-6 text-white">Advanced AI Football Analytics</h3>
                            <p className="text-gray-300 mb-6 leading-relaxed">
                                Our sophisticated algorithm analyzes team performance, defensive strength, and attacking patterns 
                                to identify matches most likely to end with 2 goals or fewer. We focus on Europe's top leagues 
                                where tactical discipline often leads to lower-scoring affairs.
                            </p>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-center">
                                    <span className="text-green-400 mr-3">⚽</span>
                                    Real-time data from 4 major European leagues
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-400 mr-3">📊</span>
                                    Team form analysis and defensive metrics
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-400 mr-3">🎯</span>
                                    Focus on under 2.5 goals predictions
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-400 mr-3">📈</span>
                                    Historical accuracy tracking
                                </li>
                            </ul>
                        </div>
                        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
                            <h4 className="text-xl font-bold mb-4 text-green-400">Daily Prediction Insights</h4>
                            <div className="space-y-4">
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-semibold">Serie A</span>
                                        <span className="text-green-400">85% Success</span>
                                    </div>
                                    <div className="text-sm text-gray-400">Defensive-minded league with tactical play</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-semibold">Bundesliga</span>
                                        <span className="text-green-400">78% Success</span>
                                    </div>
                                    <div className="text-sm text-gray-400">Strong defensive structures</div>
                                </div>
                                <div className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-semibold">La Liga</span>
                                        <span className="text-green-400">82% Success</span>
                                    </div>
                                    <div className="text-sm text-gray-400">Technical play, fewer high-scoring games</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 px-6 bg-gray-800">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12 text-green-400">Why Choose Estat Predict</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-bold mb-4 text-white">Precision Targeting</h3>
                            <p className="text-gray-300">
                                We don't predict every match. We carefully select games where defensive patterns 
                                and team form suggest low-scoring outcomes.
                            </p>
                        </div>
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">📱</div>
                            <h3 className="text-xl font-bold mb-4 text-white">Real-Time Updates</h3>
                            <p className="text-gray-300">
                                Get live match updates, final scores, and instant verification of our predictions. 
                                Track our success rate in real-time.
                            </p>
                        </div>
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="text-xl font-bold mb-4 text-white">Better ROI</h3>
                            <p className="text-gray-300">
                                Focus on a specific market type with higher success rates rather than 
                                scattered predictions across multiple bet types.
                            </p>
                        </div>
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-xl font-bold mb-4 text-white">Data-Driven</h3>
                            <p className="text-gray-300">
                                Every prediction is backed by team statistics, recent form, and defensive 
                                performance metrics from reliable sources.
                            </p>
                        </div>
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">🏆</div>
                            <h3 className="text-xl font-bold mb-4 text-white">League Expertise</h3>
                            <p className="text-gray-300">
                                Specialized knowledge of Serie A, La Liga, Bundesliga, and Eredivisie 
                                playing styles and tendencies.
                            </p>
                        </div>
                        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 text-center">
                            <div className="text-4xl mb-4">⏱️</div>
                            <h3 className="text-xl font-bold mb-4 text-white">Time Efficient</h3>
                            <p className="text-gray-300">
                                No need to research teams yourself. Get curated predictions delivered 
                                daily with detailed reasoning for each pick.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 px-6 bg-gray-900">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12 text-green-400">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        {[
                            {
                                q: "What does 'under 2.5 goals' mean?",
                                a: "Under 2.5 goals means the total number of goals scored by both teams combined should be 2 or fewer (0-0, 1-0, 0-1, 1-1, 2-0, 0-2). If 3 or more goals are scored, the prediction is incorrect."
                            },
                            {
                                q: "Which leagues do you cover?",
                                a: "We focus on four major European leagues: Italian Serie A, Spanish La Liga, German Bundesliga, and Dutch Eredivisie. These leagues are known for tactical play and defensive stability."
                            },
                            {
                                q: "How accurate are your predictions?",
                                a: "Our algorithm maintains a success rate of 75-85% across different leagues. You can track our real-time performance on the dashboard with historical results and accuracy metrics."
                            },
                            {
                                q: "How many predictions do you provide daily?",
                                a: "We typically provide 3-8 carefully selected predictions per day, depending on the match schedule and our algorithm's confidence level. Quality over quantity is our approach."
                            },
                            {
                                q: "What data sources do you use?",
                                a: "We use professional football APIs that provide real-time team statistics, recent form, goals scored/conceded, and other relevant metrics from official league sources."
                            },
                            {
                                q: "Can I see past results and accuracy?",
                                a: "Yes! Our dashboard shows all past predictions with actual results, success rates by league, and daily performance tracking. Complete transparency is important to us."
                            },
                            {
                                q: "What happens after my free trial?",
                                a: "After your 7-day free trial, you'll need a subscription to continue receiving predictions. The subscription costs $25 and provides unlimited access to all features."
                            },
                            {
                                q: "Do you provide betting advice?",
                                a: "We provide predictions based on statistical analysis. We don't provide financial betting advice. Please bet responsibly and within your means."
                            }
                        ].map((faq, index) => (
                            <div key={index} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-lg font-bold mb-3 text-green-400">{faq.q}</h3>
                                <p className="text-gray-300 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6 bg-gradient-to-r from-green-900 to-green-700 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-6 text-white">Ready to Start Winning?</h2>
                    <p className="text-xl text-green-100 mb-8">
                        Join thousands of smart bettors who trust our low-scoring predictions
                    </p>
                    <button 
                        onClick={() => { setShowAuth(true); setIsSignUp(true); }}
                        className="bg-white hover:bg-gray-100 text-green-900 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
                    >
                        Start Your Free Trial Now →
                    </button>
                    <p className="text-green-200 mt-4 text-sm">No credit card required • 7 days completely free</p>
                </div>
            </section>
        </div>
    );
};

const PredictionsDashboard = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'past', 'today', 'future'

    useEffect(() => {
        axios.get('/api/get-predictions').then(res => { 
            setPredictions(res.data || []); 
            setLoading(false); 
        }).catch(err => { 
            console.error('Error fetching predictions:', err); 
            setPredictions([]); // Set empty array on error
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
                                <>
                                    {/* Daily Stats Summary */}
                                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-green-400 font-bold text-lg">{games.length}</div>
                                                <div className="text-gray-400 text-sm">Predictions</div>
                                            </div>
                                            <div>
                                                <div className="text-blue-400 font-bold text-lg">
                                                    {games.filter(g => g.isCompleted && g.isPredictionCorrect).length}
                                                </div>
                                                <div className="text-gray-400 text-sm">Correct</div>
                                            </div>
                                            <div>
                                                <div className="text-yellow-400 font-bold text-lg">
                                                    {games.filter(g => !g.isCompleted).length}
                                                </div>
                                                <div className="text-gray-400 text-sm">Upcoming</div>
                                            </div>
                                        </div>
                                    </div>

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
                                </>
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
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setLoading(true);
                const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setProfile(data);
                setLoading(false);
            } else if (user) {
                setLoading(true);
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data);
                setLoading(false);
            } else { 
                setLoading(false); 
            }
        };

        getSession();
    }, [user, supabase]);

    const handleLogout = async () => { 
        await supabase.auth.signOut(); 
        setProfile(null); 
    };

    // Listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setLoading(true);
                    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    setProfile(data);
                    setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase]);

    const renderContent = () => {
        if (loading) return <p className="text-center text-gray-300 py-10">Loading...</p>;
        if (!user) return <LandingPage />; // Show LandingPage if not logged in
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