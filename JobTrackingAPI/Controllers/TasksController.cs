using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly IMongoCollection<TaskItem> _tasksCollection;

        public TasksController(IMongoClient mongoClient, IOptions<MongoDbSettings> settings)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksCollection = database.GetCollection<TaskItem>("Tasks");
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            try
            {
                var tasks = await _tasksCollection.Find(_ => true).ToListAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                // Loglama yapılmalı
                return StatusCode(500, new { 
                    error = "Internal Server Error",
                    message = ex.Message,
                    stackTrace = ex.StackTrace 
                });
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
    }
}
