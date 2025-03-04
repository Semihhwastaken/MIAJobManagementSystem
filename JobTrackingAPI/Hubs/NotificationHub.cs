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
        private readonly ITasksService _taskService;
        private readonly ITeamService _teamService;
        private readonly IConnectionService _connectionService;

        /// <summary>
        /// Constructor for NotificationHub
        /// </summary>
        /// <param name="logger">Logger instance</param>
        /// <param name="taskService">Tasks service</param>
        /// <param name="teamService">Team service</param>
        /// <param name="connectionService">Connection service</param>
        public NotificationHub(
            ILogger<NotificationHub> logger,
            ITasksService taskService,
            ITeamService teamService,
            IConnectionService connectionService)
        {
            _logger = logger;
            _taskService = taskService;
            _teamService = teamService;
            _connectionService = connectionService;
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

        /// <summary>
        /// Notifies clients that a task has been updated
        /// </summary>
        /// <param name="taskId">The ID of the updated task</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task NotifyTaskUpdated(string taskId)
        {
            var task = await _taskService.GetTask(taskId);
            if (task != null)
            {
                // Get all users assigned to the task
                var userIds = task.AssignedUsers.Select(u => u.Id).ToList();
                
                // Also notify task creator
                if (task.CreatedBy != null && !string.IsNullOrEmpty(task.CreatedBy.Id) && !userIds.Contains(task.CreatedBy.Id))
                {
                    userIds.Add(task.CreatedBy.Id);
                }
                
                // Send notification to each user
                foreach (var userId in userIds)
                {
                    var connections = await _connectionService.GetUserConnections(userId);
                    if (connections.Any())
                    {
                        await Clients.Clients(connections).SendAsync("TaskUpdated", taskId);
                    }
                }
            }
        }

        /// <summary>
        /// Notifies clients that a team membership has changed
        /// </summary>
        /// <param name="teamId">The ID of the team with membership changes</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task NotifyTeamMembershipChanged(string teamId)
        {
            var team = await _teamService.GetTeamById(teamId);
            if (team != null)
            {
                // Notify all team members
                var userIds = team.Members.Select(m => m.Id).ToList();
                
                foreach (var userId in userIds)
                {
                    var connections = await _connectionService.GetUserConnections(userId);
                    if (connections.Any())
                    {
                        await Clients.Clients(connections).SendAsync("TeamMembershipChanged", teamId);
                    }
                }
            }
        }

        /// <summary>
        /// Notifies clients that a user's profile has been updated
        /// </summary>
        /// <param name="userId">The ID of the user whose profile was updated</param>
        /// <returns>Task representing the asynchronous operation</returns>
        public async Task NotifyUserProfileUpdated(string userId)
        {
            var connections = await _connectionService.GetUserConnections(userId);
            if (connections.Any())
            {
                await Clients.Clients(connections).SendAsync("UserProfileUpdated");
            }
        }
    }
}
