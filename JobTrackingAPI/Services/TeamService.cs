using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text;
using JobTrackingAPI.Controllers;
using JobTrackingAPI.Constants;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Models.Requests;
using CreateTeamRequest = JobTrackingAPI.Models.Requests.CreateTeamRequest;

namespace JobTrackingAPI.Services;

/// <summary>
/// Takım işlemlerini yöneten servis sınıfı
/// </summary>
public class TeamService : ITeamService
{
    private readonly IMongoCollection<Team> _teams;
    private readonly IUserService _userService;
    private readonly IOptions<MongoDbSettings> _settings;
    private readonly IMongoCollection<TaskItem> _tasks;
    private readonly IMongoCollection<PerformanceScore> _performanceScores;
   
    private readonly INotificationService _notificationService;

    public TeamService(
        IOptions<MongoDbSettings> settings, 
        IUserService userService,
        IMongoDatabase database,
        INotificationService notificationService)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _teams = db.GetCollection<Team>("Teams");
        _tasks = db.GetCollection<TaskItem>("Tasks");
        _performanceScores = db.GetCollection<PerformanceScore>("PerformanceScores");
        _userService = userService;
        _settings = settings;
        _notificationService = notificationService;
    }

    /// <summary>
    /// ID'ye göre takım getirir
    /// </summary>
    public async Task<Team> GetTeamById(string id)
    {
        return await _teams.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Yeni takım oluşturur
    /// </summary>
    public async Task<Team> CreateTeam(CreateTeamRequest request, string userId)
    {
        var user = await _userService.GetUserById(userId);
        if (user == null)
            throw new Exception("Kullanıcı bulunamadı");

        var team = new Team
        {
            Name = request.Name,
            Description = request.Description,
            CreatedById = user.Id, // Users koleksiyonundaki ID kullanılıyor
            Members = new List<TeamMember>
            {
                new TeamMember
                {
                    Id = user.Id, // Users koleksiyonundaki ID kullanılıyor
                    Role = "admin",
                    Username = user.Username,
                    Email = user.Email,
                    FullName = user.FullName,
                    Department = user.Department,
                    ProfileImage = user.ProfileImage,
                    Title = user.Title,
                    Position = user.Position,
                    Phone = user.Phone,
                    PerformanceScore = 0,
                    CompletedTasksCount = 0,
                    Status = "available",
                    OnlineStatus = "online",
                    JoinedAt = DateTime.UtcNow
                }
            },
            Departments = new List<DepartmentStats> { new DepartmentStats { Name = request.Department } }
        };
        await _teams.InsertOneAsync(team);
        return team;
    }

    public async Task<IEnumerable<Team>> GetAllTeams()
    {
        return await _teams.Find(_ => true).ToListAsync();
    }

    public async Task<Team> UpdateTeam(string teamId, Team updatedTeam)
    {
        await _teams.ReplaceOneAsync(t => t.Id == teamId, updatedTeam);
        return updatedTeam;
    }

    public async Task DeleteTeam(string teamId)
    {
        await _teams.DeleteOneAsync(t => t.Id == teamId);
    }

    public async Task<bool> AddMemberToTeam(string teamId, string userId, string role = "member")
    {
        var user = await _userService.GetUserById(userId);
        if (user == null)
            throw new Exception("Kullanıcı bulunamadı");

        var newMember = new TeamMember
        {
            Id = user.Id, // Users koleksiyonundaki ID kullanılıyor
            Role = role,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Department = user.Department,
            ProfileImage = user.ProfileImage,
            Title = user.Title,
            Position = user.Position,
            Phone = user.Phone,
            PerformanceScore = 0,
            CompletedTasksCount = 0,
            Status = "available",
            OnlineStatus = "online",
            JoinedAt = DateTime.UtcNow
        };
        var update = Builders<Team>.Update.AddToSet(t => t.Members, newMember);
        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> RemoveMemberFromTeam(string teamId, string userId)
    {
        var update = Builders<Team>.Update.PullFilter(t => t.Members, m => m.Id == userId);
        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        return result.ModifiedCount > 0;
    }

    public async Task<Team> GetTeamByMemberId(string memberId)
    {
        return await _teams.Find(t => t.Members.Any(m => m.Id == memberId)).FirstOrDefaultAsync();
    }

    public async Task<bool> UpdateMemberRole(string teamId, string userId, string newRole)
    {
        var filter = Builders<Team>.Filter.And(
            Builders<Team>.Filter.Eq(t => t.Id, teamId),
            Builders<Team>.Filter.ElemMatch(t => t.Members, m => m.Id == userId));

        var update = Builders<Team>.Update.Set("Members.$.Role", newRole);
        var result = await _teams.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<PerformanceScore> GetUserPerformance(string userId)
    {
        var performanceScore = await _performanceScores
            .Find(p => p.UserId == userId)
            .FirstOrDefaultAsync();

        if (performanceScore == null)
        {
            performanceScore = new PerformanceScore
            {
                UserId = userId,
                LastUpdated = DateTime.UtcNow
            };
            await _performanceScores.InsertOneAsync(performanceScore);
        }

        return performanceScore;
    }

    public async Task UpdateUserPerformance(string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentNullException(nameof(userId));

        try
        {
            // Kullanıcının tüm görevlerini getir
            var userTasks = await _tasks
                .Find(t => t.AssignedUsers.Any(u => u.Id == userId))
                .ToListAsync();

            // Kullanıcının üye olduğu tüm takımları bul
            var userTeams = await GetTeamsByUserId(userId);

            // If user doesn't belong to any teams, log it and return without error
            if (!userTeams.Any())
            {
                Console.WriteLine($"User {userId} does not belong to any teams. Skipping performance update.");
                return;
            }

            foreach (var team in userTeams)
            {
                try
                {
                    // Validate team ID
                    if (string.IsNullOrEmpty(team.Id) || !MongoDB.Bson.ObjectId.TryParse(team.Id, out _))
                    {
                        Console.WriteLine($"Invalid team ID format for team: {team.Id}");
                        continue;
                    }

                    // Her takım için ayrı performans skoru hesapla
                    var filter = Builders<PerformanceScore>.Filter.And(
                        Builders<PerformanceScore>.Filter.Eq(p => p.UserId, userId),
                        Builders<PerformanceScore>.Filter.Eq(p => p.TeamId, team.Id)
                    );

                    var performanceScore = await _performanceScores
                        .Find(filter)
                        .FirstOrDefaultAsync();

                    var oldScore = 100.0; // Varsayılan başlangıç skoru

                    if (performanceScore == null)
                    {
                        // Generate a new ObjectId for the performance score
                        performanceScore = new PerformanceScore
                        {
                            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                            UserId = userId,
                            TeamId = team.Id,
                            Score = oldScore,
                            LastUpdated = DateTime.UtcNow,
                            History = new List<ScoreHistory>()
                        };
                    }
                    else
                    {
                        oldScore = performanceScore.Score;
                    }

                    // Detaylı metrikleri hesapla
                    performanceScore.Metrics = PerformanceCalculator.CalculateDetailedMetrics(userTasks, team.Id);
                    
                    // Takıma özel performans skorunu hesapla
                    performanceScore.Score = PerformanceCalculator.CalculateUserPerformance(userTasks, team.Id);
                    
                    // Tamamlanan ve geciken görev sayılarını güncelle
                    var teamTasks = userTasks.Where(t => t.TeamId == team.Id).ToList();
                    performanceScore.CompletedTasksCount = teamTasks.Count(t => t.Status == "completed");
                    performanceScore.OverdueTasksCount = teamTasks.Count(t => t.Status == "overdue");
                    performanceScore.TotalTasksAssigned = teamTasks.Count;
                    performanceScore.LastUpdated = DateTime.UtcNow;

                    // Skor geçmişini güncelle
                    performanceScore.History.Add(new ScoreHistory
                    {
                        Date = DateTime.UtcNow,
                        ScoreChange = performanceScore.Score - oldScore,
                        Reason = "Performance recalculated based on task updates",
                        TeamId = team.Id,
                        ActionType = "recalculation"
                    });

                    // Performans skorunu kaydet
                    await _performanceScores.ReplaceOneAsync(
                        filter,
                        performanceScore,
                        new ReplaceOptions { IsUpsert = true }
                    );

                    // Takım üyesinin metriklerini güncelle
                    var member = team.Members.FirstOrDefault(m => m.Id == userId);
                    if (member != null)
                    {
                        await UpdateMemberMetrics(team.Id, userId, new MemberMetricsUpdateDto
                        {
                            PerformanceScore = performanceScore.Score,
                            CompletedTasks = performanceScore.CompletedTasksCount,
                            OverdueTasks = performanceScore.OverdueTasksCount,
                            TotalTasks = performanceScore.TotalTasksAssigned
                        });
                    }
                }
                catch (Exception ex)
                {
                    // Log the error with more details
                    Console.WriteLine($"Error updating performance for team {team.Id}: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    continue; // Continue with other teams even if one fails
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in UpdateUserPerformance: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            // Don't throw the exception, just log it to prevent task completion from failing
        }
    }

    public async Task<Team> SetTeamInviteLink(string teamId, string inviteLink)
    {
        if (string.IsNullOrEmpty(teamId))
            throw new ArgumentNullException(nameof(teamId));
            
        if (string.IsNullOrEmpty(inviteLink))
            throw new ArgumentNullException(nameof(inviteLink));

        var update = Builders<Team>.Update.Set(t => t.InviteLink, inviteLink);
        await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        var updatedTeam = await GetTeamById(teamId);
        
        if (updatedTeam == null)
            throw new Exception("Takım güncellenemedi");
            
        return updatedTeam;
    }

    public async Task<bool> JoinTeamViaInviteLink(string inviteLink, string userId)
    {
        var team = await _teams.Find(t => t.InviteLink == inviteLink).FirstOrDefaultAsync();
        if (team == null) return false;

        return await AddMemberToTeam(team.Id, userId);
    }

    public async Task<Team> UpdateTeamDepartments(string teamId, UpdateTeamDepartmentsRequest request)
    {
        var update = Builders<Team>.Update.Set(t => t.Departments, request.Departments);
        await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        return await GetTeamById(teamId);
    }

    public async Task<bool> UpdateMemberMetrics(string teamId, string userId, MemberMetricsUpdateDto metrics)
    {
        var filter = Builders<Team>.Filter.And(
            Builders<Team>.Filter.Eq(t => t.Id, teamId),
            Builders<Team>.Filter.ElemMatch(t => t.Members, m => m.Id == userId));

        var update = Builders<Team>.Update.Set("Members.$.Metrics", metrics);
        var result = await _teams.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// Takım oluşturur
    /// </summary>
    public async Task<Team> CreateAsync(Team team)
    {
        try
        {
            // Takım adının benzersiz olduğunu kontrol et
            var existingTeam = await _teams.Find(t => t.Name == team.Name).FirstOrDefaultAsync();
            if (existingTeam != null)
            {
                throw new Exception("Bu isimde bir takım zaten mevcut.");
            }

            // Her üye için eksik bilgileri doldur
            foreach (var member in team.Members)
            {
                var user = await _userService.GetUserById(member.Id);
                if (user != null)
                {
                    member.Title = user.Title;
                    member.Position = user.Position;
                    member.Phone = user.Phone;
                }

                // Assigned Jobs bilgisini Tasks koleksiyonundan al
                var assignedTasks = await _tasks
                    .Find(t => t.AssignedUsers.Any(u => u.Id == member.Id))
                    .ToListAsync();
                member.AssignedJobs = assignedTasks.Select(t => t.Id).ToList();

                // AvailabilitySchedule varsayılan değerlerini ayarla
                member.AvailabilitySchedule = new AvailabilitySchedule
                {
                    WorkingHours = new WorkingHours
                    {
                        Start = "09:00",
                        End = "18:00"
                    },
                    WorkingDays = new List<string> { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" }
                };
            }

            team.CreatedAt = DateTime.UtcNow;
            team.InviteCode = GenerateInviteCode();

            await _teams.InsertOneAsync(team);
            return team;
        }
        catch (Exception ex)
        {
            throw new Exception($"Takım oluşturulurken bir hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Takımı günceller
    /// </summary>
    public async Task<bool> UpdateAsync(string id, Team team)
    {
        var result = await _teams.ReplaceOneAsync(t => t.Id == id, team);
        return result.IsAcknowledged && result.ModifiedCount > 0;
    }

    /// <summary>
    /// Takımı siler
    /// </summary>
    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _teams.DeleteOneAsync(t => t.Id == id);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    /// <summary>
    /// Tüm takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetAllMembersAsync()
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        return teams.SelectMany(t => t.Members).ToList();
    }

    /// <summary>
    /// Tüm departmanları getirir
    /// </summary>
    public async Task<List<string>> GetDepartmentsAsync()
    {
        // Statik departman listesini döndür
        return DepartmentConstants.Departments;
    }

    /// <summary>
    /// Departmana göre takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetMembersByDepartmentAsync(string department)
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        return teams.SelectMany(t => t.Members).Where(m => m.Department == department).ToList();
    }

    /// <summary>
    /// Takım üyesinin durumunu günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberStatusAsync(string id, string status)
    {
        var teams = await _teams.Find(t => t.Members.Any(m => m.Id == id)).ToListAsync();
        foreach (var team in teams)
        {
            var member = team.Members.FirstOrDefault(m => m.Id == id);
            if (member != null)
            {
                // Frontend'den gelen durum değişikliğini doğrudan uygula
                member.Status = status;
                
                // Takımı güncelle
                await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
                
                // Notify clients about the status change
                await _notificationHubContext.Clients.All.SendAsync("MemberStatusUpdated", new { memberId = id, status = member.Status });
                
                return member;
            }
        }
        return null;
    }

    /// <summary>
    /// Takım üyesini günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberAsync(string id, TeamMemberUpdateDto updateDto)
    {
        var teams = await _teams.Find(t => t.Members.Any(m => m.Id == id)).ToListAsync();
        foreach (var team in teams)
        {
            var member = team.Members.FirstOrDefault(m => m.Id == id);
            if (member != null)
            {
                if (!string.IsNullOrEmpty(updateDto.Email))
                    member.Email = updateDto.Email;
                if (!string.IsNullOrEmpty(updateDto.FullName))
                    member.FullName = updateDto.FullName;
                if (!string.IsNullOrEmpty(updateDto.Department))
                    member.Department = updateDto.Department;
                if (!string.IsNullOrEmpty(updateDto.Title))
                    member.Title = updateDto.Title;
                if (!string.IsNullOrEmpty(updateDto.Phone))
                    member.Phone = updateDto.Phone;
                if (!string.IsNullOrEmpty(updateDto.Position))
                    member.Position = updateDto.Position;
                if (!string.IsNullOrEmpty(updateDto.ProfileImage))
                    member.ProfileImage = updateDto.ProfileImage;

                await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
                return member;
            }
        }
        return null;
    }

    /// <summary>
    /// Davet koduna göre takım getirir
    /// </summary>
    public async Task<Team> GetTeamByInviteCodeAsync(string inviteCode)
    {
        return await _teams.Find(t => t.InviteCode == inviteCode).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Davet linkine göre takım getirir
    /// </summary>
    public async Task<Team> GetByInviteLinkAsync(string inviteLink)
    {
        return await _teams.Find(t => t.InviteLink == inviteLink).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Takım üyesinin rolünü günceller
    /// </summary>
    public async Task<bool> UpdateMemberRoleAsync(string teamId, string memberId, string newRole)
    {
        var team = await GetTeamById(teamId);
        if (team == null)
            return false;

        var member = team.Members.FirstOrDefault(m => m.Id == memberId);
        if (member == null)
            return false;

        member.Role = newRole;
        return await UpdateAsync(teamId, team);
    }

    /// <summary>
    /// Takımın davet linkini temizler
    /// </summary>
    public async Task<bool> ClearInviteLinkAsync(string teamId)
    {
        var update = Builders<Team>.Update
            .Set(t => t.InviteLink, null)
            .Set(t => t.InviteLinkExpiresAt, null);

        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        return result.IsAcknowledged && result.ModifiedCount > 0;
    }

    /// <summary>
    /// Kullanıcının üye olduğu tüm ekipleri getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByUserId(string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentNullException(nameof(userId));

        try
        {
            // Get the user to ensure we're using the correct ID
            var user = await _userService.GetUserById(userId);
            if (user == null)
            {
                Console.WriteLine($"User not found with ID: {userId}");
                return new List<Team>();
            }

            // Using MongoDB filter to find teams where the user is a member
            var filter = Builders<Team>.Filter.ElemMatch(t => t.Members, 
                m => m.Id == user.Id);
            
            var teams = await _teams.Find(filter).ToListAsync();
            
            // Log for debugging purposes if no teams are found
            if (!teams.Any())
            {
                Console.WriteLine($"No teams found for user {user.Id}");
                var allTeams = await _teams.Find(_ => true).ToListAsync();
                Console.WriteLine($"Total teams in database: {allTeams.Count}");
                
                foreach (var team in allTeams)
                {
                    Console.WriteLine($"Team {team.Id} has {team.Members?.Count ?? 0} members");
                    
                    if (team.Members != null && team.Members.Any())
                    {
                        foreach (var member in team.Members)
                        {
                            Console.WriteLine($"Member ID: {member.Id}, Comparing with userId: {user.Id}, Match: {member.Id == user.Id}");
                        }
                    }
                }
            }

            return teams;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTeamsByUserId: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return new List<Team>();
        }
    }

    /// <summary>
    /// Davet linki oluşturur
    /// </summary>
    public async Task<string> GenerateInviteLinkAsync(string teamId)
    {
        var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
        if (team == null) throw new Exception("Takım bulunamadı");
        
        var inviteCode = Guid.NewGuid().ToString("N")[..8].ToUpper();
        team.InviteCode = inviteCode;
        await _teams.ReplaceOneAsync(t => t.Id == teamId, team);
        
        return $"{_settings.Value.BaseUrl}/team-invite?code={inviteCode}"; // Düzeltilmiş BaseUrl kullanımı
    }

    public async Task<bool> IsInviteLinkValid(string teamId)
    {
        var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
        if (team == null || string.IsNullOrEmpty(team.InviteLink) || !team.InviteLinkExpiresAt.HasValue)
            return false;

        return team.InviteLinkExpiresAt.Value > DateTime.UtcNow;
    }

    public async Task<string> GetInviteLinkAsync(string teamId)
    {
        if (string.IsNullOrEmpty(teamId))
            throw new ArgumentNullException(nameof(teamId));

        var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
        if (team == null) throw new Exception("Takım bulunamadı");
        
        // Davet linkinin geçerliliğini kontrol et
        if (!await IsInviteLinkValid(teamId))
        {
            // Geçerli değilse yeni link oluştur
            var inviteCode = Guid.NewGuid().ToString("N")[..8].ToUpper();
            team.InviteCode = inviteCode;
            team.InviteLinkExpiresAt = DateTime.UtcNow.AddHours(24);
            team.InviteLink = $"{_settings.Value.BaseUrl}/team-invite?code={inviteCode}"; // Düzeltilmiş BaseUrl kullanımı
            await _teams.ReplaceOneAsync(t => t.Id == teamId, team);
            return team.InviteLink;
        }
        
        return team.InviteLink;
    }

    public async Task<string> SetInviteLinkAsync(string teamId, string inviteLink)
    {
        var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
        if (team == null) throw new Exception("Takım bulunamadı");
        
        team.InviteLink = inviteLink;
        team.InviteLinkExpiresAt = DateTime.UtcNow.AddHours(24);
        await _teams.ReplaceOneAsync(t => t.Id == teamId, team);
        
        return inviteLink;
    }

    public async Task<bool> JoinTeamWithInviteCode(string inviteCode, string userId)
    {
        try
        {
            var team = await GetTeamByInviteCodeAsync(inviteCode);
            if (team == null)
                return false;

            var user = await _userService.GetUserById(userId);
            if (user == null)
                return false;

            // Assigned Jobs bilgisini Tasks koleksiyonundan al
            var assignedTasks = await _tasks
                .Find(t => t.AssignedUsers.Any(u => u.Id == user.Id))
                .ToListAsync();

            var newMember = new TeamMember
            {
                Id = user.Id, // Users koleksiyonundaki ID kullanılıyor
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Department = user.Department,
                ProfileImage = user.ProfileImage,
                Title = user.Title,
                Position = user.Position,
                Phone = user.Phone,
                Role = "Member",
                AssignedJobs = assignedTasks.Select(t => t.Id).ToList(),
                Status = "available",
                OnlineStatus = "online",
                AvailabilitySchedule = new AvailabilitySchedule
                {
                    WorkingHours = new WorkingHours
                    {
                        Start = "09:00",
                        End = "18:00"
                    },
                    WorkingDays = new List<string> { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" }
                },
                JoinedAt = DateTime.UtcNow,
                PerformanceScore = 0,
                CompletedTasksCount = 0
            };

            team.Members.Add(newMember);
            var result = await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);

            return result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in JoinTeamWithInviteCode: {ex.Message}");
            return false;
        }
    }

    public async Task<(bool success, string message)> DeleteTeamAsync(string teamId, string userId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // İşlemi yapan kullanıcının owner olup olmadığını kontrol et
            var isOwner = team.Members.Any(m => m.Id == userId && m.Role == "Owner");
            if (!isOwner)
            {
                return (false, "Bu işlemi yapmak için takım sahibi olmanız gerekiyor");
            }

            var result = await _teams.DeleteOneAsync(t => t.Id == teamId);
            if (result.DeletedCount > 0)
            {
                return (true, "Takım başarıyla silindi");
            }
            else
            {
                return (false, "Takım silme işlemi başarısız oldu");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Bir hata oluştu: {ex.Message}");
        }
    }

    public async Task<bool> AssignOwnerRoleAsync(string teamId, string currentUserId, string targetUserId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                throw new Exception("Takım bulunamadı.");
            }

            // Mevcut kullanıcının Owner olduğunu kontrol et
            var currentUserIsOwner = team.Members.Any(m => m.Id == currentUserId && m.Role == "Owner");
            if (!currentUserIsOwner)
            {
                throw new Exception("Bu işlem için yetkiniz bulunmamaktadır.");
            }

            // Hedef kullanıcının takımda olduğunu kontrol et
            var targetMember = team.Members.FirstOrDefault(m => m.Id == targetUserId);
            if (targetMember == null)
            {
                throw new Exception("Hedef kullanıcı takımda bulunamadı.");
            }

            // Hedef kullanıcı zaten Owner ise hata döndür
            if (targetMember.Role == "Owner")
            {
                throw new Exception("Bu kullanıcı zaten Owner rolüne sahip.");
            }

            // Owner rolünü ata
            var update = Builders<Team>.Update.Set(
                t => t.Members[-1].Role,
                "Owner"
            );

            var result = await _teams.UpdateOneAsync(
                t => t.Id == teamId && t.Members.Any(m => m.Id == targetUserId),
                update
            );

            return result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            throw new Exception($"Owner rolü atanırken bir hata oluştu: {ex.Message}");
        }
    }

    public async Task<(bool success, string message)> RemoveTeamMemberAsync(string teamId, string memberId, string requestUserId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // İşlemi yapan kullanıcının owner olup olmadığını kontrol et
            var requestingUser = team.Members.FirstOrDefault(m => m.Id == requestUserId);
            if (requestingUser == null || requestingUser.Role != "Owner")
            {
                return (false, "Bu işlemi yapmak için takım sahibi olmanız gerekiyor");
            }

            // Çıkarılacak üyenin owner olup olmadığını kontrol et
            var memberToRemove = team.Members.FirstOrDefault(m => m.Id == memberId);
            if (memberToRemove == null)
            {
                return (false, "Üye bulunamadı");
            }

            if (memberToRemove.Role == "Owner")
            {
                return (false, "Takım sahibi çıkarılamaz");
            }

            var update = Builders<Team>.Update.Pull(t => t.Members, memberToRemove);
            var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);

            if (result.ModifiedCount > 0)
            {
                return (true, "Üye başarıyla çıkarıldı");
            }
            else
            {
                return (false, "Üye çıkarılırken bir hata oluştu");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Bir hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Kullanıcının sahibi olduğu tüm takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByOwnerId(string userId)
    {
        return await _teams.Find(t => t.CreatedById == userId).ToListAsync();
    }

    /// <summary>
    /// Belirli bir takımın üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetTeamMembers(string teamId)
    {
        var team = await GetTeamById(teamId);
        if (team == null)
        {
            return new List<TeamMember>();
        }

        // Takım üyelerini doğrudan döndür
        return team.Members;
    }

    // Yardımcı metodlar
    private string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private async Task UpdateMemberPerformanceScores(TeamMember member)
    {
        if (member == null)
            throw new ArgumentNullException(nameof(member));

        // Performans puanını varsayılan olarak 0 yap
        member.PerformanceScore = 0;
        member.CompletedTasksCount = 0;
    }

    public async Task<Team> AddExpertiesAsync(string memberId, string expertise)
    {
        if (string.IsNullOrEmpty(memberId))
            throw new ArgumentNullException(nameof(memberId));
            
        if (string.IsNullOrEmpty(expertise))
            throw new ArgumentNullException(nameof(expertise));

        try
        {
            // Üyenin bulunduğu takımı bul
            var team = await _teams.Find(t => t.Members.Any(m => m.Id == memberId)).FirstOrDefaultAsync();
            if (team == null)
                throw new Exception("Üye bir takımda bulunamadı");

            // Üyeyi bul
            var member = team.Members.FirstOrDefault(m => m.Id == memberId);
            if (member == null)
                throw new Exception("Üye bulunamadı");

            // Üyenin expertise listesini initialize et eğer null ise
            member.Expertise ??= new List<string>();

            // Yeni uzmanlığı ekle
            if (!member.Expertise.Contains(expertise))
            {
                member.Expertise.Add(expertise);

                // Takımı güncelle
                var updateResult = await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
                if (updateResult.ModifiedCount == 0)
                    throw new Exception("Uzmanlık güncellenirken bir hata oluştu");
            }

            return team;
        }
        catch (Exception ex)
        {
            throw new Exception($"Uzmanlık eklenirken bir hata oluştu: {ex.Message}");
        }
    }

    public async Task<Team> UpdateTeamDepartmentsAsync(string teamId, List<DepartmentStats> departments)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
                throw new Exception("Takım bulunamadı");

            // Departman istatistiklerini güncelle
            team.Departments = departments;

            // Her departman için üye sayısını ve performans verilerini güncelle
            foreach (var dept in team.Departments)
            {
                var membersInDept = team.Members.Where(m => m.Department == dept.Name).ToList();
                dept.MemberCount = membersInDept.Count;
                
                // Tamamlanan görev sayısını hesapla
                dept.CompletedTasks = membersInDept.Sum(m => m.CompletedTasksCount);
                
                // Ortalama performans puanını hesapla
                dept.Performance = membersInDept.Any() 
                    ? membersInDept.Average(m => m.PerformanceScore) 
                    : 0;
            }

            var updateResult = await _teams.ReplaceOneAsync(t => t.Id == teamId, team);
            if (updateResult.ModifiedCount == 0)
                throw new Exception("Departmanlar güncellenirken bir hata oluştu");

            return team;
        }
        catch (Exception ex)
        {
            throw new Exception($"Departmanlar güncellenirken bir hata oluştu: {ex.Message}");
        }
    }
}