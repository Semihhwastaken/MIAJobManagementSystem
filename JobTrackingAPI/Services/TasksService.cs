using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services
{
    public class TasksService : ITasksService
    {
        private readonly IMongoCollection<TaskItem> _tasks;
        private readonly string _uploadsFolder;
        private readonly ILogger<TasksService> _logger;

        public TasksService(IOptions<MongoDbSettings> settings, ILogger<TasksService> logger)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _tasks = database.GetCollection<TaskItem>("Tasks");
            _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            _logger = logger;
            
            // Ensure we have proper indexes for performance
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            try
            {
                // Check existing indexes
                var indexExists = false;
                using (var cursor = _tasks.Indexes.List())
                {
                    var indexes = cursor.ToList();
                    foreach (var index in indexes)
                    {
                        if (index["name"] == "AssignedUsers_TeamId_Status_Compound")
                        {
                            indexExists = true;
                            break;
                        }
                    }
                }

                if (!indexExists)
                {
                    // Create compound index for the most common queries
                    var indexKeys = Builders<TaskItem>.IndexKeys
                        .Ascending("AssignedUsers.Id")
                        .Ascending("TeamId")
                        .Ascending("Status");
                        
                    var indexOptions = new CreateIndexOptions 
                    { 
                        Name = "AssignedUsers_TeamId_Status_Compound",
                        Background = true 
                    };
                    
                    _tasks.Indexes.CreateOne(new CreateIndexModel<TaskItem>(indexKeys, indexOptions));
                    _logger.LogInformation("Created compound index on Tasks collection for performance");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating indexes on Tasks collection");
                // Continue execution even if index creation fails
            }
        }

        public async Task<TaskItem> CreateTask(TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.InsertOneAsync(task);
            return task;
        }

        public async Task<TaskItem> GetTask(string id)
        {
            return await _tasks.Find(t => t.Id == id).FirstOrDefaultAsync();
        }

        // Original inefficient method - potentially causing the 9-second delay
        public async Task<List<TaskItem>> GetTasks()
        {
            return await _tasks.Find(_ => true).ToListAsync();
        }

        // New optimized method that will replace the slow one
        public async Task<List<TaskItem>> GetTasksOptimized(string userId)
        {
            try
            {
                _logger.LogInformation("Getting optimized tasks for user {UserId}", userId);
                
                // Start measuring time
                var startTime = DateTime.UtcNow;
                
                // Use projection to only get the fields we need
                var projection = Builders<TaskItem>.Projection
                    .Include(t => t.Id)
                    .Include(t => t.Title)
                    .Include(t => t.Description)
                    .Include(t => t.Status)
                    .Include(t => t.Priority)
                    .Include(t => t.Category)
                    .Include(t => t.DueDate)
                    .Include(t => t.CompletedDate)
                    .Include(t => t.TeamId)
                    .Include(t => t.AssignedUsers)
                    .Include(t => t.CreatedAt)
                    .Include(t => t.UpdatedAt)
                    .Include(t => t.Dependencies);
                
                // We'll get relevant tasks that the user has access to:
                // 1. Tasks directly assigned to the user
                // 2. Tasks in teams where the user is a member
                
                var userFilter = Builders<TaskItem>.Filter.ElemMatch(t => t.AssignedUsers, u => u.Id == userId);
                
                // Execute the query with the projection
                var userTasks = await _tasks
                    .Find(userFilter)
                    .Project<TaskItem>(projection)
                    .ToListAsync();
                
                // Log performance data
                var queryTime = DateTime.UtcNow - startTime;
                _logger.LogInformation("Task query for user {UserId} took {ElapsedMs}ms", 
                    userId, queryTime.TotalMilliseconds);
                
                // Initialize any needed fields that weren't included in projection
                foreach (var task in userTasks)
                {
                    task.SubTasks = task.SubTasks ?? new List<SubTask>();
                    task.Comments = task.Comments ?? new List<Comment>();
                    task.Attachments = task.Attachments ?? new List<TaskAttachment>();
                }
                
                return userTasks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetTasksOptimized for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<TaskItem>> GetTasksByUserId(string userId)
        {
            return await _tasks.Find(t => t.AssignedUsers.Any(u => u.Id == userId)).ToListAsync();
        }

        public async Task<TaskItem> UpdateTask(string id, TaskItem task)
        {
            task.UpdatedAt = DateTime.UtcNow;
            
            // Check if the status is changing to completed or overdue
            var existingTask = await GetTask(id);
            if (existingTask != null && 
                (existingTask.Status != "completed" && task.Status == "completed" ||
                 existingTask.Status != "overdue" && task.Status == "overdue"))
            {
                // Delete associated files
                await DeleteTaskFiles(existingTask);
            }
            
            await _tasks.ReplaceOneAsync(t => t.Id == id, task);
            return task;
        }

        public async Task DeleteTask(string id)
        {
            var task = await GetTask(id);
            if (task != null)
            {
                // Delete associated files before deleting the task
                await DeleteTaskFiles(task);
            }
            
            await _tasks.DeleteOneAsync(t => t.Id == id);
        }

        public async Task FileUpload(string id, string fileUrl)
        {
            var filter = Builders<TaskItem>.Filter.Eq(t => t.Id, id);
            var update = Builders<TaskItem>.Update
                .Push(t => t.Attachments, new TaskAttachment
                {
                    Id = Guid.NewGuid().ToString(),
                    FileUrl = fileUrl,
                    FileName = Path.GetFileName(fileUrl),
                    FileType = Path.GetExtension(fileUrl),
                    UploadDate = DateTime.UtcNow
                })
                .Set(t => t.UpdatedAt, DateTime.UtcNow);

            await _tasks.UpdateOneAsync(filter, update);
        }

        // New method to delete all files associated with a task
        public async Task DeleteTaskFiles(TaskItem task)
        {
            if (task.Attachments == null || task.Attachments.Count == 0)
                return;

            foreach (var attachment in task.Attachments)
            {
                string fileName = Path.GetFileName(attachment.FileUrl);
                string filePath = Path.Combine(_uploadsFolder, fileName);
                
                if (File.Exists(filePath))
                {
                    try
                    {
                        File.Delete(filePath);
                    }
                    catch (Exception ex)
                    {
                        // Log the error but continue with other files
                        Console.WriteLine($"Error deleting file {filePath}: {ex.Message}");
                    }
                }
            }
            
            // Optionally clear the attachments list in the database
            var filter = Builders<TaskItem>.Filter.Eq(t => t.Id, task.Id);
            var update = Builders<TaskItem>.Update.Set(t => t.Attachments, new List<TaskAttachment>());
            await _tasks.UpdateOneAsync(filter, update);
        }

        public async Task<List<TaskHistoryDto>> GetUserTaskHistory(string userId)
        {
            var tasks = await _tasks.Find(t => t.AssignedUsers.Any(u => u.Id == userId) &&
                                      (t.Status == "completed" || DateTime.UtcNow > t.DueDate))
                            .ToListAsync();

            return tasks.Select(t => new TaskHistoryDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = DateTime.UtcNow > t.DueDate ? "overdue" : "completed",
                Priority = t.Priority,
                Category = t.Category,
                DueDate = t.DueDate,
                AssignedUsers = t.AssignedUsers.Select(u => new UserDto { Id = u.Id, FullName = u.FullName }).ToList()
            }).ToList();
        }

        public string GetFilePath(string fileName)
        {
            return Path.Combine(_uploadsFolder, fileName);
        }

        /// <summary>
        /// Gets all tasks assigned to a specific user
        /// </summary>
        /// <param name="userId">The user ID</param>
        /// <returns>List of tasks assigned to the user</returns>
        public async Task<List<TaskItem>> GetTasksAssignedToUserAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentNullException(nameof(userId));
                
            try
            {
                // Create a filter to find tasks where the user is assigned
                var filter = Builders<TaskItem>.Filter.ElemMatch(t => t.AssignedUsers, u => u.Id == userId);
                
                // MongoDB doesn't allow mixing inclusion and exclusion in projections
                // Use ONLY inclusion (this will exclude all fields not explicitly included)
                var projection = Builders<TaskItem>.Projection
                    .Include(t => t.Id)
                    .Include(t => t.Title)
                    .Include(t => t.Description)
                    .Include(t => t.Status)
                    .Include(t => t.Priority)
                    .Include(t => t.Category)
                    .Include(t => t.DueDate)
                    .Include(t => t.CompletedDate)
                    .Include(t => t.TeamId)
                    .Include(t => t.AssignedUsers)
                    .Include(t => t.CreatedAt)
                    .Include(t => t.UpdatedAt)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.IsLocked);
                    // Don't include Attachments and Comments to optimize response size
                    
                // Start measuring execution time
                var startTime = DateTime.UtcNow;
                
                // Execute the query with a limit to prevent large result sets
                var tasks = await _tasks
                    .Find(filter)
                    .Project<TaskItem>(projection)
                    .Limit(100)
                    .ToListAsync();
                
                // Log performance data
                var queryTime = DateTime.UtcNow - startTime;
                _logger.LogInformation("GetTasksAssignedToUserAsync query took {ElapsedMs}ms", 
                    queryTime.TotalMilliseconds);
                
                // Initialize empty collections for fields that weren't included in projection
                foreach (var task in tasks)
                {
                    task.Attachments = new List<TaskAttachment>();
                    task.SubTasks = new List<SubTask>();
                    task.Dependencies = new List<string>();
                    task.Comments = new List<Comment>();
                }
                
                return tasks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tasks assigned to user {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Helper method to load only attachment metadata for multiple tasks
        /// </summary>
        private async Task LoadAttachmentMetadataForTasks(List<TaskItem> tasks, List<string> taskIds)
        {
            try
            {
                // Create a separate query just for attachment metadata
                var filter = Builders<TaskItem>.Filter.In(t => t.Id, taskIds);
                var projection = Builders<TaskItem>.Projection
                    .Include(t => t.Id)
                    .Include(t => t.Attachments);
                    
                var attachmentResults = await _tasks
                    .Find(filter)
                    .Project<TaskWithAttachments>(projection)
                    .ToListAsync();
                    
                // Create a lookup dictionary for fast access
                var attachmentsDict = attachmentResults.ToDictionary(
                    t => t.Id,
                    t => t.Attachments ?? new List<TaskAttachment>()
                );
                
                // Populate the attachments for each task
                foreach (var task in tasks)
                {
                    if (attachmentsDict.TryGetValue(task.Id, out var attachments))
                    {
                        task.Attachments = attachments;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading attachment metadata for tasks");
                // Continue with empty attachments rather than failing the entire operation
            }
        }

        // Helper class for attachment projection
        private class TaskWithAttachments
        {
            [BsonId]
            [BsonRepresentation(BsonType.ObjectId)]
            public string Id { get; set; }
            
            [BsonElement("attachments")]
            public List<TaskAttachment> Attachments { get; set; }
        }
    }
}