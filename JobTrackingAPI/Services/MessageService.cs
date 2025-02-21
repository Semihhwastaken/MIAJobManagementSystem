using JobTrackingAPI.Models;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public class MessageService
    {
        private readonly IMongoCollection<Message> _messages;
        private readonly IMongoCollection<TeamMember> _members;

        public MessageService(IMongoDatabase database)
        {
            _messages = database.GetCollection<Message>("Messages");
            _members = database.GetCollection<TeamMember>("TeamMembers");
        }

        public async Task<MessageResponse> SendMessageAsync(string senderId, SendMessageDto messageDto)
        {
            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = messageDto.ReceiverId,
                Content = messageDto.Content,
                Subject = messageDto.Subject,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            await _messages.InsertOneAsync(message);

            var sender = await _members.Find(m => m.Id == senderId).FirstOrDefaultAsync();
            var receiver = await _members.Find(m => m.Id == messageDto.ReceiverId).FirstOrDefaultAsync();

            return new MessageResponse
            {
                Id = message.Id,
                SenderId = message.SenderId,
                SenderName = sender?.FullName ?? "Unknown",
                ReceiverId = message.ReceiverId,
                ReceiverName = receiver?.FullName ?? "Unknown",
                Content = message.Content,
                Subject = message.Subject,
                SentAt = message.SentAt,
                IsRead = message.IsRead
            };
        }

        public async Task<List<MessageResponse>> GetMessagesForUserAsync(string userId)
        {
            var messages = await _messages
                .Find(m => m.SenderId == userId || m.ReceiverId == userId)
                .SortByDescending(m => m.SentAt)
                .ToListAsync();

            var userIds = messages.SelectMany(m => new[] { m.SenderId, m.ReceiverId }).Distinct();
            var users = await _members
                .Find(m => userIds.Contains(m.Id))
                .ToListAsync();

            var userDict = users.ToDictionary(u => u.Id, u => u.FullName);

            return messages.Select(m => new MessageResponse
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = userDict.GetValueOrDefault(m.SenderId, "Unknown"),
                ReceiverId = m.ReceiverId,
                ReceiverName = userDict.GetValueOrDefault(m.ReceiverId, "Unknown"),
                Content = m.Content,
                Subject = m.Subject,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            }).ToList();
        }

        public async Task<bool> MarkMessageAsReadAsync(string messageId)
        {
            var update = Builders<Message>.Update.Set(m => m.IsRead, true);
            var result = await _messages.UpdateOneAsync(m => m.Id == messageId, update);
            return result.ModifiedCount > 0;
        }
    }
}
