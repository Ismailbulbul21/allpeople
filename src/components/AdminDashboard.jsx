import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SubmissionCard } from './SubmissionCard';

export const AdminDashboard = ({ onLogout }) => {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [description, setDescription] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChallengesAndSubmissions = async () => {
    setLoading(true);
    const { data: challengesData, error: challengesError } = await supabase
      .from('challenges')
      .select('*');
    
    if (challengesError) {
      setError(challengesError.message);
    } else {
      setChallenges(challengesData);
    }

    const { data: submissionsData, error: submissionsError } = await supabase
      .from('submissions')
      .select('*, users(full_name), challenges(description)')
      .eq('status', 'pending');

    if (submissionsError) {
      setError(submissionsError.message);
    } else {
      setSubmissions(submissionsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChallengesAndSubmissions();
  }, []);

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('challenges')
      .insert([{ description, prize_amount: prizeAmount }]);
    
    if (error) {
      setError(error.message);
    } else {
      setChallenges([...challenges, data[0]]);
      setDescription('');
      setPrizeAmount('');
      fetchChallengesAndSubmissions();
    }
  };

  const handleSubmissionUpdate = () => {
    fetchChallengesAndSubmissions();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Create Challenge</h2>
            <form onSubmit={handleCreateChallenge} className="bg-white p-6 rounded-lg shadow space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="prizeAmount" className="block text-sm font-medium text-gray-700">Prize Amount</label>
                <input
                  id="prizeAmount"
                  type="number"
                  step="0.01"
                  value={prizeAmount}
                  onChange={(e) => setPrizeAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Create Challenge
              </button>
            </form>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Pending Submissions</h2>
            {loading && <p>Loading submissions...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <div className="space-y-4">
              {submissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} onUpdate={handleSubmissionUpdate} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 