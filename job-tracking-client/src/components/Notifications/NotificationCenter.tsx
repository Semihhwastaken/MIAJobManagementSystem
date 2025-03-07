import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { notificationAxiosInstance } from '../../services/axiosInstance';
import SignalRService from '../../services/signalRService';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../types/notification';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated, token } = useAppSelector(state => state.auth);
  const signalRService = SignalRService.getInstance();
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<Notification[]>([]);
  const isMounted = useRef(true);

  const [toasts, setToasts] = useState<(Notification & { id: string })[]>([]);
  const toastContainerRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Create toast container if it doesn't exist
    if (!toastContainerRef.current) {
      const container = document.createElement('div');
      container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(container);
      toastContainerRef.current = container;
    }
    
    return () => {
      // Clean up toast container on unmount
      if (toastContainerRef.current && document.body.contains(toastContainerRef.current)) {
        try {
          document.body.removeChild(toastContainerRef.current);
          toastContainerRef.current = null;
        } catch (error) {
          console.error('Error removing toast container:', error);
        }
      }
    };
  }, []);

  // Component unmount kontrolü için ref
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  const showNotificationToast = (notification: Notification) => {
    if (!isComponentMounted.current || !notification.id) return;
    
    setToasts(prev => [
      { ...notification, id: notification.id as string },
      ...prev.slice(0, 2) // En fazla 3 toast göster (yeni + önceki 2)
    ]);
  };

  const handleNewNotification = useCallback((notification: Notification) => {
    if (!isComponentMounted.current) return;

    setNotifications(prevNotifications => {
      const notificationExists = prevNotifications.some(n => n.id === notification.id);
      if (notificationExists) {
        return prevNotifications;
      }
      const newNotifications = [notification, ...prevNotifications];
      return newNotifications;
    });
    setUnreadCount(prev => prev + 1);
    showNotificationToast(notification);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !isAuthenticated || !token) {
      console.warn('Waiting for authentication data...', {
        userId: user?.id,
        isAuthenticated,
        hasToken: !!token
      });
      return;
    }
  console.log('Authentication data loaded:', {
    userId: user.id,
    username: user.username,
    isAuthenticated
  });
  const initializeSignalR = async () => {
    try {
      if (user?.id) {
        await signalRService.startConnection(user.id);
        signalRService.onReceiveNotification(handleNewNotification);
        signalRService.getConnectedUsersCount().then(count => {
          console.log('Connected users count:', count);
        });
      }
    } catch (error) {
      console.error('SignalR connection error:', error);
    }
  };
  const fetchNotifications = async () => {
    if (!user?.id) {
      console.warn('Cannot fetch notifications: User ID not found');
      return;
    }
  try {
    const url = `/Notifications/user/${user.id}`;
    console.log('Fetching notifications from:', url);
  const response = await notificationAxiosInstance.get(url);
  if (Array.isArray(response.data)) {
    console.log('Notifications fetched successfully:', response.data.length);
    setNotifications(response.data);
    notificationsRef.current = response.data;
    const unreadNotifications = response.data.filter((n: Notification) => !n.isRead);
    setUnreadCount(unreadNotifications.length);
  } else {
    console.error('Invalid API response format:', response.data);
    setNotifications([]);
    setUnreadCount(0);
  }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    setNotifications([]);
    setUnreadCount(0);
  }
  };
  fetchNotifications();
  initializeSignalR();
  return () => {
    signalRService.onReceiveNotification(() => {}); // Cleanup SignalR subscription
  };
  }, [user?.id, isAuthenticated, token, user?.username, handleNewNotification]);
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationAxiosInstance.put(`/Notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
  try {
    await notificationAxiosInstance.put(`/Notifications/user/${user.id}/read-all`);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
  };
  const getNotificationIcon = (type: string | number | undefined) => {
    if (!type) {
      return '📢';
    }
    const typeString = typeof type === 'number' ? type.toString() : type.toLowerCase();
    switch (typeString) {
      case 'comment':
      case '0':
        return '💬';
      case 'mention':
      case '1':
        return '@';
      case 'taskassigned':
      case 'task_assigned':
      case '2':
        return '📋';
      case 'taskupdated':
      case 'task_updated':
      case '3':
        return '🔄';
      case 'taskcompleted':
      case 'task_completed':
      case '4':
        return '✅';
      case 'taskdeleted':
      case 'task_deleted':
      case '5':
        return '🗑️';
      case 'taskoverdue':
      case 'task_overdue':
      case '6':
        return '⚠️';
      case 'reminder':
      case '7':
        return '⏰';
      case 'message':
      case '8':
        return '✉️';
      case 'calendar_event_created':
      case '9':
        return '📅';
      case 'calendar_event_updated':
      case '10':
        return '🗓️';
      case 'calendar_event_deleted':
      case '11':
        return '🗑️';
      case 'TeamStatusCreated':
      case '12':
        return '📊';
      case 'TeamStatusUpdated':
      case '13':
        return '🐦‍🔥'
      case 'TeamStatusDeleted':
      case '14':
        return '🗑️';
        
      default:
        return '📢';
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    // Component mount olduğunda
    return () => {
      // Component unmount olduğunda
      isMounted.current = false;
    };
  }, []);

  const removeNotification = (id: string) => {
    if (!isMounted.current) return;
    
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Şimdi';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${diffInHours} saat önce`;
    } else if (diffInDays < 7) {
      return `${diffInDays} gün önce`;
    } else {
      return formatDate(date);
    }
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (!isComponentMounted.current) return;

    const newNotification: Partial<Notification> = {
      id: Math.random().toString(36).substring(7),
      message,
      type,
      createdDate: new Date().toISOString()
    };

    setNotifications(prev => [...prev, newNotification as Notification]);

    if (newNotification.id) {
      setTimeout(() => removeNotification(newNotification.id as string), 5000);
    }
  };

  // User bilgilerini güvenli bir şekilde kullan
  const userInfo = {
    id: user?.id,
    email: user?.email,
    fullName: user?.fullName,
    role: user?.role
  };

  console.log('Authentication data loaded:', {
    userId: userInfo.id,
    email: userInfo.email,
    isAuthenticated
  });

  return (
    <div className="relative" ref={notificationRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 11 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-1 z-50 border border-gray-100 dark:border-gray-700 max-h-[80vh] md:absolute md:max-h-[600px]"
            style={{
              top: "100%",
              marginRight: "1rem",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="sticky top-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bildirimler</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-3 py-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Tümünü Okundu İşaretle
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-4rem)] md:max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
              <AnimatePresence>
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-50 dark:border-gray-700 transition-colors ${
                        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => notification.id && handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-1">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 whitespace-nowrap">
                              {getRelativeTime(notification.createdDate)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    <svg 
                      className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">Henüz bildirim yok</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
