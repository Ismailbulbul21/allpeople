import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (fetchError || !users) {
      setError('Invalid phone number or password');
      setLoading(false);
      return;
    }

    // In a real app, you'd use a secure password hashing library like bcrypt.
    // For this example, we'll do a plain text comparison.
    if (users.password !== password) {
      setError('Invalid phone number or password');
      setLoading(false);
      return;
    }

    onLogin(users);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('users')
      .insert([{ full_name: fullName, phone_number: phoneNumber, password: password }])
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    onLogin(data);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {isLogin ? 'Welcome Back!' : 'Create Your Account'}
        </h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
          {!isLogin && (
            <div>
              <label
                htmlFor="full-name"
                className="text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="phone-number"
              className="text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              id="phone-number"
              name="phone-number"
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
            </button>
          </div>
        </form>
        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}; 