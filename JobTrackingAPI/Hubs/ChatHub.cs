using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JobTrackingAPI.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IConnectionService _connectionService;
        private readonly IMessageService _messageService;
        private static readonly Dictionary<string, string> UserConnections = new Dictionary<string, string>();

        public ChatHub(IConnectionService connectionService, IMessageService messageService)
        {
            _connectionService = connectionService;
            _messageService = messageService;
        }

        public override async Task OnConnectedAsync()
        {
            try
            {
                await base.OnConnectedAsync();  // Call base first

                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                    await _connectionService.AddUserConnection(userId, Context.ConnectionId);
                    UserConnections[userId] = Context.ConnectionId;
                    await Clients.All.SendAsync("UserConnected", userId);
                }
            }
            catch (Exception ex)
            {
                // Log the error
                Console.Error.WriteLine($"Error in OnConnectedAsync: {ex}");
                throw;
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
                    await _connectionService.RemoveUserConnection(userId, Context.ConnectionId);
                    if (UserConnections.ContainsKey(userId))
                    {
                        UserConnections.Remove(userId);
                        await Clients.All.SendAsync("UserDisconnected", userId);
                    }
                }
                await base.OnDisconnectedAsync(exception);
            }
            catch (Exception ex)
            {
                // Log the error
                Console.Error.WriteLine($"Error in OnDisconnectedAsync: {ex}");
                throw;
            }
        }

        // Chat Methods
        public async Task SendDirectMessage(string senderId, string receiverId, string content)
        {
            try
            {
                // Validate the sender
                var currentUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (currentUserId != senderId)
                {
                    throw new HubException("Unauthorized sender");
                }

                // Create and save the message
                var message = await _messageService.CreateMessageAsync(new Message
                {
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    Content = content,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                });

                // Send to receiver
                await Clients.Group(receiverId).SendAsync("ReceiveMessage", message);

                // Send to sender's other connections
                await Clients.Group(senderId).SendAsync("ReceiveMessage", message);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in SendDirectMessage: {ex}");
                throw new HubException($"Failed to send message: {ex.Message}");
            }
        }

        public async Task MarkMessageAsRead(string messageId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    throw new HubException("User not authenticated");
                }

                var message = await _messageService.MarkMessageAsReadAsync(messageId);
                if (message != null)
                {
                    // Notify both sender and receiver
                    await Clients.Group(message.SenderId).SendAsync("MessageRead", messageId);
                    await Clients.Group(message.ReceiverId).SendAsync("MessageRead", messageId);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in MarkMessageAsRead: {ex}");
                throw new HubException($"Failed to mark message as read: {ex.Message}");
            }
        }

        public async Task IsTyping(string userId, string receiverId)
        {
            try
            {
                var currentUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (currentUserId != userId)
                {
                    throw new HubException("Unauthorized user");
                }

                await Clients.Group(receiverId).SendAsync("UserIsTyping", userId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in IsTyping: {ex}");
                throw new HubException($"Failed to send typing indicator: {ex.Message}");
            }
        }

        public async Task StoppedTyping(string userId, string receiverId)
        {
            try
            {
                var currentUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (currentUserId != userId)
                {
                    throw new HubException("Unauthorized user");
                }

                await Clients.Group(receiverId).SendAsync("UserStoppedTyping", userId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in StoppedTyping: {ex}");
                throw new HubException($"Failed to send stopped typing indicator: {ex.Message}");
            }
        }

        public async Task RegisterUser(string userId)
        {
            try
            {
                if (!string.IsNullOrEmpty(userId))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                    await _connectionService.AddUserConnection(userId, Context.ConnectionId);
                    UserConnections[userId] = Context.ConnectionId;
                    await Clients.All.SendAsync("UserConnected", userId);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error in RegisterUser: {ex}");
                throw;
            }
        }
    }
}
