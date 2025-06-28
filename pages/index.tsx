import React, { useEffect, useState } from 'react';
import { useSession, useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import axios from 'axios';
import PaystackPop from '@paystack/inline-js';
import { format, addDays } from 'date-fns';

// --- Reusable Components ---

const Header = ({ onLogout, isLoggedIn }) => (
    <header className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-20">
        <div className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-9 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
            Estat Predict
        </div>
        <div>
            {isLoggedIn && (<button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Sign Out</button>)}
        </div>
    </header>
);

const LandingPage = ({ onGetStartedClick }) => (
    <>
        <section className="text-center py-20 px-4 bg-gray-900">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">Stop Guessing. Start Winning.</h1>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
                <span className="text-green-400 font-semibold">Estat Predict</span> is your data-driven advantage. We scan thousands of games daily to pinpoint high-probability, low-scoring matches, saving you hours of research and helping you bet smarter.
            </p>
            <button onClick={onGetStartedClick} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg transform hover:scale-105 transition-transform">
                Get Your 7-Day Free Trial
            </button>
        </section>
        <section className="py-16 bg-gray-800/50">
            <div className="max-w-4xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-bold mb-4">About Us</h2>
                <p className="text-gray-400 leading-relaxed">
                    At Estat Predict, we believe successful sports betting isn't about luck; it's about information. We built this platform to provide clear, actionable, and statistically-backed predictions focused exclusively on the "Under 2.5 goals" market. We do the heavy lifting so you can make confident decisions.
                </p>
            </div>
        </section>
        <section className="py-16 bg-gray-900">
            <div className="max-w-4xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-xl text-green-400">How does the "Active Day" subscription work?</h3>
                        <p className="text-gray-400 mt-2">We believe in fairness. Your 30-day subscription only counts down on days where we provide predictions. If there's an international break or a day with no suitable low-scoring games, you don't lose a day of your subscription. You pay for 30 days of value, not just 30 days of time.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-xl text-green-400">What does "(Weaker Team - Excluded number of goals - 3)" mean?</h3>
                        <p className="text-gray-400 mt-2">This is our core prediction. It means we have identified the highlighted team as the one most likely to underperform offensively, making the total match goals likely to be under 3 (i.e., 0, 1, or 2 goals total).</p>
                    </div>
                </div>
            </div>
        </section>
    </>
);

const AuthPage = () => {
    const supabase = useSupabaseClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
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
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        setMessage('');
        setError('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) setError(error.message);
        else setMessage('If an account exists, a password reset link has been sent.');
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
                        <div className="relative">
                            <input type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10" />
                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                                {isPasswordVisible ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zM10 17a7 7 0 100-14 7 7 0 000 14z" /><path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM10 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>)}
                            </button>
                        </div>
                    </div>
                    {!isSignUp && (<div className="text-right"><button type="button" onClick={handlePasswordReset} className="text-sm text-gray-400 hover:text-white hover:underline">Forgot Password?</button></div>)}
                    <button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg text-lg disabled:bg-gray-500">{loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}</button>
                </form>
                {message && <p className="text-green-400 text-center mt-4">{message}</p>}
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                <div className="text-center mt-6">
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }} className="text-gray-400 hover:text-white text-sm">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NewsSlideshow = () => {
    const [articles, setArticles] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    useEffect(() => { axios.get('/api/get-news').then(res => setArticles(res.data)).catch(err => console.error("News fetch error:", err)); }, []);
    useEffect(() => { if (articles.length === 0) return; const timer = setTimeout(() => { setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length); }, 5000); return () => clearTimeout(timer); }, [currentIndex, articles]);
    if (articles.length === 0) return null;
    return (<div className="my-8 max-w-4xl mx-auto"><h3 className="text-2xl font-bold text-center mb-4">Latest Football News</h3><div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">{articles.map((article, index) => (<a href={article.url} target="_blank" rel="noopener noreferrer" key={index} className={`absolute inset-0 transition-opacity duration-1000 no-underline text-inherit ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}><img src={article.urlToImage} alt={article.title} className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4"><h4 className="font-bold text-white text-lg">{article.title}</h4><p className="text-gray-300 text-sm">{article.source.name}</p></div></a>))}</div></div>);
};

const PredictionsDashboard = () => {
    const [date, setDate] = useState(new Date());
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const dateInputRef = React.useRef<HTMLInputElement>(null);
    const formattedDate = format(date, 'yyyy-MM-dd');
    useEffect(() => { setLoading(true); axios.get(`/api/get-predictions?date=${formattedDate}`).then(res => { setGames(res.data); setLoading(false); }).catch(err => { console.error(err); setLoading(false); }); }, [formattedDate]);
    const changeDate = (days: number) => setDate(currentDate => addDays(currentDate, days));
    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => { const selectedDate = new Date(event.target.value + 'T00:00:00'); setDate(selectedDate); };
    return (<div className="p-4 md:p-6 max-w-4xl mx-auto"><h2 className="text-3xl font-bold text-center mb-6">Daily Games</h2><div className="flex justify-center items-center gap-2 sm:gap-4 mb-6"><button onClick={() => changeDate(-1)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">←</button><span className="text-lg sm:text-xl font-semibold text-green-400 text-center w-40">{format(date, 'MMM dd, yyyy')}</span><button onClick={() => changeDate(1)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">→</button><button onClick={() => dateInputRef.current?.showPicker()} className="p-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg" aria-label="Select date from calendar"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button><input type="date" ref={dateInputRef} onChange={handleDateChange} className="absolute -left-full" aria-hidden="true" /></div>{loading && (<div className="text-center text-gray-300 py-10"><p className="text-xl">Performing Deep Analysis...</p></div>)}{!loading && games.length === 0 && (<div className="text-center bg-gray-800 border border-dashed border-gray-600 rounded-lg p-8 my-10"><p className="text-lg font-bold text-white">No Matches Available for Today</p><p className="text-green-300 font-semibold mt-4">Due to our commitment in giving you the best and most accurate predictions, we do not have any matches today that fits our strict prediction model. Please check back tomorrow.</p></div>)}{!loading && games.length > 0 && (<div className="space-y-4">{games.map((game: any) => (<div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg"><p className="text-sm text-gray-400 font-semibold">{game.league}</p>{game.score ? (<div className="text-center text-3xl font-bold my-3 text-white"><span>{game.score.home} - {game.score.away}</span><p className="text-sm font-normal text-gray-500">Full-Time</p></div>) : (game.weakerTeam && <p className="text-red-500 font-bold mt-2">({game.weakerTeam} - Excluded number of goals - 3)</p>)}<div className="flex justify-between items-center text-xl md:text-2xl font-bold mt-3"><span className={`text-right flex-1 ${game.weakerTeam === game.homeTeam ? 'text-red-500' : ''}`}>{game.homeTeam}</span><span className="text-gray-500 mx-4">vs</span><span className={`text-left flex-1 ${game.weakerTeam === game.awayTeam ? 'text-red-500' : ''}`}>{game.awayTeam}</span></div></div>))}</div>)}{!loading && games.length > 0 && (<div className="text-center bg-gray-800 border border-gray-700 rounded-lg p-6 mt-10"><p className="text-lg font-semibold text-white">Go to your favorite Sports-book maker and place your bet with the prediction above. We strongly recommend <a href="https://www.sportybet.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline font-bold">Sportybet.com</a></p></div>)}</div>);
};

const PaywallPage = ({ user }) => {
    const payWithPaystack = async () => { const PaystackPop = (await import('@paystack/inline-js')).default; const paystack = new PaystackPop(); paystack.newTransaction({ key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!, email: user.email, amount: 4000000, currency: 'NGN', metadata: { user_id: user.id }, onSuccess: () => alert('Thanks for subscribing! Please refresh.'), onCancel: () => alert("Payment window closed.") }) }; return (<div className="text-center py-20 px-6"><h1 className="text-4xl font-bold mb-4">Your Subscription Has Expired</h1><p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">Please re-subscribe to continue receiving daily predictions.</p><button onClick={payWithPaystack} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg">Subscribe for 30 Active Days</button></div>);
};

const WhatsAppFooter = () => (
    <footer className="text-center py-10 border-t border-gray-800 mt-6"><p className="text-gray-400">Have questions or need support?</p><a href="https://wa.me/2349058356615" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-2 bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.523.074-.797.347-.272.272-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.206 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>Contact us on WhatsApp</a></footer>
);

const DisclaimerFooter = () => (
    <div className="bg-gray-900 border-t border-gray-800 py-8 px-4 mt-6">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-xs">
            <p className="font-bold text-gray-400 mb-2">DISCLAIMER</p>
            <p className="mb-2">You must be 18 years of age or older to use this website. All predictions on Estat Predict are generated through statistical analysis and are for informational purposes only. While we strive for the highest accuracy, there is no such thing as a 100% guaranteed outcome in sports. We guarantee 99% accuracy in our prediction model based on historical data, but this does not guarantee future results. Please bet responsibly and only wager what you can afford to lose.</p>
            <p>© {new Date().getFullYear()} Estat Predict. All Rights Reserved.</p>
        </div>
    </div>
);

// --- MAIN PAGE ORCHESTRATOR ---
export default function Home() {
    const session = useSession();
    const user = useUser();
    const supabase = useSupabaseClient();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            supabase.from('profiles').select('*').eq('id', session.user.id).single()
                .then(({ data }) => { setProfile(data); setLoading(false); });
        } else { setLoading(false); }
    }, [session, supabase]);
    
    const handleLogout = async () => { await supabase.auth.signOut(); setProfile(null); };

    const LoggedInView = () => {
        if (!profile) return <p className="text-center text-gray-300 py-10">Finalizing login...</p>;
        const trialDaysUsed = profile.trial_days_used || 0;
        const subscriptionDaysLeft = profile.subscription_days_remaining || 0;
        const isTrialActive = trialDaysUsed < 7 && subscriptionDaysLeft <= 0;
        const isSubscribed = subscriptionDaysLeft > 0;
        const StatusBanner = () => {
            if (isSubscribed) return (<div className="text-center bg-blue-900/50 p-3 my-4 max-w-4xl mx-auto rounded-lg"><p className="font-semibold text-blue-300">You have {subscriptionDaysLeft} active subscription day(s) remaining.</p></div>);
            if (isTrialActive) return (<div className="text-center bg-green-900/50 p-3 my-4 max-w-4xl mx-auto rounded-lg"><p className="font-semibold text-green-300">You have {7 - trialDaysUsed} active trial day(s) remaining.</p></div>);
            return null;
        };
        if (isSubscribed || isTrialActive) return (<><StatusBanner /><NewsSlideshow /><PredictionsDashboard /></>);
        return <PaywallPage user={user} />;
    };

    const LoggedOutView = () => (
        <>
            <LandingPage onGetStartedClick={() => { document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' }); }} />
            <div id="auth-section"><AuthPage /></div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Header onLogout={handleLogout} isLoggedIn={!!user} />
            <main>
                {loading && <div className="text-center text-gray-300 py-20">Loading...</div>}
                {!loading && (user ? <LoggedInView /> : <LoggedOutView />)}
            </main>
            <WhatsAppFooter />
            {!user && <DisclaimerFooter />}
        </div>
    );
}