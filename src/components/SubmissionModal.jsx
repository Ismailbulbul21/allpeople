import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const SubmissionModal = ({ challenge, user, onClose, onSubmitted }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a photo to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }
      
    // Create submission record in the database
    const { error: dbError } = await supabase
      .from('submissions')
      .insert([
        {
          user_id: user.id,
          challenge_id: challenge.id,
          image_url: filePath, // Store the filePath, not the public URL
        },
      ]);

    if (dbError) {
      setError(dbError.message);
    } else {
      onSubmitted();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Submit to Challenge</h2>
        <p className="mb-6 text-gray-600">{challenge.description}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Upload your photo
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 