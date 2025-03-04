using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Models;
using NotificationAPI.Enums;
using NotificationAPI.Services;
using Microsoft.Extensions.Logging;

namespace NotificationAPI.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(INotificationService notificationService, ILogger<NotificationHub> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
    
            _logger.LogInformation("UserId: {UserId}", userId);
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                _logger.LogInformation("✅ Kullanıcı Group'a eklendi. UserId: {UserId}", userId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            _logger.LogInformation("UserId: {UserId}", userId);
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendNotification(string userId, string title, string message, NotificationType type, string? relatedJobId = null)
        {
            var notification = new Notification(userId, title, message, type, relatedJobId);
            await _notificationService.CreateNotificationAsync(notification);
            _logger.LogInformation("📩 Yeni bildirim oluşturuldu. UserId: {UserId}, Title: {Title}, Message: {Message}, Type: {Type}", userId, title, message, type);
            await Clients.Group(userId).SendAsync("ReceiveNotification", notification);
        }
    }
}
