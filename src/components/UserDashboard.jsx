import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Challenge } from './Challenge';

export const UserDashboard = ({ user, onLogout }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      if (error) {
        setError(error.message);
      } else {
        setChallenges(data);
      }
      setLoading(false);
    };

    fetchChallenges();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {loading && <p>Loading challenges...</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <Challenge key={challenge.id} challenge={challenge} user={user} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}; 