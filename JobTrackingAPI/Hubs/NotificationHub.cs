using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Models;
using JobTrackingAPI.Enums;
using JobTrackingAPI.Services;

namespace JobTrackingAPI.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly IConnectionService _connectionService;
        private static readonly Dictionary<string, string> UserConnections = new Dictionary<string, string>();

        public NotificationHub(IConnectionService connectionService)
        {
            _connectionService = connectionService;
        }

        public async Task RegisterUser(string userId)
        {
            UserConnections[userId] = Context.ConnectionId;
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            await Clients.All.SendAsync("UserConnected", userId);
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                await _connectionService.AddUserConnection(userId, Context.ConnectionId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = UserConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (!string.IsNullOrEmpty(userId))
            {
                UserConnections.Remove(userId);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
                await Clients.All.SendAsync("UserDisconnected", userId);
            }
            userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
                await _connectionService.RemoveUserConnection(userId, Context.ConnectionId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendUserNotification(string userId, string title, string message, NotificationType type, string? relatedJobId = null)
        {
            if (UserConnections.TryGetValue(userId, out string? connectionId))
            {
                var notification = new Notification(
                    userId: userId,
                    title: title,
                    message: message,
                    type: type,
                    relatedJobId: relatedJobId
                );

                await Clients.Client(connectionId).SendAsync("ReceiveNotification", notification);
            }
        }
    }
}
