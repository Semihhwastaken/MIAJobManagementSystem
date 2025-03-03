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
using JobTrackingAPI.DTOs;
using JobTrackingAPI.Enums;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ITasksService _tasksService;
        private readonly NotificationService _notificationService;
        private readonly ITeamService _teamsService;
        private readonly IMongoCollection<User> _usersCollection;
    
        public TasksController(
            ITasksService tasksService,
            IMongoClient mongoClient, 
            IOptions<MongoDbSettings> settings,
            NotificationService notificationService,
            ITeamService teamsService)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksService = tasksService;
            _notificationService = notificationService;
            _usersCollection = database.GetCollection<User>("Users");
            _teamsService = teamsService;
        }
    
        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] TaskItem task)
        {
            try
            {
                // Validate required fields
                if (task == null)
                    return BadRequest(new { message = "Task data is required" });

                if (string.IsNullOrEmpty(task.Title))
                    return BadRequest(new { message = "Task title is required" });

                // Initialize collections if they're null
                task.Attachments ??= new List<TaskAttachment>();
                task.Dependencies ??= new List<string>();
                task.SubTasks ??= new List<SubTask>();

                // Set initial status and dates
                
                // Atanan kullanıcıları doğrula ve bilgilerini güncelle
                if (task.AssignedUsers != null && task.AssignedUsers.Any())
                {
                    var updatedAssignedUsers = new List<AssignedUser>();
                    foreach (var assignedUser in task.AssignedUsers)
                    {
                        if (string.IsNullOrEmpty(assignedUser.Id))
                        {
                            return BadRequest($"Atanan kullanıcı ID'si boş olamaz.");
                        }
                        var user = await _usersCollection.Find(u => u.Id == assignedUser.Id).FirstOrDefaultAsync();
                        if (user == null)
                        {
                            return BadRequest($"ID'si {assignedUser.Id} olan kullanıcı bulunamadı.");
                        }
                        updatedAssignedUsers.Add(new AssignedUser
                        {
                            Id = user.Id,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Department = user.Department,
                            Title = user.Title,
                            Position = user.Position,
                            ProfileImage = user.ProfileImage
                        });
                        // Send notification to assigned user
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Yeni Görev Atandı",
                            Message = $"{task.Title} görevi size atandı.",
                            Type = NotificationType.TaskAssigned,
                            RelatedJobId = task.Id
                        });
                    }
                    task.AssignedUsers = updatedAssignedUsers;
                }

                // Tarihleri ayarla
                task.CreatedAt = DateTime.UtcNow;
                task.UpdatedAt = DateTime.UtcNow;
                
                // Check if dependencies exist and are valid
                if (task.Dependencies.Any())
                {
                    var dependencyTasks = await _tasksService.GetTasks();
                    var validDependencyIds = dependencyTasks.Select(t => t.Id).ToList();
                    
                    if (task.Dependencies.Any(depId => !validDependencyIds.Contains(depId)))
                    {
                        return BadRequest(new { message = "One or more dependency tasks do not exist" });
                    }
                }

                var createdTask = await _tasksService.CreateTask(task);

                // Notify assigned users
                foreach (var user in task.AssignedUsers)
                {
                    await _notificationService.Clients.User(user.Id).SendAsync(
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
                    return NotFound(new { message = "Task not found" });

                if (task.Status == "completed")
                    return BadRequest(new { message = "Task is already completed" });

                if (string.IsNullOrEmpty(task.TeamId) || !MongoDB.Bson.ObjectId.TryParse(task.TeamId, out _))
                    return BadRequest(new { message = "Invalid team ID format" });

                var oldStatus = task.Status;
                task.Status = "completed";
                task.CompletedDate = DateTime.UtcNow;
                
                // Update task first
                await _tasksService.UpdateTask(id, task);

                try {
                    // Update performance score for each assigned user
                    if (task.AssignedUsers != null)
                    {
                        foreach (var user in task.AssignedUsers)
                        {
                            try
                            {
                                var assignedTeams = await _teamsService.GetTeamsByUserId(user.Id);
                                if (!assignedTeams.Any())
                                {
                                    Console.WriteLine($"Skipping performance update for user {user.Id} - no team membership found");
                                    continue;
                                }
                                
                                await _teamsService.UpdateUserPerformance(user.Id);
                            }
                            catch (Exception userEx)
                            {
                                Console.WriteLine($"Error updating performance for user {user.Id}: {userEx.Message}");
                                // Continue with other users even if one fails
                            }
                        }
                    }
                }
                catch (Exception perfEx)
                {
                    Console.WriteLine($"Error updating performance scores: {perfEx.Message}");
                    // Return success even if performance update fails, since the task was completed
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
                if (existingTask.Status != "completed" && 
                    DateTime.UtcNow > existingTask.DueDate && 
                    existingTask.Status != "overdue")
                {
                    updatedTask.Status = "overdue";
                }

                // UpdateTask in the service now handles file deletion if status changes to completed or overdue
                await _tasksService.UpdateTask(id, updatedTask);
                // Send notifications to all assigned users about the task update
                if (taskUpdate.AssignedUsers != null)
                {
                    foreach (var user in taskUpdate.AssignedUsers)
                    {
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Görev Güncellendi",
                            Message = $"{taskUpdate.Title} görevi güncellendi.",
                            Type = NotificationType.TaskUpdated,
                            RelatedJobId = taskUpdate.Id
                        });
                    }
                }
                
                // Güncellenmiş görevi geri döndür
                var updatedTask = await _tasksCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
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
            var activeTasks = tasks.Where(t => t.Status != "completed").ToList();
            return Ok(activeTasks);
        }
        
        [HttpGet("user/{userId}/active-tasks")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserActiveTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            var activeTasks = tasks.Where(t => t.Status != "completed" && t.Status != "cancelled").ToList();
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
                // DeleteTask in the service now handles file deletion
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

                var oldStatus = task.Status;
                task.Status = status;
                
                if (status == "completed" && oldStatus != "completed")
                {
                    task.CompletedDate = DateTime.UtcNow;
                    return BadRequest("Tüm alt görevler tamamlanmadan görev tamamlanamaz");
                }

                // Görevi tamamlandı olarak işaretle
                var updateTask = Builders<TaskItem>.Update
                    .Set(t => t.Status, "completed")
                    .Set(t => t.UpdatedAt, DateTime.UtcNow)
                    .Set(t => t.IsLocked, true); // Görevi kilitli olarak işaretle
                await _tasksCollection.UpdateOneAsync(t => t.Id == id, updateTask);

                // Send notifications to all assigned users about task completion
                if (task.AssignedUsers != null)
                {
                    foreach (var user in task.AssignedUsers)
                    {
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Görev Tamamlandı",
                            Message = $"{task.Title} görevi tamamlandı.",
                            Type = NotificationType.TaskCompleted,
                            RelatedJobId = task.Id
                        });
                    }
                }
                
                // Update team statistics
                foreach (var assignedUser in task.AssignedUsers)
                {
                    var teams = await _teamsCollection.Find(t => t.Members.Any(m => m.Id == assignedUser.Id)).ToListAsync();
                    
                    // Görev tamamlandığında, atanan tüm kullanıcıların performans skorlarını güncelle
                    foreach (var user in task.AssignedUsers)
                    {
                        // Her kullanıcı için görev listesini getir
                        var userTasks = await _tasksService.GetTasksByUserId(user.Id);
                        
                        // Doğru ekip için performans skorunu güncelle
                        if (!string.IsNullOrEmpty(task.TeamId))
                        {
                            var team = await _teamsService.GetTeamById(task.TeamId);
                            if (team != null)
                            {
                                // Sadece görevin ait olduğu ekipteki performans skorunu güncelle
                                await _teamsService.UpdateUserPerformance(user.Id);
                            }
                        }
                    }
                }
                
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
                // Check if the task is completed or overdue before allowing file upload
                var task = await _tasksService.GetTask(id);
                if (task == null) 
                    return NotFound("Task not found");

                if (task.Status == "completed" || task.Status == "overdue")
                    return BadRequest("Cannot upload files to completed or overdue tasks");

                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded.");
                
                if (file.Length > 1024 * 1024 * 10) // 10MB limit
                    return BadRequest("File size exceeds the limit (10MB).");

                var allowedExtensions = new[] {".jpg", ".png", ".jpeg", ".pdf", ".zip", ".docx", ".doc", ".rar", ".txt", ".xlsx", ".xls",".enc"};
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

                var updatedTask = await _tasksService.GetTask(id);
                var attachment = updatedTask.Attachments.LastOrDefault();

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

                return Ok(new { message = "200" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<TaskHistoryDto>>> GetTaskHistory()
        {
            try
            {
                var tasks = await _tasksService.GetTasks();
                var historicalTasks = tasks.Where(t => t.Status == "completed" || t.Status == "overdue")
                                         .OrderByDescending(t => t.UpdatedAt)
                                         .ToList();

                return Ok(historicalTasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }
}