using JobTrackingAPI.Models;
using MongoDB.Driver;
using Microsoft.Extensions.Options;
using JobTrackingAPI.Settings;
using Microsoft.AspNetCore.Http;

namespace JobTrackingAPI.Services
{
    /// <summary>
    /// Service for handling message-related operations
    /// </summary>
    public class MessageService : IMessageService
    {
        private readonly IMongoCollection<Team> _teams;
        private readonly IMongoCollection<Message> _messages;
        private readonly IMongoCollection<User> _users;

        public MessageService(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _teams = database.GetCollection<Team>("Teams");
            _messages = database.GetCollection<Message>("Messages");
            _users = database.GetCollection<User>("Users");
        }

        public async Task<Message> CreateMessageAsync(Message message)
        {
            await _messages.InsertOneAsync(message);
            return message;
        }

        public async Task<Message?> GetMessageByIdAsync(string id)
        {
            return await _messages.Find(m => m.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<Message>> GetMessagesBetweenUsersAsync(string userId1, string userId2, int skip = 0, int take = 50)
        {
            var messages = await _messages
                .Find(m => (m.SenderId == userId1 && m.ReceiverId == userId2) || 
                          (m.SenderId == userId2 && m.ReceiverId == userId1))
                .SortByDescending(m => m.SentAt)
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

            return messages;
        }

        public async Task<Message?> MarkMessageAsReadAsync(string messageId)
        {
            var update = Builders<Message>.Update.Set(m => m.IsRead, true);
            var result = await _messages.FindOneAndUpdateAsync(
                m => m.Id == messageId,
                update,
                new FindOneAndUpdateOptions<Message> { ReturnDocument = ReturnDocument.After }
            );
            return result;
        }

        public async Task<Dictionary<string, int>> GetUnreadMessageCountAsync(string userId)
        {
            var unreadMessages = await _messages
                .Find(m => m.ReceiverId == userId && !m.IsRead)
                .ToListAsync();

            return unreadMessages
                .GroupBy(m => m.SenderId)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        public async Task<List<Message>> GetUnreadMessagesAsync(string userId)
        {
            return await _messages
                .Find(m => m.ReceiverId == userId && !m.IsRead)
                .ToListAsync();
        }

        public async Task<MessageResponse> SendMessageAsync(string senderId, SendMessageDto messageDto)
        {
            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = messageDto.ReceiverId,
                Content = messageDto.Content,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            await _messages.InsertOneAsync(message);
            return new MessageResponse
            {
                Id = message.Id,
                Content = message.Content,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                SentAt = message.SentAt,
                IsRead = message.IsRead
            };
        }

        public async Task<List<MessageResponse>> GetMessagesForUserAsync(string userId, int page = 1, int pageSize = 50)
        {
            var skip = (page - 1) * pageSize;
            var messages = await _messages
                .Find(m => m.SenderId == userId || m.ReceiverId == userId)
                .SortByDescending(m => m.SentAt)
                .Skip(skip)
                .Limit(pageSize)
                .ToListAsync();

            return messages.Select(m => new MessageResponse
            {
                Id = m.Id,
                Content = m.Content,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            }).ToList();
        }

        public async Task<List<ConversationDto>> GetConversationsAsync(string userId)
        {
            // Get all messages where the user is either sender or receiver
            var messages = await _messages
                .Find(m => m.SenderId == userId || m.ReceiverId == userId)
                .SortByDescending(m => m.SentAt)
                .ToListAsync();

            // Group messages by conversation partner
            var conversationTasks = messages
                .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
                .Select(async g =>
                {
                    var partnerId = g.Key;
                    var lastMessage = g.OrderByDescending(m => m.SentAt).FirstOrDefault();
                    var partner = await _users.Find(u => u.Id == partnerId).FirstOrDefaultAsync();
                    var unreadCount = g.Count(m => !m.IsRead && m.ReceiverId == userId);

                    return new ConversationDto
                    {
                        UserId = partnerId,
                        UserName = !string.IsNullOrEmpty(partner?.FullName) ? partner.FullName : partner?.Username ?? "Unknown User",
                        LastMessage = lastMessage?.Content,
                        LastMessageTime = lastMessage?.SentAt,
                        UnreadCount = unreadCount,
                        Avatar = partner?.ProfileImage
                    };
                }).ToList();

            return await Task.WhenAll(conversationTasks).ContinueWith(t => t.Result.ToList());
        }

        public async Task<bool> DeleteMessageAsync(string messageId, string userId)
        {
            var result = await _messages.DeleteOneAsync(m => 
                m.Id == messageId && (m.SenderId == userId || m.ReceiverId == userId));
            return result.DeletedCount > 0;
        }

        public async Task<string> AddFileToMessageAsync(string messageId, IFormFile file)
        {
            // In a real application, you would upload the file to a storage service
            // and return the URL. For now, we'll just return a placeholder
            return $"file_{messageId}_{file.FileName}";
        }

        private static readonly HashSet<string> _onlineUsers = new();
        private static readonly object _onlineUsersLock = new();

        public Task<List<string>> GetOnlineUsersAsync()
        {
            lock (_onlineUsersLock)
            {
                return Task.FromResult(_onlineUsers.ToList());
            }
        }

        public async Task NotifyUserTypingAsync(string userId, string receiverId)
        {
            // In a real application, you would use SignalR to notify the receiver
            // For now, we'll simulate a delay to make it truly async
            await Task.Delay(100); // Add a small delay to simulate network latency
        }

        // Helper method to track online users
        public static void UserConnected(string userId)
        {
            lock (_onlineUsersLock)
            {
                _onlineUsers.Add(userId);
            }
        }

        public static void UserDisconnected(string userId)
        {
            lock (_onlineUsersLock)
            {
                _onlineUsers.Remove(userId);
            }
        }
    }
}
