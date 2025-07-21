import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SubmissionModal } from './SubmissionModal';

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const UserDashboard = ({ user, onLogout }) => {
  const [challenges, setChallenges] = useState([]);
  const [publicSubmissions, setPublicSubmissions] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const chatEndRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (challengesError) throw challengesError;
      setChallenges(challengesData);

      const { data: publicFeedData, error: publicFeedError } = await supabase
        .from('public_submissions_feed')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (publicFeedError) throw publicFeedError;
      setPublicSubmissions(publicFeedData);

      const { data: mySubmissionsData, error: mySubmissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (mySubmissionsError) throw mySubmissionsError;

      const getPath = (url) => (url && url.startsWith('http') ? url.split('/').pop() : url);

      const signedUrlPromises = mySubmissionsData.map(async (submission) => {
        const imagePath = getPath(submission.image_url);
        if (!imagePath) return { ...submission, signed_image_url: null };
        const { data, error } = await supabase.storage.from('submissions').createSignedUrl(imagePath, 300);
        return { ...submission, signed_image_url: data?.signedUrl || null };
      });
      
      const submissionsWithSignedUrls = await Promise.all(signedUrlPromises);
      setMySubmissions(submissionsWithSignedUrls);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('public:public_submissions_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'public_submissions_feed' }, 
        (payload) => setPublicSubmissions(current => [...current, payload.new])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [challenges, publicSubmissions]);

  const handleOpenModal = (challenge) => setSelectedChallenge(challenge);
  const handleCloseModal = () => setSelectedChallenge(null);
  const handleSubmitted = () => fetchData();

  const mySubmissionIds = new Set(mySubmissions.map(s => s.id));
  const mySubmittedChallengeIds = new Set(mySubmissions.map(s => s.challenge_id));

  const combinedMessages = [...challenges, ...publicSubmissions]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center shadow-sm z-10">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-xl text-gray-500">
            A
          </div>
          <div className="ml-4">
            <h1 className="text-lg font-bold text-gray-800">Community Feed</h1>
            <p className="text-sm text-green-500 font-semibold">Live</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="ml-auto px-4 py-2 font-semibold text-white bg-red-500 rounded-lg shadow-md hover:bg-red-600 focus:outline-none transition"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-200">
        <div className="max-w-4xl mx-auto space-y-6">
          {loading && <p className="text-center text-gray-500 py-10">Loading feed...</p>}
          {error && <p className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</p>}
          
          {combinedMessages.map((message) => {
            if ('description' in message) { // This is a challenge
              const hasSubmitted = mySubmittedChallengeIds.has(message.id);
              return (
                <div key={`challenge-${message.id}`} className="flex justify-start">
                  <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-md max-w-lg">
                    <p className="font-bold text-indigo-600">New Photo Challenge!</p>
                    <p className="text-gray-800 mt-2 text-base">{message.description}</p>
                    <p className="font-semibold text-green-600 mt-3">Prize: ${message.prize_amount}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-gray-400">{formatTimestamp(message.created_at)}</span>
                      {hasSubmitted ? (
                        <span className="px-3 py-1 text-sm font-bold text-green-700 bg-green-100 rounded-full">✓ Submitted</span>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(message)}
                          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                        >
                          Submit Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else { // This is a submission from the public feed
              const isMySubmission = mySubmissionIds.has(message.id);
              const mySubmissionData = isMySubmission ? mySubmissions.find(s => s.id === message.id) : null;
              
              if (isMySubmission && mySubmissionData) {
                return (
                  <div key={`submission-${message.id}`} className="flex justify-end">
                    <div className="bg-green-100 p-3 rounded-xl rounded-br-none shadow-md max-w-sm">
                      <p className="text-sm font-semibold text-gray-800 mb-2">You submitted:</p>
                      {mySubmissionData.signed_image_url ? (
                        <img src={mySubmissionData.signed_image_url} alt="Your submission" className="rounded-lg max-h-60" />
                      ) : (
                        <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-lg">
                          <p className="text-gray-500">Loading image...</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2 text-right">{formatTimestamp(message.created_at)}</p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`feed-${message.id}`} className="py-2 text-center">
                    <p className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full inline-block">
                      <span className="font-bold">{message.full_name}</span> has submitted a photo!
                    </p>
                  </div>
                );
              }
            }
          })}
          <div ref={chatEndRef} />
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