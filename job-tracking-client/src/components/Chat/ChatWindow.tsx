import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import SignalRService from '../../services/signalRService';
import { Message } from '../../types/message';
import {
    Paper,
    TextField,
    IconButton,
    Typography,
    Box,
    Avatar,
    
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ChatWindowProps {
    receiverId: string;
    receiverName: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ receiverId, receiverName }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<number | undefined>(undefined);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const signalRService = SignalRService.getInstance();

    useEffect(() => {
        const initializeSignalR = async () => {
            if (currentUser?.id) {
                try {
                    await signalRService.startConnection(currentUser.id);
                    
                    // Message handler
                    signalRService.onReceiveMessage((message: Message) => {
                        if (
                            (message.senderId === currentUser.id && message.receiverId === receiverId) ||
                            (message.senderId === receiverId && message.receiverId === currentUser.id)
                        ) {
                            setMessages(prev => [...prev, message]);
                            // Mark received messages as read
                            if (message.senderId === receiverId && message.id) {
                                signalRService.markMessageAsRead(message.id);
                            }
                        }
                    });

                    // Typing indicators
                    signalRService.onUserTyping((userId: string) => {
                        if (userId === receiverId) {
                            setIsTyping(true);
                        }
                    });

                    signalRService.onUserStoppedTyping((userId: string) => {
                        if (userId === receiverId) {
                            setIsTyping(false);
                        }
                    });

                    // Read receipts
                    signalRService.onMessageRead((messageId: string) => {
                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === messageId ? { ...msg, isRead: true } : msg
                            )
                        );
                    });

                } catch (error) {
                    console.error('SignalR connection error:', error);
                }
            }
        };

        initializeSignalR();

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [currentUser?.id, receiverId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleTyping = () => {
        if (currentUser?.id) {
            signalRService.sendTypingIndicator(receiverId);
            
            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set new timeout
            typingTimeoutRef.current = setTimeout(() => {
                signalRService.sendStoppedTypingIndicator(receiverId);
            }, 1500);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser?.id) return;

        try {
            await signalRService.sendMessage(receiverId, newMessage.trim());
            setNewMessage('');
            // Clear typing indicator when sending message
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            signalRService.sendStoppedTypingIndicator(receiverId);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{
                height: '500px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            {/* Chat Header */}
            <Box
                sx={{
                    p: 2,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Avatar>{receiverName[0]}</Avatar>
                <Typography variant="h6">{receiverName}</Typography>
                {isTyping && (
                    <Typography variant="caption" sx={{ ml: 2 }}>
                        yazıyor...
                    </Typography>
                )}
            </Box>

            {/* Messages Container */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {messages.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: message.senderId === currentUser?.id ? 'flex-end' : 'flex-start',
                                mb: 1,
                            }}
                        >
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 1,
                                    px: 2,
                                    maxWidth: '70%',
                                    backgroundColor: message.senderId === currentUser?.id ? 'primary.main' : 'grey.100',
                                    color: message.senderId === currentUser?.id ? 'white' : 'text.primary',
                                    borderRadius: 2,
                                    position: 'relative',
                                }}
                            >
                                <Typography variant="body1">{message.content}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.7 }}>
                                    <Typography variant="caption">
                                        {new Date(message.sentAt).toLocaleTimeString()}
                                    </Typography>
                                    {message.senderId === currentUser?.id && (
                                        <Typography variant="caption" sx={{ color: message.isRead ? 'success.main' : 'inherit' }}>
                                            {message.isRead ? '✓✓' : '✓'}
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        </Box>
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Mesajınızı yazın..."
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        size="small"
                        multiline
                        maxRows={4}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    );
};
