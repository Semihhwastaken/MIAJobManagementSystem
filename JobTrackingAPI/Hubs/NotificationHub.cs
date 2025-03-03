using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Models;
using JobTrackingAPI.DTOs;
using JobTrackingAPI.Services;

namespace JobTrackingAPI.Hubs
{
    /// <summary>
    /// SignalR hub for real-time notifications
    /// </summary>
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        /// <summary>
        /// Constructor for NotificationHub
        /// </summary>
        /// <param name="logger">Logger instance</param>
        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Called when a client connects to the hub
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation("User {UserId} connected to NotificationHub", userId);
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            }
            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Called when a client disconnects from the hub
        /// </summary>
        /// <param name="exception">Exception that caused the disconnection, if any</param>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation("User {UserId} disconnected from NotificationHub", userId);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Sends a notification to a specific user
        /// </summary>
        /// <param name="userId">User ID to send the notification to</param>
        /// <param name="notification">Notification to send</param>
        public async Task SendNotification(string userId, NotificationDto notification)
        {
            _logger.LogInformation("Sending notification to user {UserId}", userId);
            await Clients.Group(userId).SendAsync("ReceiveNotification", notification);
        }
    }
}
