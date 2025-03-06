using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Models;
using NotificationAPI.Enums;
using NotificationAPI.Services;

namespace NotificationAPI.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly INotificationService _notificationService;
        private static int _connectedUsers = 0;

        public NotificationHub(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        public override async Task OnConnectedAsync()
        {
            Interlocked.Increment(ref _connectedUsers);
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Interlocked.Decrement(ref _connectedUsers);
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
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
            await Clients.Group(userId).SendAsync("ReceiveNotification", notification);
        }

        public int GetConnectedUsersCount()
        {
            return _connectedUsers;
        }

        public async Task JoinUserGroup(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            }
        }
    }
}
