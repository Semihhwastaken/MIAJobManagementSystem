using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public class TasksService : ITasksService
    {
        private readonly IMongoCollection<TaskItem> _tasks;
        private readonly IMongoCollection<User> _users;
        private readonly string _uploadsFolder;
        private readonly CacheService _cacheService;
        private readonly IUserService _userService;

        public TasksService(IOptions<MongoDbSettings> settings, CacheService cacheService, IUserService userService)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _tasks = database.GetCollection<TaskItem>("Tasks");
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            _cacheService = cacheService;
            _userService = userService;
        }

        public async Task<TaskItem> CreateTask(TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.InsertOneAsync(task);
            _cacheService.InvalidateTaskRelatedCaches(task);
            return task;
        }

        public async Task<TaskItem> GetTask(string id)
        {
            return await _tasks.Find(t => t.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<TaskItem>> GetTasks()
        {
            return await _tasks.Find(_ => true).ToListAsync();
        }

        public async Task<List<TaskItem>> GetTasksByUserId(string userId)
        {
            return await _tasks.Find(t => t.AssignedUserIds != null && t.AssignedUserIds.Contains(userId)).ToListAsync();
        }

        public async Task<List<TaskHistory>> GetTaskHistoryByUserId(string userId)
        {
            var tasks = await _tasks.Find(t => t.AssignedUserIds != null && t.AssignedUserIds.Contains(userId)).ToListAsync();
            var history = new List<TaskHistory>();

            foreach (var task in tasks)
            {
                if (task.History != null)
                {
                    history.AddRange(task.History);
                }
            }

            return history.OrderByDescending(h => h.Timestamp).ToList();
        }

        public async Task<TaskItem> UpdateTask(string id, TaskItem taskIn)
        {
            await _tasks.ReplaceOneAsync(t => t.Id == id, taskIn);
            _cacheService.InvalidateTaskRelatedCaches(taskIn);

            // Kullanıcılara bildirim gönderme
            if (taskIn.AssignedUserIds != null && taskIn.AssignedUserIds.Count > 0)
            {
                foreach (var userId in taskIn.AssignedUserIds)
                {
                    var user = await _userService.GetUserById(userId);
                    if (user != null)
                    {
                        // Kullanıcıya bildirim gönderme işlemleri burada
                    }
                }
            }

            return taskIn;
        }

        public async Task DeleteTask(string id)
        {
            var task = await GetTask(id);
            await _tasks.DeleteOneAsync(t => t.Id == id);
            _cacheService.InvalidateTaskRelatedCaches(task);
        }

        public async Task DeleteTaskAttachment(string taskId, string attachmentId)
        {
            try
            {
                var task = await _tasks.Find(t => t.Id == taskId).FirstOrDefaultAsync();
                if (task == null)
                {
                    return;
                }

                var attachment = task.Attachments.FirstOrDefault(a => a.Id == attachmentId);
                if (attachment != null)
                {
                    // Dosyayı sil
                    var filePath = Path.Combine(_uploadsFolder, attachment.FileName);
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                    }

                    // Attachment'ı listeden kaldır
                    var update = Builders<TaskItem>.Update.PullFilter(t => t.Attachments, a => a.Id == attachmentId);
                    await _tasks.UpdateOneAsync(t => t.Id == taskId, update);
                }
            }
            catch (Exception ex)
            {
                // Hata işleme
            }
        }

        public async Task<List<TaskItem>> GetAssignedTasks(string userId, string status = null)
        {
            var filter = Builders<TaskItem>.Filter.Where(t => t.AssignedUserIds != null && t.AssignedUserIds.Contains(userId));

            if (!string.IsNullOrEmpty(status))
            {
                filter = filter & Builders<TaskItem>.Filter.Eq(t => t.Status, status);
            }

            var tasks = await _tasks.Find(filter).ToListAsync();

            // Kullanıcı bilgilerini eklemek için
            foreach (var task in tasks)
            {
                if (task.AssignedUserIds != null && task.AssignedUserIds.Count > 0)
                {
                    var assignedUsers = new List<AssignedUser>();

                    foreach (var uId in task.AssignedUserIds)
                    {
                        var user = await _userService.GetUserById(uId);
                        if (user != null)
                        {
                            assignedUsers.Add(new AssignedUser
                            {
                                Id = user.Id,
                                FullName = user.FullName,
                                Email = user.Email,
                                ProfileImage = user.ProfileImage
                            });
                        }
                    }

                    // Geriye dönük uyumluluk için AssignedUsers listesini de dolduralım
                    task.AssignedUsers = assignedUsers;
                }
            }

            return tasks;
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
            try
            {
                // Kullanıcıyı kontrol et
                var user = await _userService.GetUserById(userId);
                if (user == null || user.TaskHistory == null || !user.TaskHistory.Any())
                {
                    return new List<TaskHistoryDto>();
                }

                var tasks = await _tasks.Find(t => t.AssignedUserIds != null && t.AssignedUserIds.Any(u => u == userId) &&
                                          (t.Status == "completed" || DateTime.UtcNow > (t.DueDate ?? DateTime.MinValue)))
                                .ToListAsync();

                return tasks.Select(t => new TaskHistoryDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = DateTime.UtcNow > (t.DueDate ?? DateTime.MinValue) ? "overdue" : "completed",
                    Priority = t.Priority,
                    Category = t.Category,
                    DueDate = t.DueDate ?? DateTime.MinValue, // Fix: Add null coalescing operator to handle nullable DateTime
                    AssignedUsers = t.AssignedUsers?.Select(u => new UserDto { Id = u.Id, FullName = u.FullName ?? string.Empty }).ToList() ?? new List<UserDto>()
                }).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Kullanıcı görevleri alınırken hata oluştu: {userId}");
                return new List<TaskHistoryDto>();
            }
        }

        public string GetFilePath(string fileName)
        {
            return Path.Combine(_uploadsFolder, fileName);
        }

        // AssignedUsers yerine AssignedUserIds kullanacak şekilde güncelleme
        public async Task<IEnumerable<TaskItem>> GetTasksByAssignedUserIdAsync(string userId)
        {
            try
            {
                // AssignedUserIds listesinde kullanıcı ID'si olan görevleri getir
                var filter = Builders<TaskItem>.Filter.AnyEq(t => t.AssignedUserIds, userId);
                return await _tasks.Find(filter).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Kullanıcıya atanmış görevler alınırken hata oluştu: {userId}");
                return new List<TaskItem>();
            }
        }

        // Kullanıcının departmanına göre görevleri getir
        public async Task<IEnumerable<TaskItem>> GetTasksByDepartmentAsync(string department)
        {
            try
            {
                var tasks = await _tasks.Find(_ => true).ToListAsync();

                // Departmana göre filtreleme işlemi
                var filteredTasks = new List<TaskItem>();

                foreach (var task in tasks)
                {
                    // AssignedUserIds listesine göre kullanıcıları kontrol et
                    if (task.AssignedUserIds != null && task.AssignedUserIds.Any())
                    {
                        var usersInDepartment = await _users.Find(u => u.Department == department && task.AssignedUserIds.Contains(u.Id))
                            .ToListAsync();

                        if (usersInDepartment != null && usersInDepartment.Any())
                        {
                            filteredTasks.Add(task);
                        }
                    }
                }

                return filteredTasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Departman görevleri alınırken hata oluştu: {department}");
                return new List<TaskItem>();
            }
        }

        // Kullanıcının katıldığı tüm takımların görevlerini getir
        public async Task<IEnumerable<TaskItem>> GetTasksByTeamsAsync(List<string> teamIds)
        {
            try
            {
                // Takım ID'lerine göre görevleri getir
                var filter = Builders<TaskItem>.Filter.In(t => t.TeamId, teamIds);
                var tasks = await _tasks.Find(filter).ToListAsync();
                return tasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Takım görevleri alınırken hata oluştu");
                return new List<TaskItem>();
            }
        }

        // Görevlere kullanıcı ata
        public async Task<bool> AssignUserToTaskAsync(string taskId, string userId)
        {
            try
            {
                // Görevi bul
                var task = await _tasks.Find(t => t.Id == taskId).FirstOrDefaultAsync();
                if (task == null)
                {
                    Console.WriteLine($"Görev bulunamadı: {taskId}");
                    return false;
                }

                // Kullanıcıyı bul
                var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null)
                {
                    Console.WriteLine($"Kullanıcı bulunamadı: {userId}");
                    return false;
                }

                // Kullanıcı zaten atanmış mı kontrol et
                if (task.AssignedUserIds != null && task.AssignedUserIds.Contains(userId))
                {
                    return true; // Zaten atanmış durumda
                }

                // AssignedUserIds listesine ID'yi ekle
                var updateUserIds = Builders<TaskItem>.Update.AddToSet(t => t.AssignedUserIds, userId);
                await _tasks.UpdateOneAsync(t => t.Id == taskId, updateUserIds);

                // Geriye dönük uyumluluk için AssignedUsers listesini de güncelle
                var assignedUser = new AssignedUser
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    FullName = user.FullName,
                    Department = user.Department,
                    Title = user.Title,
                    Position = user.Position,
                    ProfileImage = user.ProfileImage
                };

                var updateAssignedUsers = Builders<TaskItem>.Update.AddToSet(t => t.AssignedUsers, assignedUser);
                await _tasks.UpdateOneAsync(t => t.Id == taskId, updateAssignedUsers);

                // Kullanıcının assignedJobs listesine görevi ekle
                var userUpdate = Builders<User>.Update.AddToSet(u => u.AssignedJobs, taskId);
                await _users.UpdateOneAsync(u => u.Id == userId, userUpdate);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Görev atama işlemi başarısız: {taskId}, {userId}");
                return false;
            }
        }

        // Görevden kullanıcı çıkar
        public async Task<bool> RemoveUserFromTaskAsync(string taskId, string userId)
        {
            try
            {
                // Görevi bul
                var task = await _tasks.Find(t => t.Id == taskId).FirstOrDefaultAsync();
                if (task == null)
                {
                    Console.WriteLine($"Görev bulunamadı: {taskId}");
                    return false;
                }

                // Kullanıcıyı bul
                var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null)
                {
                    Console.WriteLine($"Kullanıcı bulunamadı: {userId}");
                    return false;
                }

                // AssignedUserIds listesinden ID'yi çıkar
                var updateUserIds = Builders<TaskItem>.Update.Pull(t => t.AssignedUserIds, userId);
                await _tasks.UpdateOneAsync(t => t.Id == taskId, updateUserIds);

                // Geriye dönük uyumluluk için AssignedUsers listesini de güncelle
                var updateAssignedUsers = Builders<TaskItem>.Update.PullFilter(
                    t => t.AssignedUsers,
                    au => au.Id == userId
                );
                await _tasks.UpdateOneAsync(t => t.Id == taskId, updateAssignedUsers);

                // Kullanıcının assignedJobs listesinden görevi çıkar
                var userUpdate = Builders<User>.Update.Pull(u => u.AssignedJobs, taskId);
                await _users.UpdateOneAsync(u => u.Id == userId, userUpdate);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Görevden kullanıcı çıkarma işlemi başarısız: {taskId}, {userId}");
                return false;
            }
        }

        private async Task<TaskItem> EnrichTaskWithUserData(TaskItem task)
        {
            try
            {
                // Task'in oluşturucusunun bilgilerini al
                if (!string.IsNullOrEmpty(task.CreatedBy?.Id))
                {
                    var creator = await _userService.GetUserById(task.CreatedBy.Id);
                    if (creator != null)
                    {
                        task.CreatedBy.Username = creator.Username;
                        task.CreatedBy.FullName = creator.FullName;
                        task.CreatedBy.ProfileImage = creator.ProfileImage;
                    }
                }

                // AssignedUsers bilgilerini zenginleştir
                if (task.AssignedUserIds != null && task.AssignedUserIds.Any())
                {
                    var users = await _userService.GetUsersByIds(task.AssignedUserIds.ToList());
                    if (users != null)
                    {
                        var updatedAssignedUsers = new List<AssignedUser>();
                        foreach (var user in users)
                        {
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
                }

                return task;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Görev verisi zenginleştirilirken hata oluştu: {ex.Message}");
                return task;
            }
        }

        public async Task<int> GetTotalTaskCount()
        {
            return (int)await _tasks.CountDocumentsAsync(Builders<TaskItem>.Filter.Empty);
        }

        public async Task<IEnumerable<TaskItem>> GetTasks(string teamId = null)
        {
            try
            {
                // If no teamId provided, return all tasks
                if (string.IsNullOrEmpty(teamId))
                {
                    return await _tasks.Find(_ => true).ToListAsync();
                }

                // Filter tasks by teamId
                var filter = Builders<TaskItem>.Filter.Eq(t => t.TeamId, teamId);
                var tasks = await _tasks.Find(filter).ToListAsync();
                
                // Enrich tasks with user data
                var enrichedTasks = new List<TaskItem>();
                foreach (var task in tasks)
                {
                    enrichedTasks.Add(await EnrichTaskWithUserData(task));
                }

                return enrichedTasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting tasks for team {teamId}: {ex.Message}");
                return new List<TaskItem>();
            }
        }
    }
}