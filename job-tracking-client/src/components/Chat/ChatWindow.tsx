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
    Menu,
    MenuItem,
    Fade,
    useTheme,
} from '@mui/material';
import { 
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ChatWindowProps {
    currentUserId: string;
    selectedUser: {
        id: string;
        name: string;
        profilImage?: string;
    };
    onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, selectedUser, onClose }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const signalRService = SignalRService.getInstance();

    const loadMessages = useCallback(async () => {
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
        try {
            const response = await axiosInstance.get(`/users/${selectedUser.id}/online`);
            setIsReceiverOnline(response.data.isOnline);
        } catch (err) {
            console.error('Error checking online status:', err);
        }
    }, [selectedUser.id]);

    useEffect(() => {
        checkOnlineStatus();
        
    }, [selectedUser.id, checkOnlineStatus]);

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
                    if (signalRService.isChatConnected()) {
                        signalRService.getConnectedUsersCountToChat().then(count => {
                            console.log('Connected users count to chat:', count);
                        });
                    }
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
    }, [currentUser?.id, selectedUser.id, signalRService]);

    const handleTyping = () => {
        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
        }

        signalRService.sendTypingIndicator(selectedUser.id)
            .catch(err => console.error('Error sending typing notification:', err));

        typingTimeoutRef.current = window.setTimeout(() => {
            signalRService.sendStoppedTypingIndicator(selectedUser.id)
                .catch(err => console.error('Error sending stopped typing notification:', err));
        }, 4000);
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
            if (selectedFile) {
                // Dosya seçilmişse SignalR üzerinden gönder
                await signalRService.sendMessageWithFile(
                    selectedUser.id, 
                    newMessage, 
                    selectedFile
                );
            } else {
                // Normal mesaj gönder
                await signalRService.sendMessage(
                    selectedUser.id,
                    newMessage
                );
            }

            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
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
            // Dosya seçildiğinde kullanıcıya bildir
            setNewMessage(` ${file.name}`);
        }
    };

    const handleFileClick = async (messageId: string) => {
        try {
            const response = await axiosInstance.get(`/Messages/file/${messageId}`, {
                responseType: 'blob'
            });

            // Get filename from Content-Disposition header or use a fallback
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'downloaded-file';
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // Clean up the URL object
        } catch (error) {
            console.error('Error downloading file:', error);
            setError('Failed to download file. Please try again.');
        }
    };

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

    const handleImageClick = (imageUrl: string) => {
        setPreviewImage(imageUrl);
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
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

    const isImageFile = (contentType: string) => {
        return contentType.startsWith('image/');
    };

    return (
        <Paper 
            className="flex flex-col h-full"
            elevation={0}
            sx={{
                backgroundColor: isDarkMode ? 'background.default' : '#ffffff',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: isDarkMode 
                    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                    : '0 8px 32px rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Header */}
            <Box 
                className="p-4"
                sx={{
                    background: isDarkMode
                        ? 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(30,41,59,0.7) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.9) 100%)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid',
                    borderColor: isDarkMode ? 'divider' : 'rgba(0,0,0,0.1)',
                }}
            >
                <Box className="flex items-center justify-between">
                    <Box className="flex items-center gap-3">
                        <Avatar 
                            sx={{ 
                                width: 45, 
                                height: 45,
                                boxShadow: isDarkMode
                                    ? '0 2px 4px rgba(0,0,0,0.3)'
                                    : '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            {selectedUser.profilImage ? (
                                <img src={selectedUser.profilImage} alt={selectedUser.name} />
                            ) : (
                                selectedUser.name.charAt(0).toUpperCase()
                            )}
                        </Avatar>
                        <Box>
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    fontWeight: 600,
                                    color: isDarkMode ? 'text.primary' : 'text.primary'
                                }}
                            >
                                {selectedUser.name}
                            </Typography>
                            <Box className="flex items-center gap-2">
                                {isReceiverOnline && (
                                    <Box className="flex items-center gap-1">
                                        <Box 
                                            className="w-2 h-2 rounded-full bg-green-500"
                                            sx={{ 
                                                boxShadow: isDarkMode
                                                    ? '0 0 0 2px rgba(30,41,59,0.8)'
                                                    : '0 0 0 2px #fff'
                                            }}
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
                                            <span className={`animate-bounce h-1 w-1 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`}/>
                                            <span className={`animate-bounce h-1 w-1 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '0.2s' }}/>
                                            <span className={`animate-bounce h-1 w-1 rounded-full ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '0.4s' }}/>
                                        </span>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: isDarkMode
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.04)',
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </IconButton>
                </Box>
            </Box>

            {/* Messages Container */}
            <Box 
                className="flex-1 overflow-y-auto p-6"
                sx={{
                    background: isDarkMode
                        ? 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.1) 100%)'
                        : 'linear-gradient(180deg, rgba(248,250,252,0.7) 0%, rgba(255,255,255,0.5) 100%)',
                }}
            >
                {loading ? (
                    <Box className="flex justify-center items-center h-full">
                        <CircularProgress size={40} sx={{ color: isDarkMode ? 'primary.light' : 'primary.main' }} />
                    </Box>
                ) : error ? (
                    <Alert 
                        severity="error"
                        sx={{ 
                            borderRadius: 2,
                            boxShadow: isDarkMode
                                ? '0 2px 8px rgba(0,0,0,0.3)'
                                : '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        {error}
                    </Alert>
                ) : (
                    <Box className="space-y-6">
                        {Object.entries(groupedMessages).map(([date, messages]) => (
                            <Box key={date}>
                                <Box className="flex items-center my-4">
                                    <Box className="flex-grow border-t" sx={{ borderColor: 'divider' }}></Box>
                                    <Typography 
                                        variant="caption" 
                                        className="mx-4 px-3 py-1 rounded-full"
                                        sx={{
                                            backgroundColor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            color: 'text.secondary'
                                        }}
                                    >
                                        {date}
                                    </Typography>
                                    <Box className="flex-grow border-t" sx={{ borderColor: 'divider' }}></Box>
                                </Box>
                                <Box className="space-y-3">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'inline-block',
                                                    maxWidth: '70%',
                                                    p: 1.5,
                                                    borderRadius: '16px',
                                                    position: 'relative',
                                                    ...(message.senderId === currentUserId ? {
                                                        borderBottomRightRadius: '4px',
                                                        backgroundColor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                    } : {
                                                        borderBottomLeftRadius: '4px',
                                                        backgroundColor: isDarkMode
                                                            ? 'rgba(255,255,255,0.05)'
                                                            : 'rgba(255,255,255,0.9)',
                                                        color: 'text.primary',
                                                        boxShadow: isDarkMode
                                                            ? '0 2px 12px rgba(0,0,0,0.2)'
                                                            : '0 2px 12px rgba(0,0,0,0.05)',
                                                    })
                                                }}
                                            >
                                                <Box 
                                                    className="flex items-center justify-between"
                                                    sx={{ gap: 0.5 }}
                                                >
                                                    <Typography 
                                                        sx={{ 
                                                            wordBreak: 'break-word',
                                                            flex: 1,
                                                            fontFamily: '"Inter", sans-serif',
                                                            fontSize: '0.875rem',
                                                            lineHeight: 1.5,
                                                            letterSpacing: '-0.01em',
                                                            fontWeight: 400
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

                                                {message.fileAttachment && (
                                                    <Box 
                                                        className="mt-2 p-2 rounded cursor-pointer"
                                                        sx={{
                                                            backgroundColor: 'rgba(0,0,0,0.1)',
                                                            transition: 'background-color 0.2s',
                                                            '&:hover': {
                                                                backgroundColor: isDarkMode
                                                                    ? 'rgba(255,255,255,0.15)'
                                                                    : 'rgba(0,0,0,0.15)',
                                                            }
                                                        }}
                                                    >
                                                        {isImageFile(message.fileAttachment.contentType) ? (
                                                            <Box>
                                                                <img 
                                                                    src={`http://localhost:5193/${message.fileAttachment.filePath}`}
                                                                    alt={message.fileAttachment.fileName}
                                                                    onClick={() => handleImageClick(`http://localhost:5193/${message.fileAttachment?.filePath}`)}
                                                                    style={{ 
                                                                        maxWidth: '200px', 
                                                                        maxHeight: '200px',
                                                                        borderRadius: '8px',
                                                                        objectFit: 'cover',
                                                                        cursor: 'pointer',
                                                                        boxShadow: isDarkMode 
                                                                            ? '0 2px 6px rgba(0,0,0,0.4)'
                                                                            : '0 2px 6px rgba(0,0,0,0.15)'
                                                                    }}
                                                                />
                                                                <Typography variant="caption" sx={{ 
                                                                    display: 'block', 
                                                                    mt: 1,
                                                                    color: isDarkMode
                                                                        ? 'rgba(255,255,255,0.7)'
                                                                        : 'inherit'
                                                                }}>
                                                                    {message.fileAttachment.fileName}
                                                                </Typography>
                                                            </Box>
                                                        ) : (
                                                            <Box 
                                                                className="flex items-center gap-2" 
                                                                onClick={() => window.open(`http://localhost:5193/${message.fileAttachment?.filePath}`, '_blank')}
                                                            >
                                                                <AttachFileIcon fontSize="small" />
                                                                <Typography variant="body2">
                                                                    {message.fileAttachment.fileName}
                                                                    {' '}
                                                                    ({(message.fileAttachment.fileSize / 1024).toFixed(1)} KB)
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}
                                                <Typography 
                                                    variant="caption" 
                                                    sx={{ 
                                                        opacity: 0.7,
                                                        display: 'block',
                                                        marginTop: 0.25,
                                                        fontSize: '0.7rem',
                                                        fontFamily: '"Inter", sans-serif',
                                                        letterSpacing: '-0.01em'
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

            {/* Image Preview Modal */}
            {previewImage && (
                <Box
                    onClick={closeImagePreview}
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                >
                    <img
                        src={previewImage}
                        alt="Preview"
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                    />
                </Box>
            )}

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
                        boxShadow: isDarkMode
                            ? '0 2px 10px rgba(0,0,0,0.3)'
                            : '0 2px 10px rgba(0,0,0,0.1)',
                        backgroundColor: 'background.paper',
                    }
                }}
            >
                <MenuItem 
                    onClick={handleDeleteClick}
                    sx={{
                        color: 'error.main',
                        '&:hover': {
                            backgroundColor: isDarkMode
                                ? 'rgba(244,67,54,0.1)'
                                : 'error.lighter',
                        },
                        fontSize: '0.875rem',
                        py: 1,
                    }}
                >
                   <DeleteIcon fontSize="small" sx={{ mr: 1 }}/>Delete Message 
                </MenuItem>
                {selectedMessageId && messages.find(msg => msg.id === selectedMessageId)?.fileAttachment && (
                    <MenuItem 
                        onClick={() => {
                            handleFileClick(selectedMessageId!);
                            handleMenuClose();
                        }}
                        sx={{
                            color: 'primary.main',
                            '&:hover': {
                                backgroundColor: isDarkMode
                                    ? 'rgba(25,118,210,0.1)'
                                    : 'primary.lighter',
                            },
                            fontSize: '0.875rem',
                            py: 1,
                        }}
                    >
                        <AttachFileIcon fontSize="small" sx={{ mr: 1 }}/>
                        Download File
                    </MenuItem>
                )}
            </Menu>

            {/* Input Area */}
            <Box 
                className="p-4"
                sx={{
                    background: isDarkMode
                        ? 'linear-gradient(0deg, rgba(30,41,59,0.8) 0%, rgba(30,41,59,0.7) 100%)'
                        : 'linear-gradient(0deg, rgba(248,250,252,1) 0%, rgba(255,255,255,0.9) 100%)',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid',
                    borderColor: isDarkMode ? 'divider' : 'rgba(0,0,0,0.1)',
                }}
            >
                <Box 
                    className="flex items-center gap-3 p-2"
                    sx={{
                        backgroundColor: isDarkMode
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(255,255,255,1)',
                        borderRadius: '16px',
                        boxShadow: isDarkMode
                            ? '0 2px 12px rgba(0,0,0,0.2)'
                            : '0 2px 12px rgba(0,0,0,0.03)',
                    }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: isDarkMode
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'action.hover',
                            }
                        }}
                    >
                        <AttachFileIcon />
                    </IconButton>
                    <TextField
                        fullWidth
                        placeholder="Mesajınızı yazın..."
                        multiline
                        maxRows={4}
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                padding: '8px 12px',
                                borderRadius: '12px',
                                color: 'text.primary',
                                '&:hover': {
                                    backgroundColor: isDarkMode
                                        ? 'rgba(255,255,255,0.05)'
                                        : 'action.hover',
                                },
                                '& ::placeholder': {
                                    color: isDarkMode
                                        ? 'rgba(255,255,255,0.5)'
                                        : 'rgba(0,0,0,0.4)',
                                    opacity: 1,
                                }
                            }
                        }}
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
                    />
                    <IconButton
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() && !selectedFile}
                        sx={{
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                                backgroundColor: isDarkMode 
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'action.disabledBackground',
                                color: isDarkMode
                                    ? 'rgba(255,255,255,0.3)'
                                    : 'action.disabled',
                            },
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    );
};

export default ChatWindow;
