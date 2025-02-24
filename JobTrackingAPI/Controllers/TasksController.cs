using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly IMongoCollection<TaskItem> _tasksCollection;
        private readonly IMongoCollection<User> _usersCollection;

        public TasksController(IMongoClient mongoClient, IOptions<MongoDbSettings> settings)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksCollection = database.GetCollection<TaskItem>("Tasks");
            _usersCollection = database.GetCollection<User>("Users");
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var filter = Builders<TaskItem>.Filter.ElemMatch(t => t.AssignedUsers, u => u.Id == userId);
                var tasks = await _tasksCollection.Find(filter).ToListAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            var task = await _tasksCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
            if (task == null)
            {
                return NotFound();
            }
            return task;
        }

        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask(TaskItem task)
        {
            try
            {
                // MongoDB ObjectId oluştur
                task.Id = ObjectId.GenerateNewId().ToString();
                
                // Boş listeleri initialize et
                task.SubTasks ??= new List<SubTask>();
                task.AssignedUsers ??= new List<AssignedUser>();
                task.Dependencies ??= new List<string>();
                task.Attachments ??= new List<TaskAttachment>();

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
                    }
                    task.AssignedUsers = updatedAssignedUsers;
                }

                // Tarihleri ayarla
                task.CreatedAt = DateTime.UtcNow;
                task.UpdatedAt = DateTime.UtcNow;

                // Varsayılan değerleri ayarla
                if (string.IsNullOrEmpty(task.Status))
                    task.Status = "todo";
                if (string.IsNullOrEmpty(task.Priority))
                    task.Priority = "medium";
                if (string.IsNullOrEmpty(task.Category))
                    task.Category = "Personal";

                await _tasksCollection.InsertOneAsync(task);
                return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    error = "Internal Server Error",
                    message = ex.Message,
                    stackTrace = ex.StackTrace 
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(string id, TaskItem taskUpdate)
        {
            try 
            {
                if (string.IsNullOrEmpty(id))
                {
                    return BadRequest("ID boş olamaz");
                }

                if (!ObjectId.TryParse(id, out _))
                {
                    return BadRequest("Geçersiz ID formatı");
                }

                taskUpdate.Id = id;

                var existingTask = await _tasksCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
                if (existingTask == null)
                {
                    return NotFound($"ID'si {id} olan görev bulunamadı");
                }

                var result = await _tasksCollection.ReplaceOneAsync(t => t.Id == id, taskUpdate);
                
                if (result.ModifiedCount == 0)
                {
                    return StatusCode(500, "Görev güncellenemedi");
                }

                // Güncellenmiş görevi geri döndür
                var updatedTask = await _tasksCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            var result = await _tasksCollection.DeleteOneAsync(t => t.Id == id);
            if (result.DeletedCount == 0)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpGet("my-tasks")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetMyTasks()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var filter = Builders<TaskItem>.Filter.ElemMatch(t => t.AssignedUsers, u => u.Id == userId);
                var tasks = await _tasksCollection.Find(filter).ToListAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
