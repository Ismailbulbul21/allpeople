import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SubmissionCard } from './SubmissionCard'; // This will be updated later

export const AdminDashboard = ({ onLogout }) => {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [description, setDescription] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [duration, setDuration] = useState({ value: 24, unit: 'hours' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });
      if (challengesError) throw challengesError;
      setChallenges(challengesData);

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*, users(full_name, phone_number), challenges(description)')
        .eq('status', 'pending');
      if (submissionsError) throw submissionsError;
      
      const getPath = (url) => url && url.startsWith('http') ? url.split('/').pop() : url;
      const signedUrlPromises = submissionsData.map(async (submission) => {
        const imagePath = getPath(submission.image_url);
        if (!imagePath) return { ...submission, signed_image_url: null };
        const { data, error } = await supabase.storage.from('submissions').createSignedUrl(imagePath, 3600);
        return { ...submission, signed_image_url: data?.signedUrl || null };
      });
      setSubmissions(await Promise.all(signedUrlPromises));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateChallenge = async (e) => {
    e.preventDefault();

    const now = new Date();
    if (duration.unit === 'hours') {
      now.setHours(now.getHours() + duration.value);
    } else if (duration.unit === 'days') {
      now.setDate(now.getDate() + duration.value);
    }
    const expires_at = now.toISOString();

    const { error } = await supabase
      .from('challenges')
      .insert([{ description, prize_amount: prizeAmount, expires_at }]);
    if (error) {
      setError(error.message);
    } else {
      setDescription('');
      setPrizeAmount('');
      setDuration({ value: 24, unit: 'hours' });
      fetchData();
    }
  };
  
  const handleDeleteChallenge = async (challengeId) => {
    // First delete related submissions
    await supabase.from('submissions').delete().eq('challenge_id', challengeId);
    // Then delete the challenge
    await supabase.from('challenges').delete().eq('id', challengeId);
    fetchData();
  };

  const handleSubmissionUpdate = () => {
    fetchData();
    setSelectedSubmission(null); // Close the modal on update
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="bg-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button onClick={onLogout} className="px-4 py-2 font-semibold bg-red-600 rounded-md hover:bg-red-700 transition">
            Logout
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && <p className="bg-red-500/50 text-white p-4 rounded-md mb-6">{error}</p>}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Create & Manage Challenges */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/10 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">Create Challenge</h2>
              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                  <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full bg-gray-700 text-white px-3 py-2 mt-1 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                <div>
                  <label htmlFor="prizeAmount" className="block text-sm font-medium text-gray-300">Prize Amount ($)</label>
                  <input id="prizeAmount" type="number" step="0.01" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} required className="w-full bg-gray-700 text-white px-3 py-2 mt-1 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Duration</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                    {[
                      { v: 4, u: 'hours', l: '4 Hours' },
                      { v: 12, u: 'hours', l: '12 Hours' },
                      { v: 1, u: 'days', l: '1 Day' },
                      { v: 3, u: 'days', l: '3 Days' },
                    ].map(p => (
                      <button
                        key={p.l}
                        type="button"
                        onClick={() => setDuration({ value: p.v, unit: p.u })}
                        className={`w-full py-2 text-xs font-semibold rounded-md transition-colors ${
                          duration.value === p.v && duration.unit === p.u
                            ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-indigo-500'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      min="1"
                      value={duration.value}
                      onChange={(e) => setDuration({ ...duration, value: e.target.value ? parseInt(e.target.value, 10) : 1 })}
                      className="w-full bg-gray-700 text-white px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <select 
                      value={duration.unit}
                      onChange={(e) => setDuration({ ...duration, unit: e.target.value })}
                      className="bg-gray-700 text-white px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full px-4 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition transform hover:scale-105">
                  Create Challenge
                </button>
              </form>
            </div>
            
            <div className="bg-white/10 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">Manage Challenges</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {challenges.map(c => (
                  <div key={c.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                    <p className="text-sm">{c.description}</p>
                    <button onClick={() => handleDeleteChallenge(c.id)} className="text-red-400 hover:text-red-300 transition text-xs font-semibold">
                      DELETE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column: Submissions */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-6">Review Submissions ({submissions.length})</h2>
            {loading ? <p className="text-center">Loading submissions...</p> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {submissions.map((submission) => (
                  <div key={submission.id} className="bg-white/10 p-2 rounded-xl shadow-lg space-y-3">
                    <img 
                      src={submission.signed_image_url} 
                      alt="Submission" 
                      className="w-full h-40 object-cover rounded-lg cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                    />
                    <button 
                      onClick={() => setSelectedSubmission(submission)}
                      className="w-full bg-indigo-600 text-white text-sm font-bold py-2 rounded-md hover:bg-indigo-700 transition"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedSubmission(null)}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-auto" onClick={(e) => e.stopPropagation()}>
              <SubmissionCard submission={selectedSubmission} onUpdate={handleSubmissionUpdate} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}; 