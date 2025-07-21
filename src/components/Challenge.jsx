import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const Challenge = ({ challenge, user }) => {
  const [submission, setSubmission] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', challenge.id)
        .single();

      if (data) {
        setSubmission(data);
      }
    };

    fetchSubmission();
  }, [challenge.id, user.id]);

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      setError(null);

      const file = e.target.files[0];
      if (!file) {
        throw new Error('You must select an image to upload.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${challenge.id}.${fileExt}`;
      const filePath = `public/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicURL } = supabase.storage.from('images').getPublicUrl(filePath);

      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .insert([
          {
            user_id: user.id,
            challenge_id: challenge.id,
            image_url: publicURL.publicUrl,
          },
        ])
        .select()
        .single();

      if (submissionError) {
        throw submissionError;
      }

      setSubmission(submissionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold">{challenge.description}</h3>
      <p className="text-gray-600">Prize: ${challenge.prize_amount}</p>
      {error && <p className="text-red-500">{error}</p>}
      {submission ? (
        <div>
          <p>Status: <span className={`font-bold ${
            submission.status === 'approved' ? 'text-green-500' :
            submission.status === 'rejected' ? 'text-red-500' :
            'text-yellow-500'
          }`}>{submission.status}</span></p>
          <img src={submission.image_url} alt="Your submission" className="mt-2 h-32" />
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor={`upload-${challenge.id}`} className="block text-sm font-medium text-gray-700">
            Upload your photo
          </label>
          <input
            id={`upload-${challenge.id}`}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="mt-1"
          />
          {uploading && <p>Uploading...</p>}
        </div>
      )}
    </div>
  );
}; 