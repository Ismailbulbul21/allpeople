import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const SubmissionCard = ({ submission, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    const updateData = { status };
    if (status === 'approved') {
      updateData.is_winner = true;
    }
    await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submission.id);
    onUpdate();
    // No need to set loading to false, as the component will unmount
  };

  return (
    <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Image Section */}
      <div className="md:col-span-2">
        <img src={submission.signed_image_url} alt="Submission" className="w-full h-auto object-contain rounded-lg" style={{ maxHeight: '80vh' }} />
      </div>

      {/* Details & Actions Section */}
      <div className="p-6 bg-gray-900 rounded-r-xl flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Submission Details</h3>
          
          <p className="text-sm font-semibold text-indigo-400">Challenge</p>
          <p className="mb-4 text-gray-300">{submission.challenges ? submission.challenges.description : 'Unknown Challenge'}</p>
          
          <p className="text-sm font-semibold text-indigo-400">Submitted by</p>
          <p className="text-white font-bold">{submission.users ? submission.users.full_name : 'Unknown User'}</p>
          <p className="text-gray-400">{submission.users ? submission.users.phone_number : 'N/A'}</p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-4">
          <button
            onClick={() => handleUpdateStatus('approved')}
            disabled={loading}
            className="w-full px-4 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition transform hover:scale-105"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => handleUpdateStatus('rejected')}
            disabled={loading}
            className="w-full px-4 py-3 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition transform hover:scale-105"
          >
            {loading ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}; 