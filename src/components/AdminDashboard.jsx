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
      .select('*, users(full_name, phone_number), challenges(description)')
      .eq('status', 'pending');

    if (submissionsError) {
      setError(submissionsError.message);
    } else {
      const getPath = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) {
          return url.split('/').pop();
        }
        return url;
      };

      const signedUrlPromises = submissionsData.map(async (submission) => {
        const imagePath = getPath(submission.image_url);
        if (!imagePath) {
          return { ...submission, signed_image_url: null };
        }
        const { data, error } = await supabase.storage
          .from('submissions')
          .createSignedUrl(imagePath, 300);
        if (error) {
          console.error(`Error creating signed URL for ${imagePath}:`, error);
          return { ...submission, signed_image_url: null };
        }
        return { ...submission, signed_image_url: data.signedUrl };
      });
      const submissionsWithSignedUrls = await Promise.all(signedUrlPromises);
      setSubmissions(submissionsWithSignedUrls);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChallengesAndSubmissions();
  }, []);

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('challenges')
      .insert([{ description, prize_amount: prizeAmount }]);
    
    if (error) {
      setError(error.message);
    } else {
      setDescription('');
      setPrizeAmount('');
      fetchChallengesAndSubmissions();
    }
  };

  const handleSubmissionUpdate = () => {
    fetchChallengesAndSubmissions();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-500">Pending Submissions</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{submissions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-500">Active Challenges</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{challenges.filter(c => c.is_active).length}</p>
          </div>
        </div>
        
        {error && <p className="bg-red-100 text-red-700 p-4 rounded-md mb-6">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Create Challenge Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-center">Create Challenge</h2>
              <form onSubmit={handleCreateChallenge} className="space-y-6">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="description"
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="prizeAmount" className="block text-sm font-medium text-gray-700">Prize Amount ($)</label>
                  <input
                    id="prizeAmount"
                    type="number"
                    step="0.01"
                    value={prizeAmount}
                    onChange={(e) => setPrizeAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition transform hover:scale-105"
                >
                  Create Challenge
                </button>
              </form>
            </div>
          </div>
          
          {/* Pending Submissions */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-6">Review Submissions</h2>
            {loading ? (
              <p className="text-center text-gray-500">Loading submissions...</p>
            ) : (
              <div className="space-y-8">
                {submissions.length > 0 ? (
                  submissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} onUpdate={handleSubmissionUpdate} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-lg">No pending submissions.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}; 