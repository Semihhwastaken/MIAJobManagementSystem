using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;
using JobTrackingAPI.Services;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Hubs;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TeamController : ControllerBase
    {
        private readonly TeamService _teamService;
        private readonly UserService _userService;
        private readonly IMongoDatabase _database;
        private readonly IMemoryCache _cache;
        private readonly ILogger<TeamController> _logger;
        private readonly IHubContext<NotificationHub> _notificationHubContext;
        private static readonly SemaphoreSlim _updateStatusSemaphore = new SemaphoreSlim(1, 1);
        private static DateTime _lastStatusUpdate = DateTime.MinValue;

        public TeamController(
            TeamService teamService, 
            UserService userService, 
            IMongoDatabase database, 
            IMemoryCache memoryCache,
            ILogger<TeamController> logger,
            IHubContext<NotificationHub> notificationHubContext)
        {
            _teamService = teamService;
            _userService = userService;
            _database = database;
            _cache = memoryCache;
            _logger = logger;
            _notificationHubContext = notificationHubContext;
        }

        [HttpGet("members/{userId}/performance")]
        public async Task<IActionResult> GetMemberPerformance(string userId)
        {
            try
            {
                var cacheKey = $"performance_{userId}";
                
                // Try to get performance from cache
                if (_cache.TryGetValue(cacheKey, out PerformanceScore cachedPerformance))
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
                
                // Check if teams are cached with longer expiration
                if (_cache.TryGetValue(cacheKey, out List<Team> cachedTeams))
                {
                    return Ok(cachedTeams);
                }

                var teams = await _teamService.GetTeamsByUserId(userId);
                
                // Cache teams for 5 minutes instead of 2
                _cache.Set(cacheKey, teams, TimeSpan.FromMinutes(5));
                
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
                if (_cache.TryGetValue(cacheKey, out List<Team> cachedTeams))
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
                if (_cache.TryGetValue(cacheKey, out List<TeamMember> cachedMembers))
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
                if (_cache.TryGetValue(cacheKey, out List<string> cachedDepartments))
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
                if (_cache.TryGetValue(cacheKey, out List<TeamMember> cachedMembers))
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
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // Kullanıcının bu takıma erişim yetkisi var mı kontrol et
                var team = await _teamService.GetTeamById(teamId);
                if (team == null || (team.CreatedById != userId && !team.Members.Any(m => m.Id == userId)))
                {
                    return Forbid();
                }

                var cacheKey = $"team_members_{teamId}";
                
                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out List<TeamMember> cachedMembers))
                {
                    return Ok(cachedMembers);
                }
                
                var members = await _teamService.GetTeamMembers(teamId);
                
                // Cache for 2 minutes
                _cache.Set(cacheKey, members, TimeSpan.FromMinutes(2));
                
                return Ok(members);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
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

                // Use claims data instead of fetching user from database
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "";
                var email = User.FindFirst(ClaimTypes.Email)?.Value ?? "";
                var fullName = User.FindFirst("FullName")?.Value ?? "";
                var title = User.FindFirst("Title")?.Value ?? "";
                var position = User.FindFirst("Position")?.Value ?? "";
                var profileImage = "";  // Profile image not typically in claims

                // If we're missing critical data from claims, then fall back to DB
                if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(email))
                {
                    var cacheKey = $"user_{userId}";
                    User user = null;
                    
                    // Try to get from cache first
                    if (!_cache.TryGetValue(cacheKey, out user))
                    {
                        user = await _userService.GetUserById(userId);
                        if (user == null)
                        {
                            return NotFound("Kullanıcı bulunamadı.");
                        }
                        
                        // Cache the user for future use
                        _cache.Set(cacheKey, user, TimeSpan.FromMinutes(10));
                    }
                    
                    username = user.Username;
                    email = user.Email;
                    fullName = user.FullName;
                    title = user.Title ?? "";
                    position = user.Position ?? "";
                    profileImage = user.ProfileImage ?? "";
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
                            Username = username,
                            Email = email,
                            FullName = fullName,
                            Department = request.Department,
                            ProfileImage = profileImage,
                            Title = title,
                            Position = position,
                            Role = "Owner",
                            AssignedJobs = new List<string>(),
                            Status = "available",
                            OnlineStatus = "online"
                        }
                    }
                };

                var createdTeam = await _teamService.CreateAsync(team);

                // Send notification to team creator
                await _notificationService.SendNotificationAsync(
                    userId: userId,
                    title: "Yeni Ekip Oluşturuldu",
                    message: $"{request.Name} ekibi başarıyla oluşturuldu.",
                    notificationType: NotificationType.TeamCreated,
                    relatedJobId: createdTeam.Id
                );

                
                // Clear user's teams cache
                _cache.Remove($"teams_{userId}");
                _cache.Remove($"myTeams_{userId}");
                _cache.Remove("all_members");
                
                return Ok(createdTeam);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating team: {@TeamRequest}", request);
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

                var result = await _teamService.DeleteTeamAsync(teamId, userId);
                if (!result.success)
                {
                    return BadRequest(new { message = result.message });
                }
                
                // Clear team related caches
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

                var result = await _teamService.JoinTeamWithInviteCode(inviteCode, userId);
                if (result)
                {
                    // Notify team owner
                    var teamOwner = team.Members.FirstOrDefault(m => m.Role == "Owner");
                    if (teamOwner != null)
                    {
                        await _notificationService.SendNotificationAsync(
                            userId: teamOwner.Id,
                            title: "Yeni Ekip Üyesi",
                            message: $"Yeni bir kullanıcı {team.Name} ekibine katıldı.",
                            notificationType: NotificationType.TeamMemberAdded,
                            relatedJobId: team.Id
                        );
                    }
                if (!result)
                    return BadRequest("Ekibe katılırken bir hata oluştu");
                
                // Clear caches
                _cache.Remove($"teams_{userId}");
                ClearTeamRelatedCaches(team.Id);
                _cache.Remove("all_members");

                    return Ok(new { message = "Ekibe başarıyla katıldınız", teamName = team.Name });
                }
                return BadRequest("Ekibe katılırken bir hata oluştu");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error joining team with invite code: {InviteCode}", inviteCode);
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
                    // Notify new owner
                    await _notificationService.SendNotificationAsync(
                        userId: targetUserId,
                        title: "Ekip Sahipliği",
                        message: "Bir ekibin yeni sahibi oldunuz.",
                        notificationType: NotificationType.TeamMemberRoleChanged,
                        relatedJobId: teamId
                    );

                    // Clear caches
                    ClearTeamRelatedCaches(teamId);
                    ClearMemberRelatedCaches(targetUserId);
                    return Ok(new { message = "Owner rolü başarıyla atandı." });
                }
                return BadRequest("Owner rolü atanamadı.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning owner role. TeamId: {TeamId}, TargetUserId: {TargetUserId}", teamId, targetUserId);
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

                // First check if we have the team in cache
                var teamCacheKey = $"team_{teamId}";
                Team team = null;
                
                if (_cache.TryGetValue(teamCacheKey, out team))
                {
                    // Check if user has permission from cached data
                    var member = team.Members.FirstOrDefault(m => m.Id == userId);
                    if (member == null || (member.Role != "Owner" && userId != memberId))
                    {
                        return Forbid("Bu işlemi sadece takım sahibi veya üyenin kendisi yapabilir");
                    }
                }

                var result = await _teamService.RemoveTeamMemberAsync(teamId, memberId, userId);
                if (result.success)
                {
                    // Notify removed member
                    await _notificationService.SendNotificationAsync(
                        userId: memberId,
                        title: "Ekipten Çıkarıldınız",
                        message: $"Bir ekipten çıkarıldınız.",
                        notificationType: NotificationType.TeamMemberRemoved,
                        relatedJobId: teamId
                    );
                    return BadRequest(new { message = result.message });
                }
                
                // Clear caches with optimized invalidation strategy
                ClearTeamRelatedCaches(teamId);
                ClearMemberRelatedCaches(memberId);
                
                // Also clear the team member's own teams cache
                _cache.Remove($"teams_{memberId}");
                _cache.Remove($"myTeams_{memberId}");
                
                // Notify all team members + the removed member about the change
                await _notificationHubContext.Clients.All.SendAsync("TeamMembershipChanged", teamId);

                    return Ok(new { message = result.message });
                }
                return BadRequest(new { message = result.message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing team member. TeamId: {TeamId}, MemberId: {MemberId}", teamId, memberId);
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
                Team updatedTeam = null;
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
                var isOwner = team.Members.Any(m => m.Id == userId && m.Role == "Owner");
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
        
        private void ClearTeamRelatedCaches(string teamId)
        {
            _cache.Remove($"team_members_{teamId}");
            _cache.Remove($"team_{teamId}");
            
            // Clear all-members cache as it may contain team members
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