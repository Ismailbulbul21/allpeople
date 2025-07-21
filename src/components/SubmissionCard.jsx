import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const SubmissionCard = ({ submission, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    await supabase
      .from('submissions')
      .update({ status })
      .eq('id', submission.id);
    onUpdate();
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <p><strong>User:</strong> {submission.users.full_name}</p>
      <p><strong>Challenge:</strong> {submission.challenges.description}</p>
      <img src={submission.image_url} alt="Submission" className="mt-2 h-32" />
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => handleUpdateStatus('approved')}
          disabled={loading}
          className="px-4 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => handleUpdateStatus('rejected')}
          disabled={loading}
          className="px-4 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}; 