using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Services;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ITasksService _tasksService;
        private readonly IPerformanceService _performanceService;
        private readonly IHubContext<NotificationHub> _notificationHub;

        public TasksController(
            ITasksService tasksService,
            IPerformanceService performanceService,
            IHubContext<NotificationHub> notificationHub)
        {
            _tasksService = tasksService;
            _performanceService = performanceService;
            _notificationHub = notificationHub;
        }

        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] TaskItem task)
        {
            try
            {
                var createdTask = await _tasksService.CreateTask(task);
                
                // Notify assigned user
                if (!string.IsNullOrEmpty(task.AssignedTo))
                {
                    await _notificationHub.Clients.User(task.AssignedTo).SendAsync(
                        "ReceiveNotification",
                        new { type = "NewTask", message = $"Yeni görev atandı: {task.Title}" }
                    );
                }

                return CreatedAtAction(nameof(GetTask), new { id = createdTask.Id }, createdTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/complete")]
        [HttpPost("{id}/complete")]
        public async Task<ActionResult> CompleteTaskPost(string id)
        {
            try
            {
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound();

                task.Status = "Completed";
                task.CompletedDate = DateTime.UtcNow;
                await _tasksService.UpdateTask(id, task);

                // Update performance score for task completion
                if (!string.IsNullOrEmpty(task.AssignedTo))
                {
                    await _performanceService.UpdatePerformanceScore(task.AssignedTo, task, true);
                }

                return Ok(new { message = "Task completed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateTask(string id, [FromBody] TaskItem updatedTask)
        {
            try
            {
                var existingTask = await _tasksService.GetTask(id);
                if (existingTask == null)
                    return NotFound();

                // Check if task became overdue
                if (existingTask.Status != "Completed" && 
                    DateTime.UtcNow > existingTask.DueDate && 
                    existingTask.Status != "Overdue")
                {
                    updatedTask.Status = "Overdue";
                    
                    // Update performance score for overdue task
                    if (!string.IsNullOrEmpty(existingTask.AssignedTo))
                    {
                        await _performanceService.UpdatePerformanceScore(
                            existingTask.AssignedTo, 
                            existingTask, 
                            false
                        );
                    }
                }

                await _tasksService.UpdateTask(id, updatedTask);
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "User not authenticated" });
            }
            var tasks = await _tasksService.GetTasksByUserId(userId);
            var activeTasks = tasks.Where(t => t.Status != "Completed").ToList();
            return Ok(activeTasks);
        }
        [HttpGet("user/{userId}/active-tasks")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserActiveTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            var activeTasks = tasks.Where(t => t.Status != "Completed" && t.Status != "Cancelled").ToList();
            return Ok(activeTasks);
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            var task = await _tasksService.GetTask(id);
            if (task == null)
                return NotFound();

            return Ok(task);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            return Ok(tasks);
        }
        [HttpGet("download/{attachmentId}/{fileName}")]
        public IActionResult DownloadFile(string attachmentId, string fileName)
        {            
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
            
            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found");

            var contentType = "application/octet-stream";
            var originalFileName = fileName.Substring(fileName.IndexOf('_') + 1);

            return PhysicalFile(filePath, contentType, originalFileName);
        }
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTask(string id)
        {
            try
            {
                await _tasksService.DeleteTask(id);
                return Ok(new { message = "Task deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateTaskStatus(string id, [FromBody] string status)
        {
            try
            {
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound();

                task.Status = status;
                await _tasksService.UpdateTask(id, task);

                return Ok(new { message = "Task status updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("{id}/file")]
        public async Task<IActionResult> FileUpload(string id, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded.");
                
                if (file.Length > 1024 * 1024 * 10) // 10MB limit
                    return BadRequest("File size exceeds the limit (10MB).");

                var allowedExtensions = new[] {".jpg", ".png", ".jpeg", ".pdf", ".zip", ".docx", ".doc", ".rar", ".txt", ".xlsx", ".xls"};
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                if (!allowedExtensions.Contains(fileExtension))
                    return BadRequest("Invalid file format.");

                var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                Directory.CreateDirectory(uploadFolder);

                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var filePath = Path.Combine(uploadFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var fileUrl = $"/uploads/{uniqueFileName}";
                await _tasksService.FileUpload(id, fileUrl);

                var task = await _tasksService.GetTask(id);
                var attachment = task.Attachments.LastOrDefault();

                return Ok(new { 
                    taskId = id,
                    attachment = new {
                        id = attachment.Id,
                        fileName = attachment.FileName,
                        fileUrl = attachment.FileUrl,
                        fileType = attachment.FileType,
                        uploadDate = attachment.UploadDate
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<DashboardStats>> GetDashboardStats()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User not authenticated" });
                }

                var score = await _performanceService.GetUserPerformanceScore(userId);
                return Ok(score);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}