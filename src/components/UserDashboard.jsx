import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

  const handleReply = (challengeId) => {
    // TODO: Implement reply functionality
    console.log(`Replying to challenge ${challengeId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-md z-10">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Photo Challenges</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 font-semibold text-white bg-red-500 rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {loading && <p className="text-center text-gray-500">Loading challenges...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          <div className="space-y-6">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">
                  A
                </div>
                <div className="ml-4">
                  <div className="bg-white p-4 rounded-lg shadow-md max-w-lg">
                    <p className="font-semibold text-gray-800">Admin</p>
                    <p className="text-gray-700 mt-1">{challenge.description}</p>
                    <p className="text-sm text-gray-500 mt-2">Prize: ${challenge.prize_amount}</p>
                  </div>
                  <button 
                    onClick={() => handleReply(challenge.id)}
                    className="mt-2 ml-2 px-3 py-1 text-sm font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 focus:outline-none"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}; 