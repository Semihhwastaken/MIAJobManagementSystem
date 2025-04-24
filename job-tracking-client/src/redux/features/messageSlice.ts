import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    content: string;
    subject: string;
    sentAt: string;
    isRead: boolean;
}

interface MessageState {
    messages: Message[];
    loading: boolean;
    error: string | null;
}

const initialState: MessageState = {
    messages: [],
    loading: false,
    error: null
};

export const sendMessage = createAsyncThunk(
    'message/send',
    async ({ senderId, receiverId, content, subject }: { senderId: string; receiverId: string; content: string; subject: string }) => {
        const response = await axios.post(`https://miajobmanagementsystem-3sdx.onrender.com/Message/send/${senderId}`, {
            receiverId,
            content,
            subject
        });
        return response.data;
    }
);

export const getUserMessages = createAsyncThunk(
    'message/getUserMessages',
    async (userId: string) => {
        const response = await axios.get(`https://miajobmanagementsystem-3sdx.onrender.com/Message/user/${userId}`);
        return response.data;
    }
);

export const markMessageAsRead = createAsyncThunk(
    'message/markAsRead',
    async (messageId: string) => {
        await axios.put(`https://miajobmanagementsystem-3sdx.onrender.com/Message/read/${messageId}`);
        return messageId;
    }
);

const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(sendMessage.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.loading = false;
                state.messages.unshift(action.payload);
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Mesaj gönderilemedi';
            })
            .addCase(getUserMessages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getUserMessages.fulfilled, (state, action) => {
                state.loading = false;
                state.messages = action.payload;
            })
            .addCase(getUserMessages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Mesajlar alınamadı';
            })
            .addCase(markMessageAsRead.fulfilled, (state, action) => {
                const message = state.messages.find(m => m.id === action.payload);
                if (message) {
                    message.isRead = true;
                }
            });
    }
});

export default messageSlice.reducer;
