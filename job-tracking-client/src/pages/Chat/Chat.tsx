import React, { useState, useEffect } from 'react';
import { ChatWindow } from '../../components/Chat/ChatWindow';
import {
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Box,
    Divider,
} from '@mui/material';

const Chat: React.FC = () => {
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
    const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
    

    useEffect(() => {
        // TODO: Fetch users from API
        // For now, using mock data
        setUsers([
            { id: '1', name: 'John Doe' },
            { id: '2', name: 'Jane Smith' },
            // Add more users as needed
        ]);
    }, []);

    return (
        <Box className="flex h-[calc(100vh-64px)]">
            {/* Users List */}
            <Paper className="w-1/4 overflow-y-auto border-r" elevation={0} square>
                <List>
                    {users.map((user) => (
                        <React.Fragment key={user.id}>
                            <ListItem
                                sx={{ 
                                    cursor: 'pointer',
                                    backgroundColor: selectedUser?.id === user.id ? 'action.selected' : 'inherit'
                                }}
                                onClick={() => setSelectedUser(user)}
                                className="w-full"
                            >
                                <ListItemAvatar>
                                    <Avatar>{user.name[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={user.name}
                                    secondary="Last message..."
                                />
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            {/* Chat Window */}
            <Box className="flex-1">
                {selectedUser ? (
                    <ChatWindow
                        receiverId={selectedUser.id}
                        receiverName={selectedUser.name}
                    />
                ) : (
                    <Box className="h-full flex items-center justify-center">
                        <Box className="text-center text-gray-500">
                            <svg
                                className="mx-auto h-12 w-12 mb-4"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-lg font-medium">Select a conversation to start chatting</span>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Chat;
