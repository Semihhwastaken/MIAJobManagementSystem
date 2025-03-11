/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface TeamMember {
    id: string;
    username: string;
    fullName: string;
    department?: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

interface Team {
    id: string;
    name: string;
    members: TeamMember[];
}

interface UserData {
    id: string;
    username: string;
    fullName: string;
    department?: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

const Chat: React.FC = () => {
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; profilImage?: string; } | null>(null);
    const [, setConversations] = useState<Conversation[]>([]);
    const [expandedTeams, setExpandedTeams] = useState<{ [key: string]: boolean }>({});
    const [searchQuery, setSearchQuery] = useState(''); // Add this line

    // Update the userTeams state with proper typing
    const [userTeams, setUserTeams] = useState<Team[]>([]);

    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
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

       
    }, [currentUser?.id, fetchUnreadCounts]);

    // Modify the useEffect for fetching teams with proper typing
    useEffect(() => {
        const fetchUserTeams = async () => {
            if (!currentUser?.id) return;

            try {
                const teamsResponse = await axiosInstance.get<Team[]>('/Team');
                const usersResponse = await axiosInstance.get<UserData[]>('/Users');
                const usersMap = new Map(usersResponse.data.map(user => [user.id, user]));

                const enrichedTeams = teamsResponse.data
                    .filter(team => team.members.some(member => member.id === currentUser.id))
                    .map(team => ({
                        ...team,
                        members: team.members.map(member => {
                            const fullUserData = usersMap.get(member.id);
                            return {
                                ...member,
                                fullName: fullUserData?.fullName || member.fullName || member.username || 'İsimsiz Üye',
                                username: fullUserData?.username || member.username,
                                department: fullUserData?.department || member.department,
                                title: fullUserData?.title || member.title,
                                position: fullUserData?.position || member.position,
                                profileImage: fullUserData?.profileImage || member.profileImage
                            };
                        })
                    }));

                console.log('Enriched team members:', enrichedTeams);
                setUserTeams(enrichedTeams);
            } catch (err) {
                console.error('Error fetching teams:', err);
                setError('Failed to load teams');
            }
        };

        fetchUserTeams();
    }, [currentUser?.id]);

    const toggleTeam = (teamId: string) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamId]: !prev[teamId]
        }));
    };

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

    const filteredTeams = userTeams.map(team => ({
        ...team,
        members: team.members.filter(member => 
            member.id !== currentUser?.id && // Don't show current user
            (member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             member.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             member.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })).filter(team => team.members.length > 0); // Only show teams with matching members

    const renderLeftSidebar = () => (
        <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            {/* Modern Search bar */}
            <div className="p-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-0 
                        focus:ring-2 focus:ring-blue-500 dark:text-gray-200 shadow-sm
                        placeholder:text-gray-400 text-sm transition-all duration-200 ease-in-out"
                    />
                    <div className="absolute right-4 top-3.5 text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Teams and Members List with modern styling */}
            <div className="px-3 pb-3 space-y-2">
                {filteredTeams.map((team) => (
                    <div key={team.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                        {/* Team Header with modern styling */}
                        <div
                            onClick={() => toggleTeam(team.id)}
                            className={`p-4 cursor-pointer transition-all duration-200 ease-in-out
                                hover:bg-gray-100 dark:hover:bg-gray-700 
                                flex justify-between items-center rounded-2xl
                                ${expandedTeams[team.id] ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {team.name}
                            </span>
                            <svg
                                className={`w-5 h-5 transform transition-transform duration-200 text-gray-500
                                    ${expandedTeams[team.id] ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        
                        {/* Team Members with modern styling */}
                        {expandedTeams[team.id] && (
                            <div className="p-2">
                                {team.members
                                    .filter((member: any) => member.id !== currentUser?.id)
                                    .map((member: any) => (
                                        <div
                                            key={member.id}
                                            onClick={() => setSelectedUser({
                                                id: member.id,
                                                name: member.fullName || member.username,
                                                profilImage: member.profileImage
                                            })}
                                            className={`p-3 rounded-xl transition-all duration-200 ease-in-out
                                                hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer mb-1
                                                ${selectedUser?.id === member.id ? 
                                                    'bg-blue-50 dark:bg-blue-900/30 shadow-sm' : ''}`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="relative flex-shrink-0">
                                                    <img
                                                        src={member.profileImage || 
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                                member.fullName || member.username)}&background=random`}
                                                        alt={member.fullName || member.username}
                                                        className="h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-700"
                                                    />
                                                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 
                                                        ring-2 ring-white dark:ring-gray-700"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 
                                                        truncate leading-tight">
                                                        {member.fullName || member.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 
                                                        truncate mt-1">
                                                        {member.title || member.position || member.department || 'Ekip Üyesi'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {renderLeftSidebar()}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-l-3xl shadow-xl">
                {selectedUser ? (
                    <ChatWindow
                        currentUserId={currentUser?.id || ''}
                        selectedUser={selectedUser}
                        onClose={() => setSelectedUser(null)} // Add this line
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
