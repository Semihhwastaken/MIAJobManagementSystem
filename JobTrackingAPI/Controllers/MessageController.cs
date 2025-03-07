using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Services;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Controllers
{
    /// <summary>
    /// Controller for handling message-related operations
    /// </summary>
    [ApiController]
    [Route("api/[controller]s")]
    public class MessageController : ControllerBase
    {
        private readonly IMessageService _messageService;

        public MessageController(IMessageService messageService)
        {
            _messageService = messageService;
        }

        /// <summary>
        /// Send a new message
        /// </summary>
        [HttpPost("send/{senderId}")]
        public async Task<IActionResult> SendMessage(string senderId, [FromBody] SendMessageDto messageDto)
        {
            try
            {
                var result = await _messageService.SendMessageAsync(senderId, messageDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get messages for a user with pagination
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserMessages(
            string userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var messages = await _messageService.GetMessagesForUserAsync(userId, page, pageSize);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get conversation between two users
        /// </summary>
        [HttpGet("conversation/{userId}/{otherUserId}")]
        public async Task<IActionResult> GetConversation(
            string userId,
            string otherUserId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var messages = await _messageService.GetMessagesBetweenUsersAsync(
                    userId,
                    otherUserId,
                    (page - 1) * pageSize,
                    pageSize);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Mark a message as read
        /// </summary>
        [HttpPut("read/{messageId}")]
        public async Task<IActionResult> MarkAsRead(string messageId)
        {
            try
            {
                var updatedMessage = await _messageService.MarkMessageAsReadAsync(messageId);
                return updatedMessage != null ? Ok(updatedMessage) : NotFound();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete a message
        /// </summary>
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(string messageId, [FromQuery] string userId)
        {
            try
            {
                var result = await _messageService.DeleteMessageAsync(messageId, userId);
                return result ? Ok() : NotFound();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Upload a file attachment for a message
        /// </summary>
        [HttpPost("upload/{messageId}")]
        public async Task<IActionResult> UploadFile(string messageId, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded");

                var result = await _messageService.AddFileToMessageAsync(messageId, file);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get all conversations for a user
        /// </summary>
        [HttpGet("conversations/{userId}")]
        public async Task<IActionResult> GetConversations(string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest("User ID is required");
                }

                var conversations = await _messageService.GetConversationsAsync(userId);
                return Ok(conversations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get unread message count for a user
        /// </summary>
        [HttpGet("unread/{userId}")]
        public async Task<IActionResult> GetUnreadCount(string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest("User ID is required");
                }

                var unreadCounts = await _messageService.GetUnreadMessageCountAsync(userId);
                return Ok(new { unreadCount = unreadCounts });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get list of online users
        /// </summary>
        [HttpGet("online-users")]
        public async Task<IActionResult> GetOnlineUsers()
        {
            try
            {
                var onlineUsers = await _messageService.GetOnlineUsersAsync();
                return Ok(onlineUsers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Notify that a user is typing
        /// </summary>
        [HttpPost("typing/{userId}/{receiverId}")]
        public async Task<IActionResult> NotifyTyping(string userId, string receiverId)
        {
            try
            {
                await _messageService.NotifyUserTypingAsync(userId, receiverId);
                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
