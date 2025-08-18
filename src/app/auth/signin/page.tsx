"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = await signIn('credentials', {
            redirect: false,
            username,
            password,
        });

        if (result?.error) {
            setError('Invalid username or password');
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="p-8 bg-gray-800 rounded-lg shadow-xl w-96">
                <h1 className="text-2xl font-bold text-white mb-6">Sign In</h1>
                {error && <p className="bg-red-500 text-white p-2 rounded mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
