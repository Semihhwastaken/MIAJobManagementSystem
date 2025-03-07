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
        private readonly IWebHostEnvironment _env;

        public MessageController(IMessageService messageService, IWebHostEnvironment env)
        {
            _messageService = messageService;
            _env = env;
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
        /// Send a new message with a file attachment
        /// </summary>
        [HttpPost("send-with-file")]
        public async Task<IActionResult> SendMessageWithFile([FromForm] string senderId, [FromForm] string receiverId, [FromForm] string content, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded");

                if (file.Length > 1024 * 1024 * 10) // 10MB limit
                    return BadRequest("File size exceeds the limit (10MB).");

                var allowedExtensions = new[] { ".jpg", ".png", ".jpeg", ".pdf", ".zip", ".docx", ".doc", ".rar", ".txt", ".xlsx", ".xls" };
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (!allowedExtensions.Contains(fileExtension))
                    return BadRequest("Invalid file format.");

                var message = new Message
                {
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    Content = content,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                var result = await _messageService.CreateMessageWithFileAsync(message, file);
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

        /// <summary>
        /// Download a file attachment for a message
        /// </summary>
        [HttpGet("file/{messageId}")]
        public async Task<IActionResult> DownloadFile(string messageId)
        {
            try
            {
                var message = await _messageService.GetMessageByIdAsync(messageId);
                if (message?.FileAttachment == null)
                    return NotFound("File not found");

                var filePath = Path.Combine(_env.WebRootPath, message.FileAttachment.FilePath);
                if (!System.IO.File.Exists(filePath))
                    return NotFound("File not found");

                var contentType = GetMimeType(message.FileAttachment.FileName);
                var originalFileName = message.FileAttachment.FileName;

                return PhysicalFile(filePath, contentType, originalFileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private string GetMimeType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".txt" => "text/plain",
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls" => "application/vnd.ms-excel",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                // Add more MIME types as needed
                _ => "application/octet-stream", // Default binary file type
            };
        }
    }
}
