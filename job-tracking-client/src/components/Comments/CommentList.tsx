/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import axiosInstance from '../../services/axiosInstance';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { 
  ChatBubbleLeftIcon, 
  PaperClipIcon, 
  TagIcon, 
  CalendarIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdDate: string;
  priority: string;
  tags: string[];
  dueDate?: string;
  mentions: string[];
  attachments: Attachment[];
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface User {
  id: string;
  fullName: string;
  profileImage?: string;
  email: string;
}

interface CommentListProps {
  taskId: string;
  refreshTrigger?: number; // Yorumlar güncellendiğinde yeniden yükleme tetikleyicisi
}

const CommentList: React.FC<CommentListProps> = ({ taskId, refreshTrigger = 0 }) => {
  const { isDarkMode } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{[key: string]: User}>({});
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/comment/task/${taskId}`);
        const commentsData = response.data as Comment[];
        setComments(commentsData);
        
        // Yorumlardaki kullanıcı ID'lerini topla
        const userIds = [...new Set(commentsData.map(comment => comment.userId))];
        
        // Kullanıcı bilgilerini getir
        await fetchUserDetails(userIds);
      } catch (err) {
        console.error('Yorumlar yüklenirken hata oluştu:', err);
        setError('Yorumlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchComments();
    }
  }, [taskId, refreshTrigger]);

  const fetchUserDetails = async (userIds: string[]) => {
    try {
      const userDetails: {[key: string]: User} = {};
      
      // Her kullanıcı için bilgileri getir
      for (const userId of userIds) {
        try {
          const response = await axiosInstance.get(`/users/${userId}`);
          userDetails[userId] = response.data;
        } catch (err) {
          console.error(`Kullanıcı bilgileri alınamadı (${userId}):`, err);
          // Varsayılan kullanıcı bilgisi
          userDetails[userId] = {
            id: userId,
            fullName: 'Bilinmeyen Kullanıcı',
            email: '',
          };
        }
      }
      
      setUsers(userDetails);
    } catch (err) {
      console.error('Kullanıcı bilgileri alınırken hata oluştu:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800';
      case 'medium':
        return isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800';
      case 'low':
        return isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800';
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: tr });
    } catch (err) {
      return 'Geçersiz tarih';
    }
  };

  const handleDownloadAttachment = async (fileUrl: string, fileName: string) => {
    try {
      const response = await axiosInstance.get(fileUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Dosya indirme hatası:', err);
      alert('Dosya indirilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
        <span>Yorumlar yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-md ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
        <p>{error}</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className={`p-6 text-center rounded-md ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Bu görev için henüz yorum yapılmamış.</p>
        <p className="mt-2 text-sm">İlk yorumu yapmak için "Yorum Ekle" butonuna tıklayın.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <h3 className="text-lg font-semibold mb-4">
        <ChatBubbleLeftIcon className="inline-block h-5 w-5 mr-2" />
        Yorumlar ({comments.length})
      </h3>
      
      {comments.map((comment) => (
        <div 
          key={comment.id} 
          className={`p-4 rounded-lg shadow-sm ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Kullanıcı Avatarı */}
            <div className="flex-shrink-0">
              {users[comment.userId]?.profileImage ? (
                <img 
                  src={users[comment.userId].profileImage} 
                  alt={users[comment.userId]?.fullName || 'Kullanıcı'} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {(users[comment.userId]?.fullName || 'K')[0].toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Yorum İçeriği */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <span className="font-medium">{users[comment.userId]?.fullName || 'Bilinmeyen Kullanıcı'}</span>
                  {comment.userId === currentUser?.id && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Siz
                    </span>
                  )}
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatDate(comment.createdDate)}
                </span>
              </div>
              
              <div className="mt-1 whitespace-pre-wrap break-words">
                {comment.content}
              </div>
              
              {/* Etiketler */}
              {comment.tags && comment.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {comment.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Öncelik */}
              {comment.priority && (
                <div className="mt-3">
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getPriorityColor(comment.priority)}`}>
                    {getPriorityIcon(comment.priority)}
                    <span className="ml-1">
                      {comment.priority === 'high' ? 'Yüksek Öncelik' : 
                       comment.priority === 'medium' ? 'Orta Öncelik' : 'Düşük Öncelik'}
                    </span>
                  </span>
                </div>
              )}
              
              {/* Bitiş Tarihi */}
              {comment.dueDate && (
                <div className={`mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <CalendarIcon className="inline-block h-4 w-4 mr-1" />
                  Bitiş Tarihi: {formatDate(comment.dueDate)}
                </div>
              )}
              
              {/* Ekler */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ekler ({comment.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {comment.attachments.map((attachment, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded ${
                          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        } cursor-pointer transition-colors`}
                        onClick={() => handleDownloadAttachment(attachment.fileUrl, attachment.fileName)}
                      >
                        <div className="flex items-center">
                          <PaperClipIcon className="h-4 w-4 mr-2" />
                          <span className="text-sm truncate max-w-[200px]">{attachment.fileName}</span>
                        </div>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {Math.round(attachment.fileSize / 1024)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList; 