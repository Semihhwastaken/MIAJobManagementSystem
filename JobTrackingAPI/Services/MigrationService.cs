using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using MongoDB.Bson;

namespace JobTrackingAPI.Services
{
    public class MigrationService
    {
        private readonly IMongoCollection<User> _users;
        private readonly ILogger<MigrationService> _logger;
        private readonly IMongoCollection<Team> _teams;
        private readonly IMongoCollection<TaskItem> _tasks;
        private readonly IOptions<MongoDbSettings> _settings;

        public MigrationService(
            IOptions<MongoDbSettings> settings,
            ILogger<MigrationService> logger)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _teams = database.GetCollection<Team>("Teams");
            _tasks = database.GetCollection<TaskItem>("Tasks");
            _logger = logger;
            _settings = settings;
        }

        public async Task MigrateDatabase()
        {
            await RemovePasswordField();
            await AddNewUserFields();
            await MigrateTeamsToNewStructure();
            await MigrateTasksToUserHistories();
            await MigrateTeamMemberAssignedJobs();
            await MigrateTeamMemberAttributesToUsers();
            await SimplifyTeamMembersStructure();
            await MigrateTaskAssignedUsersToIds();
        }

        private async Task RemovePasswordField()
        {
            try
            {
                _logger.LogInformation("Veritabanı migrasyonu başlatılıyor: Password alanı kaldırılıyor");
                
                // MongoDB koleksiyonunda "password" alanını kaldır
                var update = Builders<User>.Update.Unset("password");
                var result = await _users.UpdateManyAsync(Builders<User>.Filter.Empty, update);
                
                _logger.LogInformation($"Veritabanı migrasyonu tamamlandı: {result.ModifiedCount} kullanıcı kaydı güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Password alanını kaldırma işlemi sırasında hata oluştu");
                throw;
            }
        }

        private async Task AddNewUserFields()
        {
            try
            {
                _logger.LogInformation("Kullanıcılara yeni alanlar ekleniyor: ownerTeams, memberTeams ve taskHistory");
                
                // Mevcut users koleksiyonunu alın
                var users = await _users.Find(_ => true).ToListAsync();
                
                // Güncellenecek kullanıcılar için sayaç
                int updatedUserCount = 0;
                
                foreach (var user in users)
                {
                    var updateBuilder = Builders<User>.Update;
                    var updates = new List<UpdateDefinition<User>>();
                    
                    // ownerTeams alanını ekle (eğer yoksa)
                    if (user.OwnerTeams == null)
                    {
                        updates.Add(updateBuilder.Set(u => u.OwnerTeams, new List<string>()));
                    }
                    
                    // memberTeams alanını ekle (eğer yoksa)
                    if (user.MemberTeams == null)
                    {
                        updates.Add(updateBuilder.Set(u => u.MemberTeams, new List<string>()));
                    }
                    
                    // taskHistory alanını ekle (eğer yoksa)
                    if (user.TaskHistory == null)
                    {
                        updates.Add(updateBuilder.Set(u => u.TaskHistory, new List<string>()));
                    }
                    
                    // Eğer güncellenecek alan varsa
                    if (updates.Count > 0)
                    {
                        var combinedUpdate = updateBuilder.Combine(updates);
                        var result = await _users.UpdateOneAsync(u => u.Id == user.Id, combinedUpdate);
                        
                        if (result.ModifiedCount > 0)
                        {
                            updatedUserCount++;
                        }
                    }
                }
                
                _logger.LogInformation($"Yeni alanlar eklendi: {updatedUserCount} kullanıcı güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Yeni alanlar eklenirken hata oluştu");
                throw;
            }
        }

        private async Task MigrateTeamsToNewStructure()
        {
            try
            {
                _logger.LogInformation("Takım bilgileri kullanıcı listelerine aktarılıyor");
                
                // Tüm takımları al
                var teams = await _teams.Find(_ => true).ToListAsync();
                
                foreach (var team in teams)
                {
                    // Admin/owner rolündeki kullanıcıları bul
                    var ownerIds = team.Members
                        .Where(m => m.Role.ToLower() == "admin" || m.Role.ToLower() == "owner")
                        .Select(m => m.Id)
                        .ToList();
                    
                    // Üye rolündeki kullanıcıları bul
                    var memberIds = team.Members
                        .Where(m => m.Role.ToLower() == "member")
                        .Select(m => m.Id)
                        .ToList();
                    
                    // Adminlerin ownerTeams listesine ekle
                    foreach (var ownerId in ownerIds)
                    {
                        var ownerUpdate = Builders<User>.Update.AddToSet(u => u.OwnerTeams, team.Id);
                        await _users.UpdateOneAsync(u => u.Id == ownerId, ownerUpdate);
                    }
                    
                    // Üyelerin memberTeams listesine ekle
                    foreach (var memberId in memberIds)
                    {
                        var memberUpdate = Builders<User>.Update.AddToSet(u => u.MemberTeams, team.Id);
                        await _users.UpdateOneAsync(u => u.Id == memberId, memberUpdate);
                    }
                }
                
                _logger.LogInformation($"Takım bilgileri kullanıcı listelerine aktarıldı: {teams.Count} takım işlendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Takım bilgileri aktarılırken hata oluştu");
                throw;
            }
        }

        private async Task MigrateTasksToUserHistories()
        {
            try
            {
                _logger.LogInformation("Tamamlanan ve süresi geçen görevler kullanıcıların taskHistory alanına aktarılıyor");
                
                // Tamamlanan veya süresi geçen görevleri al
                var completedOrOverdueTasks = await _tasks.Find(
                    t => t.Status == "completed" || t.Status == "overdue" || 
                         (t.DueDate < DateTime.UtcNow && t.Status != "completed")).ToListAsync();
                
                int updatedTaskCount = 0;
                
                foreach (var task in completedOrOverdueTasks)
                {
                    if (task.AssignedUsers != null && task.AssignedUsers.Count > 0)
                    {
                        foreach (var assignedUser in task.AssignedUsers)
                        {
                            var taskHistoryUpdate = Builders<User>.Update.AddToSet(u => u.TaskHistory, task.Id);
                            var result = await _users.UpdateOneAsync(u => u.Id == assignedUser.Id, taskHistoryUpdate);
                            
                            if (result.ModifiedCount > 0)
                            {
                                updatedTaskCount++;
                            }
                        }
                    }
                }
                
                _logger.LogInformation($"Görev geçmişi güncellendi: {updatedTaskCount} kullanıcı kaydı güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Görev geçmişi güncellenirken hata oluştu");
                throw;
            }
        }

        private async Task MigrateTeamMemberAssignedJobs()
        {
            try
            {
                _logger.LogInformation("Takım üyelerinin AssignedJobs bilgileri kullanıcılara aktarılıyor");
                
                // Tüm takımları al
                var teams = await _teams.Find(_ => true).ToListAsync();
                int updatedUserCount = 0;
                
                foreach (var team in teams)
                {
                    foreach (var member in team.Members)
                    {
                        // Eğer üyenin AssignedJobs bilgisi varsa
                        if (member.AssignedJobs != null && member.AssignedJobs.Any())
                        {
                            _logger.LogInformation($"Kullanıcı {member.Id} için {member.AssignedJobs.Count} görev aktarılıyor");
                            
                            // Her görevi Users koleksiyonundaki kullanıcının assignedJobs listesine ekle
                            foreach (var taskId in member.AssignedJobs)
                            {
                                // Eğer görevi varsa, kullanıcının assignedJobs listesine ekle
                                var taskExists = await _tasks.CountDocumentsAsync(t => t.Id == taskId) > 0;
                                if (taskExists)
                                {
                                    var update = Builders<User>.Update.AddToSet(u => u.AssignedJobs, taskId);
                                    var result = await _users.UpdateOneAsync(u => u.Id == member.Id, update);
                                    
                                    if (result.ModifiedCount > 0)
                                    {
                                        updatedUserCount++;
                                    }
                                }
                                else
                                {
                                    _logger.LogWarning($"Görev ID {taskId} veritabanında bulunamadı, aktarılmadı");
                                }
                            }
                        }
                    }
                }
                
                _logger.LogInformation($"Takım üyelerinin AssignedJobs bilgileri aktarıldı: {updatedUserCount} kullanıcı güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Takım üyelerinin AssignedJobs bilgileri aktarılırken hata oluştu");
                throw;
            }
        }

        private async Task MigrateTeamMemberAttributesToUsers()
        {
            try
            {
                _logger.LogInformation("Takım üyelerinin ek bilgileri kullanıcılara aktarılıyor");
                
                // Tüm takımları al
                var teams = await _teams.Find(_ => true).ToListAsync();
                int updatedUserCount = 0;
                
                foreach (var team in teams)
                {
                    foreach (var member in team.Members)
                    {
                        // Kullanıcıyı bul
                        var user = await _users.Find(u => u.Id == member.Id).FirstOrDefaultAsync();
                        
                        if (user != null)
                        {
                            var updateBuilder = Builders<User>.Update;
                            var updates = new List<UpdateDefinition<User>>();
                            
                            // Uzmanlık alanlarını güncelle (Team'deki üyenin uzmanlık alanları varsa)
                            if (member.Expertise != null && member.Expertise.Any())
                            {
                                // Her bir uzmanlık alanını kullanıcıya ekle
                                foreach (var expertise in member.Expertise)
                                {
                                    if (!string.IsNullOrEmpty(expertise))
                                    {
                                        updates.Add(updateBuilder.AddToSet("expertise", expertise));
                                    }
                                }
                            }
                            
                            // Telefon bilgisini güncelle
                            if (!string.IsNullOrEmpty(member.Phone) && string.IsNullOrEmpty(user.Phone))
                            {
                                updates.Add(updateBuilder.Set(u => u.Phone, member.Phone));
                            }
                            
                            // Profil resmini güncelle
                            if (!string.IsNullOrEmpty(member.ProfileImage) && string.IsNullOrEmpty(user.ProfileImage))
                            {
                                updates.Add(updateBuilder.Set(u => u.ProfileImage, member.ProfileImage));
                            }
                            
                            // Kullanıcı durumunu güncelle
                            if (!string.IsNullOrEmpty(member.Status) && user.UserStatus == "active")
                            {
                                updates.Add(updateBuilder.Set(u => u.UserStatus, member.Status));
                            }
                            
                            // Metrikleri güncelle
                            if (member.Metrics != null)
                            {
                                updates.Add(updateBuilder.Set(u => u.Metrics, member.Metrics));
                            }
                            
                            // Çevrimiçi durumunu güncelle
                            if (!string.IsNullOrEmpty(member.OnlineStatus))
                            {
                                updates.Add(updateBuilder.Set(u => u.OnlineStatus, member.OnlineStatus));
                            }
                            
                            // Performans puanını güncelle
                            if (member.PerformanceScore > 0)
                            {
                                updates.Add(updateBuilder.Set(u => u.PerformanceScore, member.PerformanceScore));
                            }
                            
                            // Tamamlanmış görev sayısını güncelle
                            if (member.CompletedTasksCount > 0)
                            {
                                updates.Add(updateBuilder.Set(u => u.CompletedTasksCount, member.CompletedTasksCount));
                            }
                            
                            // Kullanılabilirlik programını güncelle
                            if (member.AvailabilitySchedule != null)
                            {
                                updates.Add(updateBuilder.Set(u => u.AvailabilitySchedule, member.AvailabilitySchedule));
                            }
                            
                            // Unvan ve pozisyon bilgilerini güncelle
                            if (!string.IsNullOrEmpty(member.Title) && string.IsNullOrEmpty(user.Title))
                            {
                                updates.Add(updateBuilder.Set(u => u.Title, member.Title));
                            }
                            
                            if (!string.IsNullOrEmpty(member.Position) && string.IsNullOrEmpty(user.Position))
                            {
                                updates.Add(updateBuilder.Set(u => u.Position, member.Position));
                            }
                            
                            // Güncelleme varsa uygula
                            if (updates.Count > 0)
                            {
                                var combinedUpdate = updateBuilder.Combine(updates);
                                var result = await _users.UpdateOneAsync(u => u.Id == member.Id, combinedUpdate);
                                
                                if (result.ModifiedCount > 0)
                                {
                                    updatedUserCount++;
                                    _logger.LogInformation($"Kullanıcı {member.Id} bilgileri takımdan aktarıldı");
                                }
                            }
                        }
                    }
                }
                
                _logger.LogInformation($"Takım üyelerinin ek bilgileri aktarıldı: {updatedUserCount} kullanıcı güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Takım üyelerinin ek bilgileri aktarılırken hata oluştu");
                throw;
            }
        }
        
        private async Task SimplifyTeamMembersStructure()
        {
            try
            {
                _logger.LogInformation("Takım üyeleri yapısı sadeleştiriliyor (sadece ID, Metrics ve JoinedAt bilgileri korunuyor)");
                
                // MongoDB Collection Builder kullanarak koleksiyonu al
                var database = new MongoClient(_settings.Value.ConnectionString).GetDatabase(_settings.Value.DatabaseName);
                var teamsCollection = database.GetCollection<BsonDocument>("Teams");
                
                // Aggregation pipeline oluştur - $project operatörü ile sadece istenen alanları seç
                var pipeline = new BsonDocument[]
                {
                    new BsonDocument("$project", new BsonDocument
                    {
                        { "_id", 1 },
                        { "Name", 1 },
                        { "Description", 1 },
                        { "CreatedById", 1 },
                        { "InviteLink", 1 },
                        { "InviteCode", 1 },
                        { "InviteLinkExpiry", 1 },
                        { "CreatedDate", 1 },
                        { "LastUpdated", 1 },
                        { "Status", 1 },
                        { "WorkingHours", 1 },
                        { "WorkingDays", 1 },
                        { "Start", 1 },
                        { "End", 1 },
                        { "Type", 1 },
                        { "Name_Abbr", 1 },
                        { "Comments", 1 },
                        { "Departments", 1 },
                        { "MemberIds", 1 },
                        { "Members", new BsonDocument("$map", new BsonDocument
                            {
                                { "input", "$Members" },
                                { "as", "member" },
                                { "in", new BsonDocument
                                    {
                                        { "_id", "$$member._id" },
                                        { "JoinedAt", "$$member.JoinedAt" },
                                        { "Metrics", "$$member.Metrics" }
                                    }
                                }
                            })
                        }
                    })
                };
                
                // Aggregation pipeline'ı uygula
                var teams = await teamsCollection.Aggregate<BsonDocument>(pipeline).ToListAsync();
                _logger.LogInformation($"Toplam {teams.Count} takım işlendi");
                
                // Her takım için güncelleme yap
                int updatedTeamCount = 0;
                foreach (var team in teams)
                {
                    var teamId = team["_id"].AsObjectId;
                    var members = team["Members"].AsBsonArray;
                    
                    // Takımı güncelle - sadece Members alanını güncelle
                    var filter = Builders<BsonDocument>.Filter.Eq("_id", teamId);
                    var update = Builders<BsonDocument>.Update.Set("Members", members);
                    
                    var result = await teamsCollection.UpdateOneAsync(filter, update);
                    if (result.ModifiedCount > 0)
                    {
                        updatedTeamCount++;
                        _logger.LogInformation($"Takım {teamId} üyeleri sadeleştirildi");
                    }
                }
                
                _logger.LogInformation($"Takım üyeleri yapısı sadeleştirildi: {updatedTeamCount} takım güncellendi");
                
                // MemberIds alanını ekle (eski metoddan kalan)
                var allTeams = await _teams.Find(_ => true).ToListAsync();
                foreach (var team in allTeams)
                {
                    // Mevcut üyelerin ID'lerini bir liste olarak al
                    var memberIds = team.Members.Select(m => m.Id).ToList();
                    
                    // Üye ID'lerini MemberIds listesine kaydet
                    var update = Builders<Team>.Update
                        .Set(t => t.MemberIds, memberIds);
                    
                    await _teams.UpdateOneAsync(t => t.Id == team.Id, update);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Takım üyeleri yapısı sadeleştirilirken hata oluştu");
                throw;
            }
        }

        private async Task MigrateTaskAssignedUsersToIds()
        {
            try
            {
                _logger.LogInformation("Görevlerin AssignedUsers bilgisi AssignedUserIds alanına aktarılıyor");
                
                // Tüm görevleri al
                var tasks = await _tasks.Find(_ => true).ToListAsync();
                int updatedTaskCount = 0;
                
                foreach (var task in tasks)
                {
                    // AssignedUsers listesi varsa ve AssignedUserIds listesi yoksa veya boşsa
                    if (task.AssignedUsers != null && task.AssignedUsers.Any() && 
                        (task.AssignedUserIds == null || !task.AssignedUserIds.Any()))
                    {
                        var userIds = task.AssignedUsers.Select(au => au.Id).ToList();
                        
                        // AssignedUserIds listesini güncelle
                        var update = Builders<TaskItem>.Update.Set(t => t.AssignedUserIds, userIds);
                        var result = await _tasks.UpdateOneAsync(t => t.Id == task.Id, update);
                        
                        if (result.ModifiedCount > 0)
                        {
                            updatedTaskCount++;
                        }
                    }
                }
                
                _logger.LogInformation($"Görevlerin AssignedUsers bilgisi AssignedUserIds alanına aktarıldı: {updatedTaskCount} görev güncellendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Görevlerin AssignedUsers bilgisi AssignedUserIds alanına aktarılırken hata oluştu");
                throw;
            }
        }
    }
} 