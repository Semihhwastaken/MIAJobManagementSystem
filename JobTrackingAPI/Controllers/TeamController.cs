using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        [HttpGet("{id}")]
        public async Task<ActionResult<Team>> GetTeam(string id)
        {
            var team = await _teamService.GetByIdAsync(id);
            if (team == null)
                return NotFound();
            return Ok(team);
        }

        [HttpPost]
        public async Task<ActionResult<Team>> CreateTeam(Team team)
        {
            var createdTeam = await _teamService.CreateAsync(team);
            return CreatedAtAction(nameof(GetTeam), new { id = createdTeam.Id }, createdTeam);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTeam(string id, Team team)
        {
            if (id != team.Id)
                return BadRequest();

            var success = await _teamService.UpdateAsync(team);
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(string id)
        {
            var success = await _teamService.DeleteAsync(id);
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpGet("departments")]
        public async Task<ActionResult<List<string>>> GetDepartments()
        {
            var users = await _userService.GetAllAsync();
            var departments = users.Select(u => u.Department).Distinct().ToList();
            return Ok(departments);
        }

        [HttpGet("by-department/{department}")]
        public async Task<ActionResult<List<User>>> GetTeamMembersByDepartment(string department)
        {
            var users = await _userService.GetByDepartmentAsync(department);
            return Ok(users);
        }
    }
}
