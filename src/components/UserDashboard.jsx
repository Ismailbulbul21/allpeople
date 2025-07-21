import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SubmissionModal } from './SubmissionModal';

// A more realistic timestamp formatter
const formatTimestamp = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const UserDashboard = ({ user, onLogout }) => {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const chatEndRef = useRef(null);

  const fetchChallengesAndSubmissions = async () => {
    setLoading(true);
    const { data: challengesData, error: challengesError } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (challengesError) {
      setError(challengesError.message);
    } else {
      setChallenges(challengesData);
    }

    const { data: submissionsData, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
      
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [challenges, submissions]);

  const handleOpenModal = (challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleCloseModal = () => {
    setSelectedChallenge(null);
  };

  const handleSubmitted = () => {
    fetchChallengesAndSubmissions(); // Re-fetch all data
  };

  const combinedMessages = [...challenges, ...submissions]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const submittedChallengeIds = new Set(submissions.map(s => s.challenge_id));

  return (
    <div className="flex flex-col h-screen bg-gray-200">
      {/* Chat Header */}
      <header className="bg-green-600 text-white p-4 flex items-center shadow-md z-10">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center font-bold text-xl text-gray-600">
          A
        </div>
        <div className="ml-4">
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-sm text-green-100">Online</p>
        </div>
        <button
          onClick={onLogout}
          className="ml-auto px-4 py-2 font-semibold bg-red-500 rounded-lg shadow-md hover:bg-red-600 focus:outline-none"
        >
          Logout
        </button>
      </header>

      {/* Chat Body */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          {loading && <p className="text-center text-gray-500">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          <div className="space-y-4">
            {combinedMessages.map((message) => {
              const isChallenge = 'description' in message;
              const hasSubmitted = isChallenge && submittedChallengeIds.has(message.id);

              if (isChallenge) {
                return (
                  <div key={`challenge-${message.id}`} className="flex items-end">
                    <button
                      onClick={() => !hasSubmitted && handleOpenModal(message)}
                      disabled={hasSubmitted}
                      className={`bg-white p-4 rounded-2xl shadow-md max-w-lg transition transform ${!hasSubmitted && 'hover:scale-105 cursor-pointer'} ${hasSubmitted && 'opacity-60'}`}
                    >
                      <p className="font-bold text-indigo-600">New Challenge!</p>
                      <p className="text-gray-800 mt-2 text-lg">{message.description}</p>
                      <p className="font-semibold text-green-500 mt-2 text-md">Prize: ${message.prize_amount}</p>
                      <p className="text-xs text-gray-400 mt-3 text-right">
                        {formatTimestamp(message.created_at)}
                      </p>
                      {hasSubmitted && <p className="text-sm text-green-600 font-semibold mt-2">Submission sent!</p>}
                    </button>
                  </div>
                );
              } else {
                // This is a submission
                return (
                  <div key={`submission-${message.id}`} className="flex justify-end">
                    <div className="bg-green-200 p-4 rounded-2xl shadow-md max-w-lg">
                      {message.signed_image_url && (
                        <img src={message.signed_image_url} alt="Submission" className="rounded-lg max-h-60" />
                      )}
                      <p className="text-xs text-gray-500 mt-2 text-right">
                        {formatTimestamp(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              }
            })}
            <div ref={chatEndRef} />
          </div>
        </div>
      </main>
      
      {selectedChallenge && (
        <SubmissionModal
          challenge={selectedChallenge}
          user={user}
          onClose={handleCloseModal}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}; 