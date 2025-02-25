using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;  // Tek bir using ifadesi bırakıyoruz
using JobTrackingAPI.Services;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
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
            try
            {
                var updatedMember = await _teamService.UpdateMemberStatusAsync(id, status.Status);
                if (updatedMember == null)
                    return NotFound($"Member with ID {id} not found");
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
                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı.");
                }

                var team = new Team
                {
                    Name = request.Name,
                    Description = request.Description, // Description eklendi
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
                            FullName = user.FullName,
                            Department = request.Department, // Burada department'ı ayarlıyoruz
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
                var result = await _teamService.AddExpertiesAsync(memberId, request.Experties);
                if (result != null)
                {
                    return Ok(result);
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

                var team = await _teamService.GetByIdAsync(teamId);
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
                return Ok(updatedTeam);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}