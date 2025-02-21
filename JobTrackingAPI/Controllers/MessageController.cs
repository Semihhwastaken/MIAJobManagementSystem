using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Services;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MessageController : ControllerBase
    {
        private readonly MessageService _messageService;

        public MessageController(MessageService messageService)
        {
            _messageService = messageService;
        }

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

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserMessages(string userId)
        {
            try
            {
                var messages = await _messageService.GetMessagesForUserAsync(userId);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("read/{messageId}")]
        public async Task<IActionResult> MarkAsRead(string messageId)
        {
            try
            {
                var success = await _messageService.MarkMessageAsReadAsync(messageId);
                return success ? Ok() : NotFound();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
