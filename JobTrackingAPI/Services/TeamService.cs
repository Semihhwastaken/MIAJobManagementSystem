using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using JobTrackingAPI.Constants;
using CreateTeamRequest = JobTrackingAPI.Models.Requests.CreateTeamRequest;
using MongoDB.Bson;
using Microsoft.Extensions.Logging;

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
    private readonly CacheService _cacheService;
    private readonly ILogger<TeamService> _logger;
    
    // Cache for commonly accessed team members
    private readonly Dictionary<string, List<Team>> _userTeamsCache = new();
    private readonly Dictionary<string, Team> _teamCache = new();
    private DateTime _lastCacheCleanup = DateTime.UtcNow;

    public TeamService(
        IOptions<MongoDbSettings> settings, 
        IUserService userService,
        IMongoDatabase database,
        CacheService cacheService,
        ILogger<TeamService> logger)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _teams = db.GetCollection<Team>(settings.Value.TeamsCollectionName);
        _tasks = db.GetCollection<TaskItem>(settings.Value.TasksCollectionName);
        _performanceScores = db.GetCollection<PerformanceScore>(settings.Value.PerformanceScoresCollectionName);
        _userService = userService;
        _settings = settings;
        _cacheService = cacheService;
        _logger = logger;
        
        // Create indexes for better query performance
        CreateIndexes();
    }
    
    private void CreateIndexes()
    {
        try
        {
            // Check existing indexes first
            var existingIndexes = _teams.Indexes.List().ToList();
            var tasksIndexes = _tasks.Indexes.List().ToList();
            var performanceIndexes = _performanceScores.Indexes.List().ToList();

            // Create indexes only if they don't exist
            if (!existingIndexes.Any(i => i["name"] == "MemberId_Index_1"))
            {
                var memberIdIndex = new CreateIndexModel<Team>(
                    Builders<Team>.IndexKeys.Ascending("Members.Id"),
                    new CreateIndexOptions { Name = "MemberId_Index_1", Background = true }
                );
                _teams.Indexes.CreateOne(memberIdIndex);
            }

            if (!performanceIndexes.Any(i => i["name"] == "UserTeam_Index_1"))
            {
                var performanceIndex = new CreateIndexModel<PerformanceScore>(
                    Builders<PerformanceScore>.IndexKeys
                        .Ascending(p => p.UserId)
                        .Ascending(p => p.TeamId),
                    new CreateIndexOptions { Name = "UserTeam_Index_1", Background = true }
                );
                _performanceScores.Indexes.CreateOne(performanceIndex);
            }

            if (!tasksIndexes.Any(i => i["name"] == "UserTasks_Index_1"))
            {
                var tasksUserIndex = new CreateIndexModel<TaskItem>(
                    Builders<TaskItem>.IndexKeys
                        .Ascending("AssignedUsers.Id")
                        .Ascending("Status"),
                    new CreateIndexOptions { Name = "UserTasks_Index_1", Background = true }
                );
                _tasks.Indexes.CreateOne(tasksUserIndex);
            }

            if (!tasksIndexes.Any(i => i["name"] == "TeamTasks_Index_1"))
            {
                var tasksTeamIndex = new CreateIndexModel<TaskItem>(
                    Builders<TaskItem>.IndexKeys.Ascending("TeamId"),
                    new CreateIndexOptions { Name = "TeamTasks_Index_1", Background = true }
                );
                _tasks.Indexes.CreateOne(tasksTeamIndex);
            }
        }
        catch (Exception ex)
        {
            // Log error but continue - indexes are for performance optimization
            _logger.LogWarning(ex, "Warning: Error managing indexes");
        }
    }
    
    private void CheckCacheExpiry()
    {
        // Clear cache every 5 minutes
        if ((DateTime.UtcNow - _lastCacheCleanup).TotalMinutes > 5)
        {
            _userTeamsCache.Clear();
            _teamCache.Clear();
            _lastCacheCleanup = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// ID'ye göre takım getirir
    /// </summary>
    public async Task<Team> GetTeamById(string id)
    {
        CheckCacheExpiry();
        
        // Check if team exists in cache
        if (_teamCache.TryGetValue(id, out var cachedTeam))
        {
            return cachedTeam;
        }
        
        // Get from database if not in cache
        var team = await _teams.Find(t => t.Id == id).FirstOrDefaultAsync();
        
        // Add to cache if found
        if (team != null)
        {
            _teamCache[id] = team;
        }
        
        return team;
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
                    PerformanceScore = 50,
                    CompletedTasksCount = 0,
                    Status = "available",
                    OnlineStatus = "online",
                    JoinedAt = DateTime.UtcNow
                }
            },
            Departments = new List<DepartmentStats> { new DepartmentStats { Name = request.Department } }
        };
        await _teams.InsertOneAsync(team);
        
        // Kullanıcının ownerTeams listesine takım ID'sini ekle
        var userUpdate = Builders<User>.Update.AddToSet(u => u.OwnerTeams, team.Id);
        await _userService.UpdateUser(userId, userUpdate);
        
        _cacheService.InvalidateTeamCaches(team.Id);
        return team;
    }

    public async Task<IEnumerable<Team>> GetAllTeams()
    {
        return await _teams.Find(_ => true).ToListAsync();
    }

    public async Task<Team> UpdateTeam(string teamId, Team updatedTeam)
    {
        await _teams.ReplaceOneAsync(t => t.Id == teamId, updatedTeam);
        _cacheService.InvalidateTeamCaches(teamId);
        return updatedTeam;
    }

    public async Task DeleteTeam(string teamId)
    {
        await _teams.DeleteOneAsync(t => t.Id == teamId);
        _cacheService.InvalidateTeamCaches(teamId);
    }

    /// <summary>
    /// Takıma yeni üye ekler
    /// </summary>
    public async Task<bool> AddMemberToTeam(string teamId, string userId, string role = "member")
    {
        var team = await GetTeamById(teamId);
        if (team == null)
        {
            return false;
        }

        // Kullanıcı zaten takımda mı kontrol et
        if (team.Members.Any(m => m.Id == userId))
        {
            return true; // Kullanıcı zaten takımda
        }

        // Kullanıcı bilgilerini getir
        var user = await _userService.GetUserById(userId);
        if (user == null)
        {
            return false;
        }
        
        // Takım üyelik sınırlamalarını kontrol et
        if (role.ToLower() == "owner")
        {
            // Kullanıcının sahip olduğu takım sayısını kontrol et (max 5)
            if (user.OwnerTeams != null && user.OwnerTeams.Count >= 5)
            {
                _logger.LogWarning($"Kullanıcı {userId} en fazla 5 takıma sahip olabilir. Şu anda {user.OwnerTeams.Count} takımın sahibi.");
                return false;
            }
        }
        else
        {
            // Kullanıcının üye olduğu takım sayısını kontrol et (max 10)
            if (user.MemberTeams != null && user.MemberTeams.Count >= 10)
            {
                _logger.LogWarning($"Kullanıcı {userId} en fazla 10 takıma üye olabilir. Şu anda {user.MemberTeams.Count} takıma üye.");
                return false;
            }
        }

        // Yeni üye objesi oluştur - sadece gerekli alanları içerecek
        var newMember = new TeamMember
        {
            Id = userId,
            JoinedAt = DateTime.UtcNow,
            Metrics = new MemberMetricsUpdateDto
            {
                TeamId = teamId,
                PerformanceScore = 50,
                CompletedTasks = 0,
                OverdueTasks = 0,
                TotalTasks = 0
            }
        };

        // Üyeyi ekle
        var update = Builders<Team>.Update
            .AddToSet(t => t.Members, newMember)
            .AddToSet(t => t.MemberIds, userId);  // MemberIds alanını da güncelle

        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);

        // Kullanıcının veritabanında takım ilişkisini güncelle
        if (result.ModifiedCount > 0)
        {
            // Rol durumuna göre ownerTeams veya memberTeams listesine ekle
            if (role.ToLower() == "owner" || role.ToLower() == "admin")
            {
                await _userService.AddOwnerTeam(userId, teamId);
            }
            else
            {
                await _userService.AddMemberTeam(userId, teamId);
            }

            // Cache'i temizle
            _cacheService.InvalidateTeamCaches(teamId);
            _cacheService.InvalidateUserCaches(userId);
            
            // TeamCache'i de invalide et
            if (_teamCache.ContainsKey(teamId))
            {
                _teamCache.Remove(teamId);
            }
            
            return true;
        }
        
        return false;
    }

    /// <summary>
    /// Takımdan üye çıkarır
    /// </summary>
    public async Task<bool> RemoveMemberFromTeam(string teamId, string userId)
    {
        var team = await GetTeamById(teamId);
        if (team == null)
        {
            return false;
        }

        // Üyeyi Members ve MemberIds listelerinden çıkar
        var update = Builders<Team>.Update
            .PullFilter(t => t.Members, m => m.Id == userId)
            .Pull(t => t.MemberIds, userId);

        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        
        // Kullanıcının veritabanında takım ilişkisini güncelle
        if (result.ModifiedCount > 0)
        {
            await _userService.RemoveOwnerTeam(userId, teamId);
            await _userService.RemoveMemberTeam(userId, teamId);
            
            // Cache'i temizle
            _cacheService.InvalidateTeamCaches(teamId);
            _cacheService.InvalidateUserCaches(userId);
            
            // TeamCache'i de invalide et
            if (_teamCache.ContainsKey(teamId))
            {
                _teamCache.Remove(teamId);
            }
            
            return true;
        }
        
        return false;
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
            // Get all user tasks in a single query with projection
            var tasksProjection = Builders<TaskItem>.Projection
                .Include(t => t.Id)
                .Include(t => t.TeamId)
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.DueDate)
                .Include(t => t.CreatedAt)
                .Include(t => t.CompletedDate)
                .Include(t => t.Category)
                .Include(t => t.AssignedUsers);
                
            var userTasks = await _tasks
                .Find(t => t.AssignedUsers.Any(u => u.Id == userId))
                .Project<TaskItem>(tasksProjection)
                .ToListAsync();

            // Get user teams
            var userTeams = await GetTeamsByUserId(userId);

            if (!userTeams.Any())
            {
                return;
            }

            // Batch update performance scores
            var bulkOps = new List<WriteModel<PerformanceScore>>();

            foreach (var team in userTeams)
            {
                try
                {
                    // Skip invalid team IDs
                    if (string.IsNullOrEmpty(team.Id) || !MongoDB.Bson.ObjectId.TryParse(team.Id, out _))
                    {
                        continue;
                    }

                    var teamTasks = userTasks.Where(t => t.TeamId == team.Id).ToList();
                    
                    // Get existing performance score
                    var filter = Builders<PerformanceScore>.Filter.And(
                        Builders<PerformanceScore>.Filter.Eq(p => p.UserId, userId),
                        Builders<PerformanceScore>.Filter.Eq(p => p.TeamId, team.Id)
                    );
                    
                    var performanceScore = await _performanceScores.Find(filter).FirstOrDefaultAsync();
                    
                    double oldScore = 100.0; // Default starting score
                    
                    if (performanceScore == null)
                    {
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
                    
                    // Calculate new metrics
                    performanceScore.Metrics = PerformanceCalculator.CalculateDetailedMetrics(teamTasks, team.Id);
                    performanceScore.Score = PerformanceCalculator.CalculateUserPerformance(teamTasks, team.Id);
                    
                    // Update task counts
                    performanceScore.CompletedTasksCount = teamTasks.Count(t => t.Status == "completed");
                    performanceScore.OverdueTasksCount = teamTasks.Count(t => t.Status == "overdue");
                    performanceScore.TotalTasksAssigned = teamTasks.Count;
                    performanceScore.LastUpdated = DateTime.UtcNow;
                    
                    // Add history entry
                    performanceScore.History.Add(new ScoreHistory
                    {
                        Date = DateTime.UtcNow,
                        ScoreChange = performanceScore.Score - oldScore,
                        Reason = "Performance recalculated based on task updates",
                        TeamId = team.Id,
                        ActionType = "recalculation"
                    });
                    
                    // Add update operation to bulk operations list
                    bulkOps.Add(new ReplaceOneModel<PerformanceScore>(filter, performanceScore)
                    {
                        IsUpsert = true
                    });
                    
                    // Update team member metrics
                    await UpdateMemberMetrics(team.Id, userId, new MemberMetricsUpdateDto
                    {
                        PerformanceScore = performanceScore.Score,
                        CompletedTasks = performanceScore.CompletedTasksCount,
                        OverdueTasks = performanceScore.OverdueTasksCount,
                        TotalTasks = performanceScore.TotalTasksAssigned
                    });
                }
                catch (Exception ex)
                {
                    // Log error but continue with other teams
                    _logger.LogWarning(ex, "Error updating performance for team {teamId}", team.Id);
                }
            }
            
            // Execute all performance score updates in a single batch operation
            if (bulkOps.Count > 0)
            {
                await _performanceScores.BulkWriteAsync(bulkOps);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateUserPerformance");
        }
    }

    public async Task<Team> UpdateTeamDepartments(string teamId, UpdateTeamDepartmentsRequest request)
    {
        return await UpdateTeamDepartmentsAsync(teamId, request.Departments);
    }

    public async Task<bool> UpdateMemberMetrics(string teamId, string userId, MemberMetricsUpdateDto metrics)
    {
        var filter = Builders<Team>.Filter.And(
            Builders<Team>.Filter.Eq(t => t.Id, teamId),
            Builders<Team>.Filter.ElemMatch(t => t.Members, m => m.Id == userId));

        var update = Builders<Team>.Update.Combine(
            Builders<Team>.Update.Set("Members.$.Metrics", metrics),
            Builders<Team>.Update.Set("Members.$.PerformanceScore", metrics.PerformanceScore),
            Builders<Team>.Update.Set("Members.$.CompletedTasksCount", metrics.CompletedTasks)
        );

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
            _cacheService.InvalidateTeamCaches(team.Id);
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
        _cacheService.InvalidateTeamCaches(id);
        return result.IsAcknowledged && result.ModifiedCount > 0;
    }

    /// <summary>
    /// Takımı siler
    /// </summary>
    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _teams.DeleteOneAsync(t => t.Id == id);
        _cacheService.InvalidateTeamCaches(id);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    /// <summary>
    /// Tüm takımlardaki üyeleri getirir ve UserService üzerinden detaylarını zenginleştirir
    /// </summary>
    public async Task<List<TeamMember>> GetAllMembersAsync()
    {
        try
        {
            // Tüm takımların sadece Members koleksiyonlarını çekelim
            var projection = Builders<Team>.Projection.Include(t => t.Members).Include(t => t.Id);
            var teams = await _teams.Find(_ => true).Project<Team>(projection).ToListAsync();
            
            // Tüm üye ID'lerini toplayalım
            var memberIds = teams.SelectMany(t => t.Members.Select(m => m.Id)).Distinct().ToList();
            
            // Tüm kullanıcıları ID'lerine göre çekelim
            var users = await _userService.GetUsersByIds(memberIds);
            
            // TeamMember objelerini oluşturalım
            var result = new List<TeamMember>();
            
            foreach (var team in teams)
            {
                foreach (var member in team.Members)
                {
                    // Kullanıcı bilgilerini bul
                    var user = users.FirstOrDefault(u => u.Id == member.Id);
                    if (user != null)
                    {
                        // TeamMember objesini zenginleştir
                        var enrichedMember = EnrichTeamMemberWithUserData(member, user, team.Id);
                        result.Add(enrichedMember);
                    }
                }
            }
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetAllMembersAsync sırasında hata oluştu");
            return new List<TeamMember>();
        }
    }
    
    /// <summary>
    /// Belirli bir departmandaki tüm takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetMembersByDepartmentAsync(string department)
    {
        try
        {
            // Tüm takımları çek
            var projection = Builders<Team>.Projection.Include(t => t.Members).Include(t => t.Id);
            var teams = await _teams.Find(_ => true).Project<Team>(projection).ToListAsync();
            
            // Tüm üye ID'lerini toplayalım
            var memberIds = teams.SelectMany(t => t.Members.Select(m => m.Id)).Distinct().ToList();
            
            // Tüm kullanıcıları ID'lerine göre çekelim
            var users = await _userService.GetUsersByIds(memberIds);
            
            // İlgili departmandaki kullanıcıları filtrele
            var usersInDepartment = users.Where(u => u.Department == department).ToList();
            var userIdsInDepartment = usersInDepartment.Select(u => u.Id).ToList();
            
            // TeamMember objelerini oluşturalım
            var result = new List<TeamMember>();
            
            foreach (var team in teams)
            {
                foreach (var member in team.Members)
                {
                    // Kullanıcı bu departmanda mı?
                    if (userIdsInDepartment.Contains(member.Id))
                    {
                        var user = usersInDepartment.FirstOrDefault(u => u.Id == member.Id);
                        if (user != null)
                        {
                            // TeamMember objesini zenginleştir
                            var enrichedMember = EnrichTeamMemberWithUserData(member, user, team.Id);
                            result.Add(enrichedMember);
                        }
                    }
                }
            }
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetMembersByDepartmentAsync sırasında hata oluştu");
            return new List<TeamMember>();
        }
    }
    
    /// <summary>
    /// Belirli bir takımın üyelerini getirir, isteğe bağlı olarak zenginleştirir
    /// </summary>
    /// <param name="teamId">Takım kimliği</param>
    /// <param name="enrich">Üye verilerini zenginleştirme seçeneği. Varsayılan olarak true.</param>
    public async Task<List<TeamMember>> GetTeamMembers(string teamId, bool enrich = true)
    {
        try
        {
            // Basit istek ise ve zenginleştirme gerekli değilse
            if (!enrich)
            {
                var team = await GetTeamById(teamId);
                if (team == null)
                {
                    return new List<TeamMember>();
                }
                // Takım üyelerini doğrudan döndür
                return team.Members;
            }

            // Cache'ten veriyi almayı deneyelim
            var cacheKey = $"team_members_{teamId}";
            var cachedMembers = _cacheService.GetOrCreate<List<TeamMember>>(cacheKey, null);
            if (cachedMembers != null)
            {
                return cachedMembers;
            }

            // Cache'te yoksa, normal işlemleri gerçekleştirelim
            var teamData = await GetTeamById(teamId);
            if (teamData == null)
            {
                return new List<TeamMember>();
            }
            
            // Üye ID'lerini toplayalım
            var memberIds = teamData.Members.Select(m => m.Id).ToList();
            
            // Kullanıcı bilgilerini çekelim
            var users = await _userService.GetUsersByIds(memberIds);
            
            // TeamMember objelerini zenginleştirelim
            var result = new List<TeamMember>();
            
            foreach (var member in teamData.Members)
            {
                var user = users.FirstOrDefault(u => u.Id == member.Id);
                if (user != null)
                {
                    // TeamMember objesini zenginleştir
                    var enrichedMember = EnrichTeamMemberWithUserData(member, user, teamData.Id);
                    result.Add(enrichedMember);
                }
            }

            // Sonucu cache'e ekleyelim
            _cacheService.GetOrCreate(cacheKey, () => result, TimeSpan.FromMinutes(5));
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTeamMembers sırasında hata oluştu");
            return new List<TeamMember>();
        }
    }
    
    /// <summary>
    /// TeamMember objesini User verileriyle zenginleştirir
    /// </summary>
    private TeamMember EnrichTeamMemberWithUserData(TeamMember member, User user, string teamId)
    {
        // Rol bilgisi için üye takım ilişkisini kontrol et
        string role = "Member";
        if (user.OwnerTeams != null && user.OwnerTeams.Contains(teamId))
        {
            role = "Owner";
        }
        
        // Zenginleştirilmiş TeamMember objesi oluştur
        var enrichedMember = new TeamMember
        {
            Id = member.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Department = user.Department,
            Title = user.Title,
            Position = user.Position,
            ProfileImage = user.ProfileImage,
            Phone = user.Phone,
            Role = role,
            JoinedAt = member.JoinedAt,
            Metrics = member.Metrics ?? user.Metrics ?? new MemberMetricsUpdateDto(),
            Status = user.UserStatus,
            OnlineStatus = user.OnlineStatus,
            PerformanceScore = user.PerformanceScore,
            CompletedTasksCount = user.CompletedTasksCount,
            AvailabilitySchedule = user.AvailabilitySchedule,
            Expertise = user.Expertise
        };
        
        return enrichedMember;
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
    /// Kullanıcının sahibi olduğu tüm takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByOwnerId(string userId)
    {
        return await _teams.Find(t => t.CreatedById == userId).ToListAsync();
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

        // Performans puanını varsayılan olarak 50 yap (0 yerine)
        member.PerformanceScore = 50;
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

    public async Task UpdateMemberStatusesAsync(MemberMetricsUpdateDto updateData)
    {
        if (string.IsNullOrEmpty(updateData.TeamId))
        {
            throw new ArgumentException("TeamId is required");
        }

        var team = await GetTeamById(updateData.TeamId);
        if (team == null)
        {
            throw new KeyNotFoundException("Team not found");
        }

        // Update metrics for all members in the team
        var update = Builders<Team>.Update.Combine(
            Builders<Team>.Update.Set("Members.$[].Metrics.PerformanceScore", updateData.PerformanceScore),
            Builders<Team>.Update.Set("Members.$[].Metrics.CompletedTasks", updateData.CompletedTasks),
            Builders<Team>.Update.Set("Members.$[].Metrics.OverdueTasks", updateData.OverdueTasks),
            Builders<Team>.Update.Set("Members.$[].Metrics.TotalTasks", updateData.TotalTasks),
            Builders<Team>.Update.Set("Members.$[].PerformanceScore", updateData.PerformanceScore),
            Builders<Team>.Update.Set("Members.$[].CompletedTasksCount", updateData.CompletedTasks)
        );

        var result = await _teams.UpdateOneAsync(
            Builders<Team>.Filter.Eq(t => t.Id, updateData.TeamId),
            update
        );

        if (result.ModifiedCount == 0)
        {
            throw new Exception("Failed to update member statuses");
        }
    }

    public async Task<List<Team>> GetTeamsByUserId(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetTeamsByUserId çağrıldı ancak userId boş.");
                return new List<Team>();
            }

            var filter = Builders<Team>.Filter.ElemMatch(t => t.Members, m => m.Id == userId);
            var teams = await _teams.Find(filter).ToListAsync();
            return teams;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTeamsByUserId metodu sırasında hata oluştu");
            return new List<Team>();
        }
    }

    public async Task<bool> AssignOwnerRoleAsync(string teamId, string currentUserId, string targetUserId)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId) || string.IsNullOrEmpty(currentUserId) || string.IsNullOrEmpty(targetUserId))
            {
                _logger.LogWarning("AssignOwnerRoleAsync çağrıldı ancak bir veya daha fazla parametre boş.");
                return false;
            }

            var team = await GetTeamById(teamId);
            if (team == null)
            {
                return false;
            }

            // Yalnızca mevcut sahibin rolleri değiştirmesine izin ver
            var currentMember = team.Members.FirstOrDefault(m => m.Id == currentUserId);
            if (currentMember == null || currentMember.Role != "owner")
            {
                return false;
            }

            // Hedef kullanıcı ekip üyesi olmalı
            var targetMember = team.Members.FirstOrDefault(m => m.Id == targetUserId);
            if (targetMember == null)
            {
                return false;
            }

            // Hedef kullanıcının rolünü "owner" olarak ayarla
            var updateDefinition = Builders<Team>.Update.Set(
                t => t.Members[-1].Role,
                "owner"
            );

            var arrayFilters = new List<ArrayFilterDefinition> {
                new BsonDocumentArrayFilterDefinition<BsonDocument>(
                    new BsonDocument("elem.Id", targetUserId)
                )
            };

            var updateOptions = new UpdateOptions { ArrayFilters = arrayFilters };
            var result = await _teams.UpdateOneAsync(
                t => t.Id == teamId,
                updateDefinition,
                updateOptions
            );

            // Eski sahibin rolünü "admin" olarak ayarla
            if (result.ModifiedCount > 0 && currentUserId != targetUserId)
            {
                updateDefinition = Builders<Team>.Update.Set(
                    t => t.Members[-1].Role,
                    "admin"
                );

                arrayFilters = new List<ArrayFilterDefinition> {
                    new BsonDocumentArrayFilterDefinition<BsonDocument>(
                        new BsonDocument("elem.Id", currentUserId)
                    )
                };

                updateOptions = new UpdateOptions { ArrayFilters = arrayFilters };
                await _teams.UpdateOneAsync(
                    t => t.Id == teamId,
                    updateDefinition,
                    updateOptions
                );
            }

            return result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AssignOwnerRoleAsync metodu sırasında hata oluştu");
            return false;
        }
    }

    public async Task<(bool success, string message)> RemoveTeamMemberAsync(string teamId, string memberId, string requestUserId)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId) || string.IsNullOrEmpty(memberId) || string.IsNullOrEmpty(requestUserId))
            {
                return (false, "Gerekli parametreler eksik");
            }

            var team = await GetTeamById(teamId);
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // İsteği yapan kullanıcı admin veya owner olmalı veya kendi kendini çıkarıyor olmalı
            var requestingMember = team.Members.FirstOrDefault(m => m.Id == requestUserId);
            if (requestingMember == null)
            {
                return (false, "İsteği yapan kullanıcı takımın bir üyesi değil");
            }

            if (requestUserId != memberId && requestingMember.Role != "admin" && requestingMember.Role != "owner")
            {
                return (false, "Bu işlem için gerekli izinlere sahip değilsiniz");
            }

            // Takım sahibi çıkarılamaz
            var targetMember = team.Members.FirstOrDefault(m => m.Id == memberId);
            if (targetMember == null)
            {
                return (false, "Üye takımda bulunamadı");
            }

            if (targetMember.Role == "owner" && requestUserId != memberId)
            {
                return (false, "Takım sahibi başkası tarafından takımdan çıkarılamaz");
            }

            var result = await RemoveMemberFromTeam(teamId, memberId);
            return result 
                ? (true, "Üye başarıyla takımdan çıkarıldı") 
                : (false, "Üye takımdan çıkarılırken bir hata oluştu");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RemoveTeamMemberAsync metodu sırasında hata oluştu");
            return (false, "Bir hata oluştu: " + ex.Message);
        }
    }

    public async Task<string> GetInviteLinkAsync(string teamId)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId))
            {
                _logger.LogWarning("GetInviteLinkAsync çağrıldı ancak teamId boş.");
                return string.Empty;
            }

            var team = await GetTeamById(teamId);
            if (team == null)
            {
                return string.Empty;
            }

            return team.InviteLink ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetInviteLinkAsync metodu sırasında hata oluştu");
            return string.Empty;
        }
    }

    public async Task<string> SetInviteLinkAsync(string teamId, string inviteLink)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId))
            {
                _logger.LogWarning("SetInviteLinkAsync çağrıldı ancak teamId boş.");
                return string.Empty;
            }

            var filter = Builders<Team>.Filter.Eq(t => t.Id, teamId);
            var update = Builders<Team>.Update.Set(t => t.InviteLink, inviteLink);
            await _teams.UpdateOneAsync(filter, update);
            return inviteLink;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SetInviteLinkAsync metodu sırasında hata oluştu");
            return string.Empty;
        }
    }

    public async Task<Team> GetTeamByInviteCodeAsync(string inviteCode)
    {
        try
        {
            if (string.IsNullOrEmpty(inviteCode))
            {
                _logger.LogWarning("GetTeamByInviteCodeAsync çağrıldı ancak inviteCode boş.");
                return null;
            }

            var filter = Builders<Team>.Filter.Eq(t => t.InviteCode, inviteCode);
            var team = await _teams.Find(filter).FirstOrDefaultAsync();
            return team;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTeamByInviteCodeAsync metodu sırasında hata oluştu");
            return null;
        }
    }

    public async Task<bool> JoinTeamWithInviteCode(string inviteCode, string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(inviteCode) || string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("JoinTeamWithInviteCode çağrıldı ancak inviteCode veya userId boş.");
                return false;
            }

            var team = await GetTeamByInviteCodeAsync(inviteCode);
            if (team == null)
            {
                return false;
            }

            // Kullanıcı zaten takımda mı kontrol et
            if (team.Members.Any(m => m.Id == userId))
            {
                return true; // Kullanıcı zaten takımda
            }

            return await AddMemberToTeam(team.Id, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "JoinTeamWithInviteCode metodu sırasında hata oluştu");
            return false;
        }
    }

    public async Task<TeamMember> UpdateMemberStatusAsync(string id, string status)
    {
        try
        {
            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(status))
            {
                _logger.LogWarning("UpdateMemberStatusAsync çağrıldı ancak id veya status boş.");
                return null;
            }

            // Üye hangi takımda olduğunu bul
            var team = await GetTeamByMemberId(id);
            if (team == null)
            {
                return null;
            }

            // Üyeyi güncelle
            var member = team.Members.FirstOrDefault(m => m.Id == id);
            if (member == null)
            {
                return null;
            }

            member.Status = status;

            var filter = Builders<Team>.Filter.Eq(t => t.Id, team.Id);
            var update = Builders<Team>.Update.Set(t => t.Members, team.Members);
            await _teams.UpdateOneAsync(filter, update);

            return member;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateMemberStatusAsync metodu sırasında hata oluştu");
            return null;
        }
    }

    public async Task<TeamMember> UpdateMemberAsync(string id, TeamMemberUpdateDto updateDto)
    {
        try
        {
            if (string.IsNullOrEmpty(id) || updateDto == null)
            {
                _logger.LogWarning("UpdateMemberAsync çağrıldı ancak id boş veya updateDto null.");
                return null;
            }

            // Üye hangi takımda olduğunu bul
            var team = await GetTeamByMemberId(id);
            if (team == null)
            {
                return null;
            }

            // Üyeyi güncelle
            var memberIndex = team.Members.FindIndex(m => m.Id == id);
            if (memberIndex == -1)
            {
                return null;
            }

            var member = team.Members[memberIndex];

            // Güncelleme işlemi
            if (!string.IsNullOrEmpty(updateDto.Email))
                member.Email = updateDto.Email;
            if (!string.IsNullOrEmpty(updateDto.FullName))
                member.FullName = updateDto.FullName;
            if (!string.IsNullOrEmpty(updateDto.Department))
                member.Department = updateDto.Department;
            if (!string.IsNullOrEmpty(updateDto.Title))
                member.Title = updateDto.Title;
            if (!string.IsNullOrEmpty(updateDto.Position))
                member.Position = updateDto.Position;
            if (!string.IsNullOrEmpty(updateDto.Phone))
                member.Phone = updateDto.Phone;
            if (!string.IsNullOrEmpty(updateDto.ProfileImage))
                member.ProfileImage = updateDto.ProfileImage;
            if (!string.IsNullOrEmpty(updateDto.Status))
                member.Status = updateDto.Status;
            if (!string.IsNullOrEmpty(updateDto.OnlineStatus))
                member.OnlineStatus = updateDto.OnlineStatus;
            if (updateDto.Expertise != null && updateDto.Expertise.Count > 0)
            {
                member.Expertise ??= new List<string>();
                // Expertise listesindeki tüm uzmnalıkları ekle
                foreach(var expertise in updateDto.Expertise)
                {
                    if (!string.IsNullOrEmpty(expertise) && !member.Expertise.Contains(expertise))
                        member.Expertise.Add(expertise);
                }
            }

            team.Members[memberIndex] = member;

            // Güncellemeyi kaydet
            var filter = Builders<Team>.Filter.Eq(t => t.Id, team.Id);
            var update = Builders<Team>.Update.Set(t => t.Members, team.Members);
            await _teams.UpdateOneAsync(filter, update);

            return member;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateMemberAsync metodu sırasında hata oluştu");
            return null;
        }
    }

    public async Task<string> GenerateInviteLinkAsync(string teamId)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId))
            {
                _logger.LogWarning("GenerateInviteLinkAsync çağrıldı ancak teamId boş.");
                return string.Empty;
            }

            var team = await GetTeamById(teamId);
            if (team == null)
            {
                return string.Empty;
            }

            // Mevcut davet bağlantısını kontrol et
            if (!string.IsNullOrEmpty(team.InviteCode) && 
                team.InviteLinkExpiresAt.HasValue && 
                team.InviteLinkExpiresAt.Value > DateTime.UtcNow)
            {
                // Geçerli bir davet bağlantısı zaten var, onu döndür
                return $"/team-invite?code={team.InviteCode}";
            }

            // Davet kodu oluştur
            var inviteCode = GenerateInviteCode();
            
            // Sona erme tarihi oluştur (1 gün)
            var expiresAt = DateTime.UtcNow.AddDays(1);
            
            // Takımı güncelle
            var filter = Builders<Team>.Filter.Eq(t => t.Id, teamId);
            var update = Builders<Team>.Update
                .Set(t => t.InviteCode, inviteCode)
                .Set(t => t.InviteLink, $"/team-invite?code={inviteCode}")
                .Set(t => t.InviteLinkExpiresAt, expiresAt);
            
            await _teams.UpdateOneAsync(filter, update);
            
            return $"/team-invite?code={inviteCode}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GenerateInviteLinkAsync metodu sırasında hata oluştu");
            return string.Empty;
        }
    }

    public async Task<(bool success, string message)> DeleteTeamAsync(string teamId, string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(teamId) || string.IsNullOrEmpty(userId))
            {
                return (false, "Gerekli parametreler eksik");
            }

            var team = await GetTeamById(teamId);
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // Yalnızca sahibin takımı silmesine izin ver
            var member = team.Members.FirstOrDefault(m => m.Id == userId);
            if (member == null || member.Role != "owner")
            {
                return (false, "Takımı silmek için sahip rolüne sahip olmalısınız");
            }

            await DeleteTeam(teamId);
            return (true, "Takım başarıyla silindi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteTeamAsync metodu sırasında hata oluştu");
            return (false, "Bir hata oluştu: " + ex.Message);
        }
    }

    public async Task<Team> GetByInviteLinkAsync(string inviteLink)
    {
        try
        {
            if (string.IsNullOrEmpty(inviteLink))
            {
                _logger.LogWarning("GetByInviteLinkAsync çağrıldı ancak inviteLink boş.");
                return null;
            }

            // Davet bağlantısından kodu çıkar
            var inviteCode = inviteLink.Split('/').Last();
            return await GetTeamByInviteCodeAsync(inviteCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetByInviteLinkAsync metodu sırasında hata oluştu");
            return null;
        }
    }
}