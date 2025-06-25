
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function ResetPassword() {
    const supabase = useSupabaseClient();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);

    useEffect(() => {
        // Check if this is a password reset session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsValidSession(true);
            } else {
                setError('Invalid or expired reset link. Please request a new password reset.');
            }
        };

        // Handle the auth callback from email link
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'PASSWORD_RECOVERY' && session) {
                    setIsValidSession(true);
                }
            }
        );

        checkSession();

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
        setLoading(false);
    };

    if (!isValidSession && !error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p className="text-center text-gray-300">Verifying reset link...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <header className="flex justify-center items-center p-4 border-b border-gray-700">
                <div className="text-2xl font-bold flex items-center gap-2">
                    <div className="w-8 h-9 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                    Estat Predict
                </div>
            </header>

            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border border-gray-700">
                    <h2 className="text-3xl font-bold text-center mb-2">Reset Your Password</h2>
                    <p className="text-center text-gray-400 mb-6">Enter your new password below</p>

                    {isValidSession ? (
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-400">New Password</label>
                                <div className="relative">
                                    <input
                                        type={isPasswordVisible ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                    >
                                        {isPasswordVisible ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-bold text-gray-400">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={isConfirmVisible ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full p-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmVisible(!isConfirmVisible)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                    >
                                        {isConfirmVisible ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-3 rounded-lg text-lg disabled:bg-gray-500"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button 
                                onClick={() => router.push('/')}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}

                    {message && <p className="text-green-400 text-center mt-4">{message}</p>}
                    {error && isValidSession && <p className="text-red-500 text-center mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
}
