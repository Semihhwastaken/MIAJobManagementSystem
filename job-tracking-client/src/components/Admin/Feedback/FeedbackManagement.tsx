/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Rating } from '@mui/material';
import { StarBorder, Star } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axiosInstance from '../../../services/axiosInstance';
import { FeedbackStatus } from '../../../types/feedback';

const FeedbackManagement: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/feedback' : `/feedback?status=${filter}`;
      const response = await axiosInstance.get(url);
      setFeedbacks(response.data);
    } catch (error) {
      enqueueSnackbar('Geri bildirimler yüklenirken hata oluştu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus, response?: string) => {
    try {
      const requestBody = {
        status: status,
        response: response?.trim() || null // Change this line
      };
      console.log("Request body: ", requestBody);

      await axiosInstance.put(`/feedback/${id}/status`, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      enqueueSnackbar('Geri bildirim durumu güncellendi', { variant: 'success' });
      fetchFeedbacks();
    } catch (error: any) {
      console.error('Error updating feedback:', error.response?.data);
      const errorMessage = error.response?.data?.status?.[0] || 
                          error.response?.data?.update?.[0] ||
                          'Geri bildirim güncellenirken hata oluştu';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Geri Bildirim Yönetimi</h1>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as FeedbackStatus | 'all')}
          className="border rounded-lg p-2"
        >
          <option value="all">Tümü</option>
          <option value="new">Yeni</option>
          <option value="read">Okundu</option>
          <option value="responded">Yanıtlandı</option>
          <option value="archived">Arşivlendi</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((feedback: any) => (
            <div key={feedback.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{feedback.userName}</span>
                    <Rating
                      value={feedback.rating}
                      readOnly
                      emptyIcon={<StarBorder fontSize="inherit" />}
                      icon={<Star fontSize="inherit" />}
                    />
                  </div>
                  <div className="text-sm text-gray-500">{feedback.userRole}</div>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  feedback.status === 'new' ? 'bg-blue-100 text-blue-800' :
                  feedback.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
                  feedback.status === 'responded' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {feedback.status}
                </span>
              </div>

              <p className="mb-4">{feedback.content}</p>

              {feedback.status !== 'responded' && (
                <div className="space-y-4">
                  <textarea
                    placeholder="Yanıtınızı yazın..."
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                    id={`response-${feedback.id}`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFeedbackStatus(
                        feedback.id,
                        2,
                        (document.getElementById(`response-${feedback.id}`) as HTMLTextAreaElement)?.value
                      )}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Yanıtla
                    </button>
                    <button
                      onClick={() => updateFeedbackStatus(feedback.id, 1)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Okundu İşaretle
                    </button>
                    <button
                      onClick={() => updateFeedbackStatus(feedback.id, 3)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Arşivle
                    </button>
                  </div>
                </div>
              )}

              {feedback.adminResponse && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-1">Yanıt:</div>
                  <p className="text-gray-600">{feedback.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
