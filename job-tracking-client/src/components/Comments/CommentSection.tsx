import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import axiosInstance from '../../services/axiosInstance';

interface Comment {
  id: string;
  jobId: string;
  userId: string;
  content: string;
  createdDate: string;
  mentions: string[];
  attachments: Attachment[];
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface CommentSectionProps {
  jobId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ jobId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAppSelector(state => state.auth.user);

  useEffect(() => {
    fetchComments();
  }, [jobId]);

  const fetchComments = async () => {
    try {
      const response = await axiosInstance.get(`/api/comments/job/${jobId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const comment = {
        jobId,
        userId: currentUser?.id,
        content: newComment,
        mentions: [],
        attachments: []
      };

      await axiosInstance.post('/api/comments', comment);
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, commentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload file logic here
      const attachment = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: 'temporary-url' // Replace with actual upload URL
      };

      await axiosInstance.post(`/api/comments/${commentId}/attachments`, attachment);
      await fetchComments();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        
        {/* Comment List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded p-3">
              <div className="flex justify-between items-start">
                <div className="font-medium">{comment.userId}</div>
                <div className="text-sm text-gray-500">
                  {new Date(comment.createdDate).toLocaleString()}
                </div>
              </div>
              <p className="mt-1">{comment.content}</p>
              
              {/* Attachments */}
              {comment.attachments.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium">Attachments:</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {comment.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.fileUrl}
                        className="text-blue-600 hover:underline text-sm flex items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* File Upload */}
              <div className="mt-2">
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, comment.id)}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {/* New Comment Form */}
        <form onSubmit={handleSubmit} className="mt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
