import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import SignalRService from '../../services/signalRService';
import { Message } from '../../types/message';
import axiosInstance from '../../services/axiosInstance';
import {
    Paper,
    TextField,
    IconButton,
    Typography,
    Box,
    Avatar,
    CircularProgress,
    Alert,
} from '@mui/material';
import { 
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Attachment {
    url: string;
    fileName: string;
}

interface ChatWindowProps {
    currentUserId: string;
    selectedUser: {
        id: string;
        name: string;
    };
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, selectedUser }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);
    
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const signalRService = SignalRService.getInstance();

    const loadMessages = async () => {
        if (!currentUser?.id) return;

        try {
            setLoading(true);
            setError(null);

            const response = await axiosInstance.get(`/Messages/conversation/${currentUserId}/${selectedUser.id}`);
            if (response.data) {
                setMessages(response.data.reverse());
            }
        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Failed to load messages. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        if (element.scrollTop === 0 && hasMore && !loading) {
            loadMessages();
        }
    }, [hasMore, loadMessages, loading]);

    useEffect(() => {
        loadMessages();
    }, [selectedUser.id]);

    const checkOnlineStatus = async () => {
        try {
            const response = await axiosInstance.get(`/users/${selectedUser.id}/online`);
            setIsReceiverOnline(response.data.isOnline);
        } catch (err) {
            console.error('Error checking online status:', err);
        }
    };

    useEffect(() => {
        checkOnlineStatus();
        const statusInterval = setInterval(checkOnlineStatus, 30000);
        return () => clearInterval(statusInterval);
    }, [selectedUser.id]);

    useEffect(() => {
        const handleNewMessage = (message: Message) => {
            if (message.senderId === selectedUser.id || message.senderId === currentUserId) {
                if (messages.some(m => m.id === message.id)) {
                    return;
                }
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            }
        };

        signalRService.onReceiveMessage(handleNewMessage);

        return () => {
            signalRService.removeMessageCallback(handleNewMessage);
        };
    }, [currentUserId, selectedUser.id, messages]);

    useEffect(() => {
        const initializeSignalR = async () => {
            if (currentUser?.id) {
                try {
                    await signalRService.startConnection(currentUser.id);
                    
                    signalRService.onUserTyping((userId: string) => {
                        if (userId === selectedUser.id) {
                            setIsTyping(true);
                        }
                    });

                    signalRService.onUserStoppedTyping((userId: string) => {
                        if (userId === selectedUser.id) {
                            setIsTyping(false);
                        }
                    });

                    signalRService.onMessageRead((messageId: string) => {
                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === messageId ? { ...msg, isRead: true } : msg
                            )
                        );
                    });

                } catch (error) {
                    console.error('SignalR connection error:', error);
                    setError('Failed to establish real-time connection. Messages may be delayed.');
                }
            }
        };

        initializeSignalR();

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [currentUser?.id, selectedUser.id]);

    const handleTyping = () => {
        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
        }

        axiosInstance.post(`/messages/typing/${currentUser?.id}/${selectedUser.id}`)
            .catch(err => console.error('Error sending typing notification:', err));

        typingTimeoutRef.current = window.setTimeout(() => {
            setIsTyping(false);
        }, 3000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        try {
            let attachments: Attachment[] = [];
            
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                
                const uploadResponse = await axiosInstance.post('/Messages/upload', formData);
                attachments = [{
                    url: uploadResponse.data.url,
                    fileName: selectedFile.name
                }];
            }

            const messageDto = {
                receiverId: selectedUser.id,
                content: newMessage,
                subject: 'Chat Message' // Required by the backend
            };

            const response = await axiosInstance.post(`/Messages/send/${currentUserId}`, messageDto);
            
            if (response.data) {
                setMessages(prev => [...prev, response.data]);
                setNewMessage('');
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await axiosInstance.delete(`/message/${messageId}`, {
                params: { userId: currentUser?.id }
            });
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (err) {
            setError('Failed to delete message. Please try again.');
            console.error('Error deleting message:', err);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError('File size must be less than 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    return (
        <Paper className="flex flex-col h-full" elevation={0}>
            {/* Header */}
            <Box className="p-3 border-b flex items-center justify-between">
                <Box className="flex items-center">
                    <Avatar className="mr-2">{selectedUser.name[0]}</Avatar>
                    <Box>
                        <Typography variant="h6">{selectedUser.name}</Typography>
                        {isReceiverOnline && (
                            <Typography variant="caption" className="text-green-500">
                                Online
                            </Typography>
                        )}
                        {isTyping && (
                            <Typography variant="caption" className="text-gray-500">
                                typing...
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Messages */}
            <Box 
                className="flex-1 overflow-y-auto p-3"
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                }}
            >
                {loading ? (
                    <Box className="flex justify-center items-center h-full">
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <div className="flex flex-col space-y-4">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                            >
                                <Box
                                    className={`max-w-[70%] p-3 rounded-lg ${
                                        message.senderId === currentUserId
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700'
                                    }`}
                                >
                                    <Typography>{message.content}</Typography>
                                    {message.attachments?.map((attachment, index) => (
                                        <Box key={index} className="mt-2">
                                            <a
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm underline"
                                            >
                                                {attachment.fileName || 'Attached File'}
                                            </a>
                                        </Box>
                                    ))}
                                    <Typography variant="caption" className="block mt-1 opacity-70">
                                        {new Date(message.sentAt).toLocaleTimeString()}
                                    </Typography>
                                </Box>
                            </motion.div>
                        ))}
                        <div ref={messagesEndRef} style={{ height: 1 }} />
                    </div>
                )}
            </Box>

            {/* Message Input */}
            <Box className="p-3 border-t">
                <Box className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        size="small"
                    >
                        <AttachFileIcon />
                    </IconButton>
                    <TextField
                        fullWidth
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        multiline
                        maxRows={4}
                        size="small"
                    />
                    <IconButton
                        onClick={handleSendMessage}
                        color="primary"
                        disabled={!newMessage.trim() && !selectedFile}
                        size="small"
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    );
};
