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
<<<<<<< HEAD
=======
    Menu,
    MenuItem,
    Fade,
>>>>>>> newdb1
} from '@mui/material';
import { 
    Send as SendIcon,
    AttachFile as AttachFileIcon,
<<<<<<< HEAD
    
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Attachment {
    url: string;
    fileName: string;
}

=======
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

>>>>>>> newdb1
interface ChatWindowProps {
    currentUserId: string;
    selectedUser: {
        id: string;
        name: string;
<<<<<<< HEAD
=======
        profilImage?: string;
>>>>>>> newdb1
    };
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, selectedUser }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);
=======
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
>>>>>>> newdb1
    
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const signalRService = SignalRService.getInstance();

<<<<<<< HEAD
    const loadMessages = async () => {
=======
    const loadMessages = useCallback(async () => {
>>>>>>> newdb1
        if (!currentUser?.id) return;

        try {
            setLoading(true);
            setError(null);

            const response = await axiosInstance.get(`/Messages/conversation/${currentUserId}/${selectedUser.id}`);
            if (response.data) {
                setMessages(response.data.reverse());
<<<<<<< HEAD
=======
                
                
>>>>>>> newdb1
            }
        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Failed to load messages. Please try again.');
        } finally {
            setLoading(false);
        }
<<<<<<< HEAD
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
=======
    }, [currentUser?.id, currentUserId, selectedUser.id]);


    useEffect(() => {
        const handleReceiveMessage = (message: Message) => {
            setMessages(prev => {
                // Check if message already exists
                const messageExists = prev.some(m => m.id === message.id);
                if (messageExists) {
                    return prev;
                }
                
                // Only add if it's relevant to current chat
                if (message.senderId === selectedUser.id || message.receiverId === selectedUser.id) {
                    scrollToBottom();
                    return [...prev, message];
                }
                return prev;
            });
        };

        signalRService.onReceiveMessage(handleReceiveMessage);

        // Clean up
        return () => {
            signalRService.removeMessageCallback(handleReceiveMessage);
        };
    }, [selectedUser.id,signalRService]);

    useEffect(() => {
        loadMessages();
    }, [selectedUser.id, loadMessages]);

    const checkOnlineStatus = useCallback(async () => {
>>>>>>> newdb1
        try {
            const response = await axiosInstance.get(`/users/${selectedUser.id}/online`);
            setIsReceiverOnline(response.data.isOnline);
        } catch (err) {
            console.error('Error checking online status:', err);
        }
<<<<<<< HEAD
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
=======
    }, [selectedUser.id]);

    useEffect(() => {
        checkOnlineStatus();
        
    }, [selectedUser.id, checkOnlineStatus]);
>>>>>>> newdb1

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
<<<<<<< HEAD

=======
                    if (signalRService.isChatConnected()) {
                        signalRService.getConnectedUsersCountToChat().then(count => {
                            console.log('Connected users count to chat:', count);
                        });
                    }
>>>>>>> newdb1
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

<<<<<<< HEAD
=======
                    

>>>>>>> newdb1
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
<<<<<<< HEAD
    }, [currentUser?.id, selectedUser.id]);
=======
    }, [currentUser?.id, selectedUser.id, signalRService]);
>>>>>>> newdb1

    const handleTyping = () => {
        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
        }

<<<<<<< HEAD
        axiosInstance.post(`/messages/typing/${currentUser?.id}/${selectedUser.id}`)
            .catch(err => console.error('Error sending typing notification:', err));

        typingTimeoutRef.current = window.setTimeout(() => {
            setIsTyping(false);
        }, 3000);
=======
        signalRService.sendTypingIndicator(selectedUser.id)
            .catch(err => console.error('Error sending typing notification:', err));

        typingTimeoutRef.current = window.setTimeout(() => {
            signalRService.sendStoppedTypingIndicator(selectedUser.id)
                .catch(err => console.error('Error sending stopped typing notification:', err));
        }, 4000);
>>>>>>> newdb1
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
<<<<<<< HEAD
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
=======
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Actually send the message
            await signalRService.sendMessage(selectedUser.id, newMessage);
            
            scrollToBottom();
>>>>>>> newdb1
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
<<<<<<< HEAD
            await axiosInstance.delete(`/message/${messageId}`, {
                params: { userId: currentUser?.id }
            });
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (err) {
            setError('Failed to delete message. Please try again.');
            console.error('Error deleting message:', err);
=======
            // Make sure we have both the message ID and current user ID
            if (!messageId || !currentUserId) {
                throw new Error('Missing required parameters for message deletion');
            }

            // Send both messageId and userId in the request
            await axiosInstance.delete(`/Messages/${messageId}`, {
                params: {
                    userId: currentUserId
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Update local state only after successful deletion
            setMessages(prev => prev.filter(message => message.id !== messageId));
            
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error deleting message:', error);
            const errorMessage = error.response?.data?.message || 'Failed to delete message. Please try again.';
            setError(errorMessage);
            
            // Show error for 3 seconds then clear it
            setTimeout(() => setError(null), 3000);
>>>>>>> newdb1
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

<<<<<<< HEAD
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
=======
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, messageId: string) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedMessageId(messageId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedMessageId(null);
    };

    const handleDeleteClick = () => {
        if (selectedMessageId) {
            handleDeleteMessage(selectedMessageId);
        }
        handleMenuClose();
    };

    const groupMessagesByDate = (messages: Message[]) => {
        return messages.reduce((groups, message) => {
            const date = new Date(message.sentAt).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            return groups;
        }, {} as Record<string, Message[]>);
    };

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <Paper 
            className="flex flex-col h-full rounded-xl overflow-hidden"
            elevation={3}
            sx={{
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            {/* Header */}
            <Box 
                className="p-4 border-b backdrop-blur-sm"
                sx={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'divider',
                }}
            >
                <Box className="flex items-center justify-between">
                    <Box className="flex items-center gap-3">
                        <Avatar 
                            sx={{ 
                                width: 45, 
                                height: 45,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            {selectedUser.profilImage ? (
                                <img src={selectedUser.profilImage} alt={selectedUser.name} />
                            ) : (
                                selectedUser.name.charAt(0).toUpperCase()
                            )}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {selectedUser.name}
                            </Typography>
                            <Box className="flex items-center gap-2">
                                {isReceiverOnline && (
                                    <Box className="flex items-center gap-1">
                                        <Box 
                                            className="w-2 h-2 rounded-full bg-green-500"
                                            sx={{ boxShadow: '0 0 0 2px #fff' }}
                                        />
                                        <Typography variant="caption" color="success.main">
                                            Online
                                        </Typography>
                                    </Box>
                                )}
                                {isTyping && (
                                    <Box className="flex items-center gap-1">
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                animation: 'pulse 2s infinite'
                                            }}
                                        >
                                            yazıyor...
                                        </Typography>
                                        <span className="flex space-x-1">
                                            <span className="animate-bounce h-1 w-1 bg-gray-400 rounded-full"/>
                                            <span className="animate-bounce h-1 w-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}/>
                                            <span className="animate-bounce h-1 w-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.4s' }}/>
                                        </span>
                                    </Box>
                                )}
                            </Box>
                        </Box>
>>>>>>> newdb1
                    </Box>
                </Box>
            </Box>

            {/* Messages */}
            <Box 
<<<<<<< HEAD
                className="flex-1 overflow-y-auto p-3"
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
=======
                className="flex-1 overflow-y-auto p-4"
                sx={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0))',
>>>>>>> newdb1
                }}
            >
                {loading ? (
                    <Box className="flex justify-center items-center h-full">
<<<<<<< HEAD
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
=======
                        <CircularProgress size={40} />
                    </Box>
                ) : error ? (
                    <Alert 
                        severity="error"
                        sx={{ 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        {error}
                    </Alert>
                ) : (
                    <Box className="space-y-6">
                        {Object.entries(groupedMessages).map(([date, messages]) => (
                            <Box key={date}>
                                <Box className="flex items-center my-4">
                                    <Box className="flex-grow border-t border-gray-200"></Box>
                                    <Typography 
                                        variant="caption" 
                                        className="mx-4 px-3 py-1 rounded-full"
                                        sx={{
                                            backgroundColor: 'background.default',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        {date}
                                    </Typography>
                                    <Box className="flex-grow border-t border-gray-200"></Box>
                                </Box>
                                <Box className="space-y-3">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <Box
                                                sx={{
                                                    maxWidth: '70%',
                                                    padding: 2,
                                                    borderRadius: 3,
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    position: 'relative',
                                                    ...(message.senderId === currentUserId ? {
                                                        backgroundColor: 'primary.main',
                                                        color: 'white',
                                                    } : {
                                                        backgroundColor: 'background.paper',
                                                        borderWidth: 1,
                                                        borderColor: 'divider',
                                                    })
                                                }}
                                            >
                                                <Box 
                                                    className="flex items-center justify-between"
                                                    sx={{ gap: 1 }}
                                                >
                                                    <Typography 
                                                        sx={{ 
                                                            wordBreak: 'break-word',
                                                            flex: 1
                                                        }}
                                                    >
                                                        {message.content}
                                                    </Typography>
                                                    {message.senderId === currentUserId && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => handleMenuOpen(e, message.id || '')}
                                                            sx={{ 
                                                                color: 'inherit',
                                                                opacity: 0.7,
                                                                '&:hover': { opacity: 1 },
                                                                padding: 0,
                                                                minWidth: '24px',
                                                                height: '24px',
                                                                alignSelf: 'flex-start',
                                                                marginLeft: '4px',
                                                                marginTop: '-2px'
                                                            }}
                                                        >
                                                            <MoreVertIcon 
                                                                sx={{ 
                                                                    fontSize: '1.2rem',
                                                                    cursor: 'pointer'
                                                                }} 
                                                            />
                                                        </IconButton>
                                                    )}
                                                </Box>

                                                {message.attachments?.map((attachment, index) => (
                                                    <Box 
                                                        key={index} 
                                                        className="mt-2 p-2 rounded"
                                                        sx={{
                                                            backgroundColor: 'rgba(0,0,0,0.1)',
                                                        }}
                                                    >
                                                        <a
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm flex items-center gap-1"
                                                        >
                                                            <AttachFileIcon fontSize="small" />
                                                            {attachment.fileName || 'Attached File'}
                                                        </a>
                                                    </Box>
                                                ))}
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        opacity: 0.7,
                                                        display: 'block',
                                                        marginTop: 0.5,
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    {new Date(message.sentAt).toLocaleTimeString()}
                                                </Typography>
                                            </Box>
                                        </motion.div>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>
                )}
            </Box>

            {/* Dropdown Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 200 }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                sx={{
                    '& .MuiPaper-root': {
                        borderRadius: 2,
                        minWidth: 120,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    }
                }}
            >
                <MenuItem 
                    onClick={handleDeleteClick}
                    sx={{
                        color: 'error.main',
                        '&:hover': {
                            backgroundColor: 'error.lighter',
                        },
                        fontSize: '0.875rem',
                        py: 1,
                    }}
                >
                   <DeleteIcon/>Delete Message 
                </MenuItem>
            </Menu>

            {/* Message Input */}
            <Box 
                className="p-3 border-t"
                sx={{
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                }}
            >
                <Box 
                    className="flex items-center gap-2 p-2 rounded-xl"
                    sx={{
                        backgroundColor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
>>>>>>> newdb1
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        size="small"
<<<<<<< HEAD
=======
                        sx={{ color: 'text.secondary' }}
>>>>>>> newdb1
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
<<<<<<< HEAD
                        size="small"
=======
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                        }}
                        sx={{
                            '& .MuiInputBase-root': {
                                padding: '4px 8px',
                            }
                        }}
>>>>>>> newdb1
                    />
                    <IconButton
                        onClick={handleSendMessage}
                        color="primary"
                        disabled={!newMessage.trim() && !selectedFile}
                        size="small"
<<<<<<< HEAD
=======
                        sx={{
                            backgroundColor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                                backgroundColor: 'action.disabledBackground',
                                color: 'action.disabled',
                            }
                        }}
>>>>>>> newdb1
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    );
<<<<<<< HEAD
};
=======
};
>>>>>>> newdb1
