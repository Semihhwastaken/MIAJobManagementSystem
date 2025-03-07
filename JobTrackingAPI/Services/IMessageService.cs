using JobTrackingAPI.Models;
using Microsoft.AspNetCore.Http;

namespace JobTrackingAPI.Services
{
    public interface IMessageService
    {
        Task<Message> CreateMessageAsync(Message message);
        Task<Message?> GetMessageByIdAsync(string id);
        Task<List<Message>> GetMessagesBetweenUsersAsync(string userId1, string userId2, int skip = 0, int take = 50);
        Task<Message?> MarkMessageAsReadAsync(string messageId);
        Task<Dictionary<string, int>> GetUnreadMessageCountAsync(string userId);
        Task<List<Message>> GetUnreadMessagesAsync(string userId);
        Task<MessageResponse> SendMessageAsync(string senderId, SendMessageDto messageDto);
        Task<List<MessageResponse>> GetMessagesForUserAsync(string userId, int page = 1, int pageSize = 50);
        Task<List<ConversationDto>> GetConversationsAsync(string userId);
        Task<bool> DeleteMessageAsync(string messageId, string userId);
        Task<string> AddFileToMessageAsync(string messageId, IFormFile file);
        Task<List<string>> GetOnlineUsersAsync();
        Task NotifyUserTypingAsync(string userId, string receiverId);
        Task<Message> CreateMessageWithFileAsync(Message message, IFormFile file);
    }

    public class ConversationDto
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string? LastMessage { get; set; }
        public DateTime? LastMessageTime { get; set; }
        public int UnreadCount { get; set; }
        public string? Avatar { get; set; }
    }
}
