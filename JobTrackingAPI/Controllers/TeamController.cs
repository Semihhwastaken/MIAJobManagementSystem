using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Tüm endpoint'ler için authentication gerekli
    public class TeamController : ControllerBase
    {
        private readonly TeamService _teamService;
        private readonly UserService _userService;

        public TeamController(TeamService teamService, UserService userService)
        {
            _teamService = teamService;
            _userService = userService;
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

                var teams = await _teamService.GetTeamsByUserId(userId);
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

                var teams = await _teamService.GetTeamsByOwnerId(userId);
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
                var members = await _teamService.GetAllMembersAsync();
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
                var departments = await _teamService.GetDepartmentsAsync();
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
                var members = await _teamService.GetMembersByDepartmentAsync(department);
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
                if (team == null || team.CreatedById != userId)
                {
                    return Forbid();
                }

                var members = await _teamService.GetTeamMembers(teamId);
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
            var teams = await _teamService.GetTeamsByMemberIdAsync(id);
            return Ok(teams);
        }

        [HttpGet("leader/{id}")]
        public async Task<ActionResult<List<Team>>> GetTeamsByLeaderId(string id)
        {
            var teams = await _teamService.GetTeamsByLeaderIdAsync(id);
            return Ok(teams);
        }

        [HttpGet("department/{department}")]
        public async Task<ActionResult<List<Team>>> GetTeamsByDepartment(string department)
        {
            var teams = await _teamService.GetTeamsByDepartmentAsync(department);
            return Ok(teams);
        }

        [HttpPut("{teamId}/member/{userId}/status")]
        public async Task<IActionResult> UpdateMemberStatus(string teamId, string userId, [FromBody] string status)
        {
            var member = await _teamService.UpdateMemberStatusAsync(teamId, userId, status);
            if (member == null)
            {
                return NotFound();
            }
            return Ok(member);
        }

        [HttpPut("{teamId}/member/{userId}")]
        public async Task<IActionResult> UpdateMember(string teamId, string userId, [FromBody] TeamMember updatedMember)
        {
            var member = await _teamService.UpdateMemberAsync(teamId, userId, updatedMember);
            if (member == null)
            {
                return NotFound();
            }
            return Ok(member);
        }

        [HttpPut("{teamId}/member/{userId}/metrics")]
        public async Task<IActionResult> UpdateMemberMetrics(string teamId, string userId, [FromBody] MemberMetricsUpdateDto metrics)
        {
            var success = await _teamService.UpdateMemberMetricsAsync(teamId, userId, metrics.CompletedTasks, metrics.PerformanceScore);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği doğrulanamadı.");
                }

                // Kullanıcı bilgilerini al
                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı.");
                }

                var team = new Team
                {
                    Name = request.Name,
                    CreatedById = userId,
                    Members = new List<TeamMember>
                    {
                        new TeamMember
                        {
                            Id = userId,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Department = user.Department,
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

                var existingTeam = await _teamService.GetByIdAsync(teamId);
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
                if (!result)
                    return BadRequest("Ekibe katılırken bir hata oluştu");

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

                return Ok(new { message = result.message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("my-teams")]
        public async Task<ActionResult<(List<Team> LeadingTeams, List<Team> MemberTeams)>> GetMyTeams()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teams = await _teamService.GetAllTeamsByUserIdAsync(userId);
            return Ok(teams);
        }

        [Authorize]
        [HttpGet("leading")]
        public async Task<ActionResult<List<Team>>> GetLeadingTeams()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teams = await _teamService.GetTeamsByLeaderIdAsync(userId);
            return Ok(teams);
        }

        [Authorize]
        [HttpGet("member")]
        public async Task<ActionResult<List<Team>>> GetMemberTeams()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var teams = await _teamService.GetTeamsByMemberIdAsync(userId);
            return Ok(teams);
        }

        [Authorize]
        [HttpPost("create-with-leader")]
        public async Task<ActionResult<Team>> CreateTeamWithLeader([FromBody] Team team)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var createdTeam = await _teamService.CreateTeamWithLeaderAsync(team, userId);
            return CreatedAtAction(nameof(GetTeam), new { id = createdTeam.Id }, createdTeam);
        }

        [Authorize]
        [HttpPost("{teamId}/members")]
        public async Task<ActionResult> AddTeamMember(string teamId, [FromBody] string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
                return Unauthorized();

            var team = await _teamService.GetByIdAsync(teamId);
            if (team == null)
                return NotFound();

            if (team.LeaderId != currentUserId)
                return Forbid();

            var result = await _teamService.AddTeamMemberAsync(teamId, userId);
            if (!result)
                return BadRequest();

            return Ok();
        }

        [Authorize]
        [HttpDelete("{teamId}/members/{userId}")]
        public async Task<ActionResult> RemoveTeamMember(string teamId, string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
                return Unauthorized();

            var team = await _teamService.GetByIdAsync(teamId);
            if (team == null)
                return NotFound();

            if (team.LeaderId != currentUserId)
                return Forbid();

            var result = await _teamService.RemoveTeamMemberAsync(teamId, userId);
            if (!result)
                return BadRequest();

            return Ok();
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateTeamWithLeader(string id, [FromBody] Team team)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
                return Unauthorized();

            var existingTeam = await _teamService.GetByIdAsync(id);
            if (existingTeam == null)
                return NotFound();

            if (existingTeam.LeaderId != currentUserId)
                return Forbid();

            team.Id = id;
            team.LeaderId = currentUserId;
            var result = await _teamService.UpdateAsync(id, team);
            if (!result)
                return BadRequest();

            return Ok();
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTeamWithLeader(string id)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
                return Unauthorized();

            var team = await _teamService.GetByIdAsync(id);
            if (team == null)
                return NotFound();

            if (team.LeaderId != currentUserId)
                return Forbid();

            var result = await _teamService.DeleteAsync(id);
            if (!result)
                return BadRequest();

            return Ok();
        }
    }
}
