import { useSession, useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import PaystackPop from '@paystack/inline-js';
import { format, addDays } from 'date-fns';

// --- Reusable Components ---

const Header = ({ onLogout, isLoggedIn }) => (
    <header className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
        <div className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-9 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
            Estat Predict
        </div>
        <div>{isLoggedIn && <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Sign Out</button>}</div>
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
                    At Estat Predict, we believe successful sports betting isn't about luck; it's about information. We are a team of data analysts and football fanatics who were tired of the noise. We built this platform to provide clear, actionable, and statistically-backed predictions focused exclusively on the "Under 2.5 goals" market. We do the heavy lifting so you can make confident decisions.
                </p>
            </div>
        </section>
        <section className="py-16 bg-gray-900">
            <div className="max-w-4xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-xl text-green-400">How do you make your predictions?</h3>
                        <p className="text-gray-400 mt-2">Our algorithm analyzes a vast range of stats, including team form, defensive strength (goals conceded), attacking prowess (goals scored), and head-to-head history to find games where data points towards a low-scoring outcome.</p>
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

const PredictionsDashboard = () => {
    const [date, setDate] = useState(new Date());
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formattedDate = format(date, 'yyyy-MM-dd');

    useEffect(() => {
        setLoading(true);
        axios.get(`/api/get-predictions?date=${formattedDate}`)
            .then(res => { setGames(res.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, [formattedDate]);

    const changeDate = (days: number) => setDate(currentDate => addDays(currentDate, days));

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Daily Games</h2>
            <div className="flex justify-center items-center gap-4 mb-6">
                <button onClick={() => changeDate(-1)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">← Yesterday</button>
                <span className="text-xl font-semibold text-green-400">{format(date, 'MMM dd, yyyy')}</span>
                <button onClick={() => changeDate(1)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Tomorrow →</button>
            </div>

            {loading && (<div className="text-center text-gray-300 py-10"><p className="text-xl">Performing Deep Analysis...</p><p className="text-sm text-gray-500 mt-2">This may take a moment.</p></div>)}
            {!loading && games.length === 0 && <p className="text-center text-gray-300 py-10">No relevant games found for this day.</p>}
            
            <div className="space-y-4">
                {games.map((game: any) => (
                    <div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
                        <p className="text-sm text-gray-400 font-semibold">{game.league}</p>
                        {game.score ? (<div className="text-center text-3xl font-bold my-3 text-white"><span>{game.score.home} - {game.score.away}</span><p className="text-sm font-normal text-gray-500">Full-Time</p></div>) : (game.weakerTeam && <p className="text-red-500 font-bold mt-2">({game.weakerTeam} - Excluded number of goals - 3)</p>)}
                        <div className="flex justify-between items-center text-xl md:text-2xl font-bold mt-3">
                            <span className={`text-right flex-1 ${game.weakerTeam === game.homeTeam ? 'text-red-500' : ''}`}>{game.homeTeam}</span>
                            <span className="text-gray-500 mx-4">vs</span>
                            <span className={`text-left flex-1 ${game.weakerTeam === game.awayTeam ? 'text-red-500' : ''}`}>{game.awayTeam}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FullAuthPage = () => {
    const supabase = useSupabaseClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const handleAuth = async(e: React.FormEvent)=>{e.preventDefault();setLoading(true);setMessage('');setError('');if(isSignUp){const{error}=await supabase.auth.signUp({email,password});if(error)setError(error.message);else setMessage('Account created! Please check your email to confirm your account.')}else{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setError('Invalid login credentials. Please try again.')}setLoading(false)};const handlePasswordReset=async()=>{if(!email){setError('Please enter your email address first.');return}setLoading(true);setMessage('');setError('');const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(error)setError(error.message);else setMessage('If an account exists, a password reset link has been sent.');setLoading(false)};return(<div className="flex flex-col items-center justify-center py-12 px-4"><div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border border-gray-700"><h2 className="text-3xl font-bold text-center mb-2">{isSignUp?'Create Your Account':'Sign In'}</h2><p className="text-center text-gray-400 mb-6">{isSignUp?'Get your 7-day free trial.':'Welcome back!'}</p><form onSubmit={handleAuth} className="space-y-4"><div><label className="text-sm font-bold text-gray-400">Email</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"/></div><div><label className="text-sm font-bold text-gray-400">Password</label><div className="relative"><input type={isPasswordVisible?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={6} className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"/><button type="button" onClick={()=>setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">{isPasswordVisible?(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>):(<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zM10 17a7 7 0 100-14 7 7 0 000 14z"/><path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM10 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>)}</button></div></div>{!isSignUp&&(<div className="text-right"><button type="button" onClick={handlePasswordReset} className="text-sm text-gray-400 hover:text-white hover:underline">Forgot Password?</button></div>)}<button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg text-lg disabled:bg-gray-500">{loading?'Processing...':(isSignUp?'Create Account':'Sign In')}</button></form>{message&&<p className="text-green-400 text-center mt-4">{message}</p>}{error&&<p className="text-red-500 text-center mt-4">{error}</p>}<div className="text-center mt-6"><button onClick={()=>{setIsSignUp(!isSignUp);setError('');setMessage('')}} className="text-gray-400 hover:text-white text-sm">{isSignUp?'Already have an account? Sign In':"Don't have an account? Sign Up"}</button></div></div></div>);
};

const FullPaywallPage = ({ user }) => {
    const payWithPaystack = async()=>{const PaystackPop=(await import('@paystack/inline-js')).default;const paystack=new PaystackPop();paystack.newTransaction({key:process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,email:user.email,amount:4000000,currency:'NGN',metadata:{user_id:user.id},onSuccess:()=>alert('Thanks for subscribing! Please refresh.'),onCancel:()=>alert("Payment window closed.")})};return(<div className="text-center py-20 px-6"><h1 className="text-4xl font-bold mb-4">Your Free Trial Has Ended</h1><p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">Please subscribe to continue receiving daily predictions.</p><button onClick={payWithPaystack} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 px-8 rounded-lg text-lg">Subscribe Now for N40,000</button></div>);
};

export default function Home() {
    const session = useSession();
    const user = useUser();
    const supabase = useSupabaseClient();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            supabase.from('profiles').select('*').eq('id', session.user.id).single()
                .then(({ data, error }) => {
                    if (error) console.error('Error fetching profile:', error);
                    setProfile(data);
                    setLoading(false);
                });
        } else { setLoading(false); }
    }, [session, supabase]);
    
    const handleLogout = async () => { await supabase.auth.signOut(); setProfile(null); };

    const renderContent = () => {
        if (!user) {
            return (
                <>
                    <LandingPage onGetStartedClick={() => { document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' }); }} />
                    <div id="auth-section"><FullAuthPage /></div>
                </>
            );
        }

        if (!profile) return <p className="text-center text-gray-300 py-10">Finalizing login...</p>;

        const trialEndsAt = new Date(profile.trial_ends_at);
        const isSubscribed = profile.subscription_status === 'active';
        if (isSubscribed || (new Date() <= trialEndsAt)) return <PredictionsDashboard />;
        
        return <FullPaywallPage user={user} />;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Header onLogout={handleLogout} isLoggedIn={!!user} />
            <main>{loading ? <div className="text-center text-gray-300 py-20">Loading...</div> : renderContent()}</main>
        </div>
    );
}