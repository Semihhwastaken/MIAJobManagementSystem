using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;
using JobTrackingAPI.Services;
using MongoDB.Driver;
using JobTrackingAPI.Enums;
using System.Security.Claims;
using System.Linq;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TeamController : ControllerBase
    {
        private readonly ITeamService _teamService;
        private readonly IUserService _userService;
        private readonly ITasksService _tasksService;
        private readonly IMongoDatabase _database;
        private readonly IMemoryCache _cache;
        private readonly ILogger<TeamController> _logger;
        private readonly NotificationService _notificationService;
        private readonly IMongoCollection<User> _usersCollection;

        public TeamController(
            ITeamService teamService,
            IUserService userService,
            ITasksService tasksService,
            IMongoDatabase database,
            IMemoryCache memoryCache,
            ILogger<TeamController> logger,
            NotificationService notificationService)
        {
            _teamService = teamService;
            _userService = userService;
            _tasksService = tasksService;
            _database = database;
            _cache = memoryCache;
            _logger = logger;
            _notificationService = notificationService;
            _usersCollection = database.GetCollection<User>("Users");
        }

        [HttpGet("members/{userId}/performance")]
        public async Task<IActionResult> GetMemberPerformance(string userId)
        {
            try
            {
                var cacheKey = $"performance_{userId}";

                // Try to get performance from cache
                if (_cache.TryGetValue(cacheKey, out PerformanceScore? cachedPerformance))
                {
                    return Ok(cachedPerformance);
                }

                var performanceScore = await _teamService.GetUserPerformance(userId);

                // Cache performance data for 5 minutes
                _cache.Set(cacheKey, performanceScore, TimeSpan.FromMinutes(5));

                return Ok(performanceScore);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("members/{userId}/update-performance")]
        public async Task<IActionResult> UpdateMemberPerformance(string userId)
        {
            try
            {
                // First check if user exists
                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Then check team membership
                var teams = await _teamService.GetTeamsByUserId(userId);
                if (!teams.Any())
                {
                    return BadRequest(new { message = "User does not belong to any teams" });
                }

                await _teamService.UpdateUserPerformance(userId);

                // Clear the cache
                _cache.Remove($"performance_{userId}");

                return Ok(new { message = "Performance updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Kullanıcının üye olduğu tüm ekipleri getirir
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTeams()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var cacheKey = $"teams_{userId}";

                // Check if teams are cached
                if (_cache.TryGetValue(cacheKey, out List<Team>? cachedTeams))
                {
                    return Ok(cachedTeams);
                }

                var teams = await _teamService.GetTeamsByUserId(userId);

                // Cache teams for 2 minutes
                _cache.Set(cacheKey, teams, TimeSpan.FromMinutes(2));

                return Ok(teams);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Kullanıcının sahibi olduğu tüm ekipleri getirir
        /// </summary>
        [HttpGet("my-teams")]
        public async Task<IActionResult> GetMyTeams()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var cacheKey = $"myTeams_{userId}";

                // Check if teams are cached
                if (_cache.TryGetValue(cacheKey, out List<Team>? cachedTeams))
                {
                    return Ok(cachedTeams);
                }

                var teams = await _teamService.GetTeamsByOwnerId(userId);

                // Cache teams for 2 minutes
                _cache.Set(cacheKey, teams, TimeSpan.FromMinutes(2));

                return Ok(teams);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("members")]
        public async Task<ActionResult<List<TeamMember>>> GetMembers()
        {
            try
            {
                var cacheKey = "all_members";

                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out List<TeamMember>? cachedMembers))
                {
                    return Ok(cachedMembers);
                }

                var members = await _teamService.GetAllMembersAsync();

                // Cache for 2 minutes
                _cache.Set(cacheKey, members, TimeSpan.FromMinutes(2));

                return Ok(members);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("departments")]
        public async Task<ActionResult<List<string>>> GetDepartments()
        {
            try
            {
                var cacheKey = "departments";

                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out List<string>? cachedDepartments))
                {
                    return Ok(cachedDepartments);
                }

                var departments = await _teamService.GetDepartmentsAsync();

                // Cache for 30 minutes (departments change rarely)
                _cache.Set(cacheKey, departments, TimeSpan.FromMinutes(30));

                return Ok(departments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("members/department/{department}")]
        public async Task<ActionResult<List<TeamMember>>> GetMembersByDepartment(string department)
        {
            try
            {
                var cacheKey = $"members_dept_{department}";

                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out List<TeamMember>? cachedMembers))
                {
                    return Ok(cachedMembers);
                }

                var members = await _teamService.GetMembersByDepartmentAsync(department);

                // Cache for 2 minutes
                _cache.Set(cacheKey, members, TimeSpan.FromMinutes(2));

                return Ok(members);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{teamId}/members")]
        public async Task<IActionResult> GetTeamMembers(string teamId)
        {
            try
            {
                // Kullanıcı kimliğini doğrula
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Yetkisiz takım üyeleri erişim denemesi: Kimlik doğrulanamadı");
                    return Unauthorized(new { message = "Kullanıcı kimliği doğrulanamadı" });
                }

                _logger.LogInformation("Takım üyeleri alınıyor: TeamId={TeamId}, UserId={UserId}", teamId, userId);

                // Takımı kontrol et
                var team = await _teamService.GetTeamById(teamId);
                if (team == null)
                {
                    _logger.LogWarning("Takım bulunamadı: {TeamId}", teamId);
                    return NotFound(new { message = $"ID'si {teamId} olan takım bulunamadı" });
                }

                // Kullanıcının yetkisini kontrol et (takım kurucusu veya üyesi olmalı)
                bool isCreator = team.CreatedById == userId;
                bool isMember = team.Members != null && team.Members.Any(m => m.Id == userId);

                _logger.LogInformation("Yetki kontrolü: UserId={UserId}, TeamId={TeamId}, IsCreator={IsCreator}, IsMember={IsMember}",
                    userId, teamId, isCreator, isMember);

                if (!isCreator && !isMember)
                {
                    _logger.LogWarning("Takım üyelerine erişim reddedildi: UserId={UserId}, TeamId={TeamId}", userId, teamId);
                    return StatusCode(403, new { message = "Bu takımın üyelerini görüntüleme yetkiniz yok" });
                }

                // Önbellekte var mı kontrol et
                var cacheKey = $"team_members_{teamId}";
                if (_cache.TryGetValue(cacheKey, out List<TeamMember>? cachedMembers))
                {
                    _logger.LogInformation("Takım üyeleri önbellekten alındı: {TeamId}", teamId);
                    return Ok(cachedMembers);
                }

                // Takım üyelerini getir
                var members = await _teamService.GetTeamMembers(teamId);

                // Önbelleğe al
                _cache.Set(cacheKey, members, TimeSpan.FromMinutes(2));

                _logger.LogInformation("Takım üyeleri başarıyla alındı: {TeamId}, {MemberCount} üye", teamId, members.Count);
                return Ok(members);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Takım üyeleri alınırken hata: {TeamId}", teamId);
                return StatusCode(500, new { message = $"Takım üyeleri alınırken bir hata oluştu: {ex.Message}" });
            }
        }

        [HttpPatch("members/{id}/status")]
        public async Task<ActionResult<TeamMember>> UpdateMemberStatus(string id, [FromBody] Models.StatusUpdateDto status)
        {
            try
            {
                var updatedMember = await _teamService.UpdateMemberStatusAsync(id, status.Status);

                if (updatedMember == null)
                    return NotFound($"Member with ID {id} not found");

                // Clear caches related to this member
                ClearMemberRelatedCaches(id);

                return Ok(updatedMember);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("members/{id}")]
        public async Task<ActionResult<TeamMember>> UpdateMember(string id, [FromBody] Models.TeamMemberUpdateDto updateDto)
        {
            try
            {
                var updatedMember = await _teamService.UpdateMemberAsync(id, updateDto);
                if (updatedMember == null)
                    return NotFound($"Member with ID {id} not found");

                // Clear caches related to this member
                ClearMemberRelatedCaches(id);

                return Ok(updatedMember);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateTeam([FromBody] JobTrackingAPI.Models.Requests.CreateTeamRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği doğrulanamadı.");
                }

                // Kullanıcı bilgilerini al
                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı.");
                }

                // Kullanıcının sahip olduğu takım sayısını kontrol et (max 5)
                if (user.OwnerTeams != null && user.OwnerTeams.Count >= 5)
                {
                    return BadRequest("En fazla 5 takıma sahip olabilirsiniz. Yeni bir takım oluşturmak için önce mevcut takımlarınızdan birini silmelisiniz.");
                }

                var team = new Team
                {
                    Name = request.Name,
                    Description = request.Description,
                    CreatedById = userId,
                    Departments = new List<DepartmentStats>
                    {
                        new DepartmentStats
                        {
                            Name = request.Department,
                            MemberCount = 1,
                            CompletedTasks = 0,
                            OngoingTasks = 0,
                            Performance = 0
                        }
                    },
                    Members = new List<TeamMember>
                    {
                        new TeamMember
                        {
                            Id = userId,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName ?? string.Empty,
                            Department = request.Department,
                            ProfileImage = user.ProfileImage,
                            Title = user.Title,
                            Position = user.Position,
                            Role = "Owner",
                            AssignedJobs = new List<string>(),
                            Status = "available",
                            OnlineStatus = "online"
                        }
                    }
                };

                var createdTeam = await _teamService.CreateAsync(team);
                foreach (var item in createdTeam.Members)
                {
                    await _notificationService.SendNotificationAsync(
                        userId: item.Id,
                        title: "Yeni Takım",
                        message: $"{user.FullName} adlı kullanıcı tarafından {createdTeam.Name} adlı takıma eklendiniz",
                        notificationType: NotificationType.TeamStatusCreated,
                        relatedJobId: createdTeam.Id
                    );
                }

                // Clear user's teams cache
                _cache.Remove($"teams_{userId}");
                _cache.Remove($"myTeams_{userId}");
                _cache.Remove("all_members");

                return Ok(createdTeam);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{teamId}")]
        [Authorize]
        public async Task<IActionResult> UpdateTeam(string teamId, [FromBody] Team team)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği doğrulanamadı.");
                }

                var existingTeam = await _teamService.GetTeamById(teamId);
                if (existingTeam == null)
                {
                    return NotFound("Takım bulunamadı.");
                }

                // Kullanıcının Owner olup olmadığını kontrol et
                var isOwner = existingTeam.Members.Any(m => m.Id == userId && m.Role == "Owner");
                if (!isOwner)
                {
                    return Forbid("Bu işlemi sadece takım sahibi yapabilir");
                }

                await _teamService.UpdateAsync(teamId, existingTeam);

                // Clear team related caches
                ClearTeamRelatedCaches(teamId);

                return Ok("Takım başarıyla güncellendi");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{teamId}")]
        [Authorize]
        public async Task<IActionResult> DeleteTeam(string teamId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                var team = await _teamService.GetTeamById(teamId);
                if (team == null)
                {
                    return NotFound(new { message = "Takım bulunamadı" });
                }

                var result = await _teamService.DeleteTeamAsync(teamId, userId);
                if (!result.success)
                {
                    return BadRequest(new { message = result.message });
                }

                // Send notifications to all team members
                foreach (var member in team.Members)
                {
                    await _notificationService.SendNotificationAsync(
                        userId: member.Id,
                        title: "Takım Silindi",
                        message: $"{team.Name} adlı takım silindi",
                        notificationType: NotificationType.TeamStatusDeleted,
                        relatedJobId: team.Id
                    );
                }

                // Clear all relevant caches
                ClearTeamRelatedCaches(teamId);
                _cache.Remove($"teams_{userId}");
                _cache.Remove($"myTeams_{userId}");
                _cache.Remove("all_members");

                return Ok(new { message = result.message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("invite-link/{teamId}")]
        public async Task<ActionResult<object>> GenerateInviteLink(string teamId)
        {
            try
            {
                var inviteLink = await _teamService.GenerateInviteLinkAsync(teamId);
                return Ok(new { inviteLink = inviteLink });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("join-with-code/{inviteCode}")]
        public async Task<IActionResult> JoinTeamWithInviteCode(string inviteCode)
        {
            try
            {
                var userId = HttpContext.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized("Kullanıcı girişi yapılmamış");

                var team = await _teamService.GetTeamByInviteCodeAsync(inviteCode);
                if (team == null)
                    return BadRequest("Geçersiz davet kodu");

                if (team.Members.Any(m => m.Id == userId))
                    return BadRequest("Zaten bu takımın üyesisiniz");

                // Kullanıcı bilgilerini getir
                var user = await _userService.GetUserById(userId);
                if (user == null)
                    return NotFound("Kullanıcı bulunamadı");

                // Takım üyelik sınırını kontrol et
                if (user.MemberTeams != null && user.MemberTeams.Count >= 10)
                    return BadRequest("En fazla 10 takıma üye olabilirsiniz");

                var result = await _teamService.JoinTeamWithInviteCode(inviteCode, userId);
                if (!result)
                    return BadRequest("Ekibe katılırken bir hata oluştu");

                // Clear caches
                _cache.Remove($"teams_{userId}");
                ClearTeamRelatedCaches(team.Id);
                _cache.Remove("all_members");

                return Ok(new { message = "Ekibe başarıyla katıldınız", teamName = team.Name });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{teamId}/assign-owner/{targetUserId}")]
        [Authorize]
        public async Task<IActionResult> AssignOwnerRole(string teamId, string targetUserId)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized("Kullanıcı kimliği doğrulanamadı.");
                }

                var result = await _teamService.AssignOwnerRoleAsync(teamId, currentUserId, targetUserId);
                if (result)
                {
                    // Clear caches
                    ClearTeamRelatedCaches(teamId);
                    ClearMemberRelatedCaches(targetUserId);
                    return Ok(new { message = "Owner rolü başarıyla atandı." });
                }
                return BadRequest("Owner rolü atanamadı.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{teamId}/members/{memberId}")]
        public async Task<IActionResult> RemoveTeamMember(string teamId, string memberId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                var result = await _teamService.RemoveTeamMemberAsync(teamId, memberId, userId);
                if (!result.success)
                {
                    return BadRequest(new { message = result.message });
                }
                var t = await _teamService.GetTeamById(teamId);
                foreach (var item in t.Members)
                {
                    await _notificationService.SendNotificationAsync(
                    userId: memberId,
                    title: "Takımdan Çıkarılma",
                    message: $"{t.Name} adlı takımdan {item.FullName} kişisi çıkarıldı",
                    notificationType: NotificationType.TeamStatusDeleted,
                    relatedJobId: t.Id
                );
                }

                // Clear caches
                ClearTeamRelatedCaches(teamId);
                ClearMemberRelatedCaches(memberId);

                return Ok(new { message = result.message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("invite-link/{teamId}/get")]
        public async Task<IActionResult> GetInviteLink(string teamId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                var inviteLink = await _teamService.GetInviteLinkAsync(teamId);
                return Ok(new { inviteLink = inviteLink });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("invite-link/{teamId}/set")]
        [Authorize]
        public async Task<IActionResult> SetInviteLink(string teamId, [FromBody] SetInviteLinkRequest request)
        {
            try
            {
                if (teamId != request.teamId)
                {
                    return BadRequest(new { message = "URL'deki takım ID'si ile request body'deki takım ID'si eşleşmiyor" });
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                // Takımın var olduğunu kontrol et
                var team = await _teamService.GetTeamById(teamId);
                if (team == null)
                {
                    return NotFound(new { message = "Takım bulunamadı" });
                }

                // Kullanıcının yetkisini kontrol et
                var member = team.Members.FirstOrDefault(m => m.Id == userId);
                if (member == null || member.Role != "Owner")
                {
                    return Forbid("Bu işlemi sadece takım sahibi yapabilir");
                }

                // Davet linkini güncelle
                var result = await _teamService.SetInviteLinkAsync(teamId, request.InviteLink);

                if (result != null)
                {
                    return Ok(new { message = "Davet linki başarıyla güncellendi", inviteLink = result });
                }

                return BadRequest(new { message = "Davet linki güncellenirken bir hata oluştu" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("members/{memberId}/experties")]
        public async Task<IActionResult> AddExperties(string memberId, [FromBody] AddExpertiesRequest request)
        {
            try
            {
                Team? updatedTeam = null;
                foreach (var expertise in request.Experties)
                {
                    updatedTeam = await _teamService.AddExpertiesAsync(memberId, expertise);
                }

                if (updatedTeam != null)
                {
                    // Clear caches
                    ClearTeamRelatedCaches(updatedTeam.Id);
                    ClearMemberRelatedCaches(memberId);
                    return Ok(updatedTeam);
                }
                return BadRequest("Yetenek eklenirken bir hata oluştu");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("invite-link/{teamId}/send")]
        public async Task<IActionResult> SendInviteLinkToUser(string teamId, [FromQuery] string userId)
        {
            try
            {
                var inviteLink = await _teamService.GenerateInviteLinkAsync(teamId);
                await _notificationService.SendNotificationAsync(
                    userId: userId,
                    title: "Davet Linki",
                    message: $"Davet linkiniz: {inviteLink}  ",
                    notificationType: NotificationType.TeamInvite
                );

                return Ok(new { message = "İlgili kullanıcılara davet linki gönderildi" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{teamId}/departments")]
        [Authorize]
        public async Task<IActionResult> UpdateTeamDepartments(string teamId, [FromBody] UpdateTeamDepartmentsRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği doğrulanamadı.");
                }

                var team = await _teamService.GetTeamById(teamId);
                if (team == null)
                {
                    return NotFound("Takım bulunamadı.");
                }

                // Sadece Owner rolündeki kullanıcılar departmanları güncelleyebilir
                var isOwner = team.Members?.Any(m => m.Id == userId && m.Role == "Owner") ?? false;
                if (!isOwner)
                {
                    return Forbid("Bu işlemi sadece takım sahibi yapabilir");
                }

                var updatedTeam = await _teamService.UpdateTeamDepartmentsAsync(teamId, request.Departments);

                // Clear caches
                ClearTeamRelatedCaches(teamId);
                _cache.Remove("departments");

                return Ok(updatedTeam);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("update-member-statuses")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateMemberStatuses([FromBody] MemberMetricsUpdateDto updateData)
        {
            try
            {
                if (updateData == null || string.IsNullOrEmpty(updateData.TeamId))
                {
                    return BadRequest(new { message = "Invalid update data. TeamId is required." });
                }

                var team = await _teamService.GetTeamById(updateData.TeamId);
                if (team == null)
                {
                    return NotFound(new { message = "Team not found" });
                }

                await _teamService.UpdateMemberStatusesAsync(updateData);

                return Ok(new { message = "Member statuses updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating member statuses for team {TeamId}", updateData?.TeamId);
                return StatusCode(500, new { message = "An error occurred while updating member statuses", error = ex.Message });
            }
        }

        [HttpGet("{id}/activity")]
        public async Task<IActionResult> GetTeamActivity(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                    return BadRequest("Team ID is required");

                var team = await _teamService.GetTeamById(id);
                if (team == null)
                    return NotFound("Team not found");

                var teamTasks = await _tasksService.GetTasksByTeamsAsync(new List<string> { id }); // Fixed method name from GetTasksByTeamAsync to GetTasksByTeamsAsync
                if (teamTasks == null || !teamTasks.Any())
                    return Ok(new { message = "No tasks found" });

                var tasksList = teamTasks.ToList(); // Convert to List to avoid multiple enumerations
                var completedTasks = tasksList.Where(t => t.Status == "completed").ToList();
                var completionRate = tasksList.Count > 0 ? (completedTasks.Count() * 100.0) / tasksList.Count : 0;

                var averageDuration = completedTasks
                    .Where(t => t.CompletedDate.HasValue)
                    .Select(t => (t.CompletedDate!.Value - t.CreatedAt).TotalDays)
                    .DefaultIfEmpty(0)
                    .Average();

                var overdueTasksCount = tasksList.Count(t => t.Status == "overdue");
                var onTimeCompletions = completedTasks.Count(t =>
                    t.CompletedDate.HasValue &&
                    t.DueDate.HasValue &&
                    t.CompletedDate.Value <= t.DueDate.Value);

                var performanceScore = CalculateTeamPerformanceScore(
                    tasksList.Count,
                    completedTasks.Count(),
                    overdueTasksCount,
                    onTimeCompletions,
                    averageDuration
                );

                var teamMembers = team.Members ?? new List<TeamMember>();
                var topContributors = new List<dynamic>();

                foreach (var member in teamMembers)
                {
                    var userTasks = tasksList.Where(t =>
                        t.AssignedUserIds != null &&
                        t.AssignedUserIds.Contains(member.Id)).ToList();

                    var memberCompletedTasks = userTasks.Count(t => t.Status == "completed");
                    var memberScore = CalculateUserPerformanceScore(userTasks);

                    var user = await _usersCollection.Find(u => u.Id == member.Id).FirstOrDefaultAsync();
                    if (user != null)
                    {
                        topContributors.Add(new
                        {
                            id = user.Id,
                            name = user.FullName ?? "Unknown",
                            profileImage = user.ProfileImage ?? "",
                            tasksCompleted = memberCompletedTasks,
                            performanceScore = memberScore,
                            role = user.Title ?? user.Position ?? "Team Member"
                        });
                    }
                }

                var response = new
                {
                    activity = new
                    {
                        completedTasksCount = completedTasks.Count(),
                        completionRate = completionRate,
                        averageTaskDuration = Math.Round(averageDuration, 1),
                        performanceScore = Math.Round(performanceScore, 1)
                    },
                    topContributors = topContributors.OrderByDescending(c => c.performanceScore).Take(5)
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting team activity for team {TeamId}", id);
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        private double CalculateTeamPerformanceScore(
            int totalTasks,
            int completedTasks,
            int overdueTasks,
            int onTimeCompletions,
            double averageDuration)
        {
            if (totalTasks == 0) return 0;

            // Weight factors for different components
            const double completionWeight = 0.4;
            const double onTimeWeight = 0.3;
            const double overdueWeight = 0.2;
            const double durationWeight = 0.1;

            // Calculate individual components
            var completionScore = (completedTasks * 100.0) / totalTasks;
            var onTimeScore = completedTasks > 0 ? (onTimeCompletions * 100.0) / completedTasks : 0;
            var overdueScore = 100 - (totalTasks > 0 ? (overdueTasks * 100.0) / totalTasks : 0);

            // Duration score - inverse relationship (lower is better)
            // Assuming 5 days is optimal, anything more reduces the score
            var durationScore = averageDuration <= 5 ? 100 : Math.Max(0, 100 - ((averageDuration - 5) * 10));

            // Calculate weighted average
            var finalScore = (completionScore * completionWeight) +
                            (onTimeScore * onTimeWeight) +
                            (overdueScore * overdueWeight) +
                            (durationScore * durationWeight);

            return Math.Min(100, Math.Max(0, finalScore));
        }

        private double CalculateUserPerformanceScore(List<TaskItem>? userTasks)
        {
            if (userTasks == null || userTasks.Count == 0) return 0;

            var completedTasks = userTasks.Count(t => t.Status == "completed");
            var overdueTasks = userTasks.Count(t => t.Status == "overdue");
            var onTimeCompletions = userTasks.Count(t =>
                t.Status == "completed" &&
                t.CompletedDate.HasValue &&
                t.DueDate.HasValue &&
                t.CompletedDate.Value <= t.DueDate.Value);

            var averageDuration = userTasks
                .Where(t => t.CompletedDate.HasValue)
                .Select(t => (t.CompletedDate!.Value - t.CreatedAt).TotalDays)
                .DefaultIfEmpty(0)
                .Average();

            return CalculateTeamPerformanceScore(
                userTasks.Count,
                completedTasks,
                overdueTasks,
                onTimeCompletions,
                averageDuration
            );
        }

        private void ClearTeamRelatedCaches(string? teamId)
        {
            if (string.IsNullOrEmpty(teamId)) return;

            _cache.Remove($"team_members_{teamId}");
            _cache.Remove($"team_{teamId}");
            _cache.Remove("all_members");
        }

        private void ClearMemberRelatedCaches(string memberId)
        {
            _cache.Remove($"performance_{memberId}");
            _cache.Remove($"teams_{memberId}");

            // Clear all-members cache
            _cache.Remove("all_members");

            // Clear all department caches as the member might be in any department
            foreach (var dept in JobTrackingAPI.Constants.DepartmentConstants.Departments)
            {
                _cache.Remove($"members_dept_{dept}");
            }
        }
    }
}