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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition transform hover:scale-105">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Image Section */}
        <div className="md:col-span-1">
          {submission.signed_image_url ? (
            <img src={submission.signed_image_url} alt="Submission" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">Image not available</p>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="md:col-span-1 p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Challenge</p>
            <p className="mb-4 text-gray-700">{submission.challenges ? submission.challenges.description : 'Unknown Challenge'}</p>
            
            <p className="text-sm font-semibold text-indigo-600">Submitted by</p>
            <p className="text-gray-900 font-bold">{submission.users ? submission.users.full_name : 'Unknown User'}</p>
            <p className="text-gray-600">{submission.users ? submission.users.phone_number : 'N/A'}</p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => handleUpdateStatus('approved')}
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              Approve
            </button>
            <button
              onClick={() => handleUpdateStatus('rejected')}
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 