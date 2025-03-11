import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import axiosInstance from '../../services/axiosInstance';
import { Rating } from '@mui/material';
import { Star } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { User } from '../../types/user';
import { getInitials } from '../../utils/helper';

interface FeedbackFormProps {
  onSubmit?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [isPublic, setIsPublic] = useState(false);
  const user = useSelector<RootState, User | null>(state => state.auth.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Geri bildirim göndermek için giriş yapmalısınız.');
      return;
    }

    if (!content || content.length < 10) {
      toast.error('Lütfen en az 10 karakter içeren bir geri bildirim yazın.');
      return;
    }

    try {
      await axiosInstance.post('/feedback', {
        userId: user.id,
        userName: user.fullName || user.username,
        userRole: user.role || user.title || 'Kullanıcı',
        content,
        rating,
        isPublic,
        userAvatar: user.profileImage || getInitials(user.fullName || user.username)
      });

      toast.success('Geri bildiriminiz için teşekkürler!');
      setContent('');
      setRating(5);
      setIsPublic(false);
      onSubmit?.();
    } catch (error) {
      toast.error('Geri bildirim gönderilirken bir hata oluştu.');
      console.error('Feedback error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Değerlendirmeniz
        </label>
        <Rating
          value={rating}
          onChange={(_, newValue) => setRating(newValue || 5)}
          icon={<Star fontSize="large" />}
          emptyIcon={<Star fontSize="large" />}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Geri Bildiriminiz
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          rows={4}
          placeholder="Deneyiminizi paylaşın..."
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label className="ml-2 text-sm text-gray-700">
          Bu geri bildirimi herkese açık olarak paylaş
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
      >
        Gönder
      </button>
    </form>
  );
};

export default FeedbackForm;
