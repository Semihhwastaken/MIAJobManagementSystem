import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ChatWindow } from '../../components/Chat/ChatWindow';
import { RootState } from '../../redux/store';
import axiosInstance from '../../services/axiosInstance';
import {  
    Box,
    CircularProgress,
    Alert
} from '@mui/material';

interface Conversation {
    userId: string;
    userName: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
    avatar?: string;
}

const Chat: React.FC = () => {
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
    const [, setConversations] = useState<Conversation[]>([]);

    interface User {
        id?: string;
        username: string;
        email: string;
        fullName?: string;
        department?: string;
        title?: string;
        position?: string;
        profileImage?: string;
    }

    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const fetchUnreadCounts = useCallback(async () => {
        if (!currentUser?.id) return;

        try {
            const response = await axiosInstance.get(`/messages/unread/${currentUser.id}`);
            const { unreadCount } = response.data;
            
            // Update conversations with unread counts
            setConversations(prev => prev.map(conv => ({
                ...conv,
                unreadCount: unreadCount[conv.userId] || 0
            })));
        } catch (err) {
            console.error('Error fetching unread counts:', err);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const fetchConversations = async () => {
            if (!currentUser?.id) return;

            try {
                setLoading(true);
                setError(null);
                
                const response = await axiosInstance.get(`/messages/conversations/${currentUser.id}`);
                if (response.data) {
                    setConversations(response.data.map((conv: Conversation) => ({
                        userId: conv.userId,
                        userName: conv.userName,
                        lastMessage: conv.lastMessage,
                        lastMessageTime: conv.lastMessageTime,
                        unreadCount: conv.unreadCount || 0,
                        avatar: conv.avatar
                    })));
                    await fetchUnreadCounts();
                }
            } catch (err) {
                setError('Failed to load conversations. Please try again later.');
                console.error('Error fetching conversations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

        // Set up polling for new messages and updates
        const pollInterval = setInterval(() => {
            fetchConversations();
            fetchUnreadCounts();
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(pollInterval);
    }, [currentUser?.id, fetchUnreadCounts]);

    // Fetch available users
    useEffect(() => {
        const fetchAvailableUsers = async () => {
            if (!currentUser?.id) return;

            try {
                const response = await axiosInstance.get('/Users');
                const users = response.data.filter((user: User) => user.id !== currentUser.id);
                setAvailableUsers(users);
            } catch (err) {
                console.error('Error fetching available users:', err);
                setError('Failed to load available users');
            }
        };

        fetchAvailableUsers();
    }, [currentUser?.id]);

    if (!currentUser) {
        return (
            <Box className="h-full flex items-center justify-center">
                <Alert severity="warning">Please log in to access chat.</Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box className="h-full flex items-center justify-center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Left sidebar - User list */}
            <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
                {/* Search bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="p-4">
                        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
                            {error}
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {availableUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUser({ id: user.id || '', name: user.fullName || user.username })}
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 ease-in-out ${
                                    selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <img
                                            src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&background=random`}
                                            alt={user.fullName || user.username}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {user.fullName || user.username}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {user.department || 'No department'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right side - Chat window */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                {selectedUser ? (
                    <ChatWindow
                        currentUserId={currentUser?.id || ''}
                        selectedUser={selectedUser}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4">
                                <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                                Select a conversation
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Choose a user from the list to start chatting
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
