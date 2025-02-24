using Microsoft.AspNetCore.Mvc;
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
    public class TeamController : ControllerBase
    {
        private readonly TeamService _teamService;
        private readonly UserService _userService;

        public TeamController(TeamService teamService, UserService userService)
        {
            _teamService = teamService;
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<List<Team>>> GetTeams()
        {
            var teams = await _teamService.GetAllAsync();
            return Ok(teams);
        }

        [HttpGet("team/{id}")]
        public async Task<ActionResult<Team>> GetTeam(string id)
        {
            var team = await _teamService.GetByIdAsync(id);
            if (team == null)
            {
                return NotFound();
            }
            return team;
        }

        [HttpPost("create")]
        public async Task<ActionResult<Team>> CreateTeam(Team team)
        {
            var createdTeam = await _teamService.CreateAsync(team);
            return CreatedAtAction(nameof(GetTeam), new { id = createdTeam.Id }, createdTeam);
        }

        [HttpPut("team/{id}")]
        public async Task<IActionResult> UpdateTeam(string id, Team team)
        {
            if (id != team.Id)
            {
                return BadRequest();
            }

            var result = await _teamService.UpdateAsync(id, team);
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpDelete("team/{id}")]
        public async Task<IActionResult> DeleteTeam(string id)
        {
            var success = await _teamService.DeleteAsync(id);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
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

        [HttpGet("member/{id}")]
        public async Task<ActionResult<List<Team>>> GetTeamsByMemberId(string id)
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

        [HttpGet("by-department/{department}")]
        public async Task<ActionResult<List<User>>> GetTeamMembersByDepartment(string department)
        {
            var users = await _userService.GetByDepartmentAsync(department);
            return Ok(users);
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
