using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var (success, message, user) = await _authService.RegisterAsync(
                request.Username,
                request.Email,
                request.Password,
                request.FullName,
                request.Department,
                request.Title,
                request.Phone,
                request.Position,
                request.ProfileImage
            );

            if (!success)
            {
                return BadRequest(new { message });
            }

            return Ok(new { message, user });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (success, message, token, user) = await _authService.LoginAsync(
                request.Username,
                request.Password
            );

            if (!success)
            {
                return BadRequest(new { message });
            }

            return Ok(new { message, token, user });
        }

        [Authorize]
        [HttpGet("current-user")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                var user = await _authService.GetUserByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı" });
                }

                return Ok(new { user });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class RegisterRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        [MinLength(6)]
        public required string Password { get; set; }

        [Required]
        public required string FullName { get; set; }

        [Required]
        public required string Department { get; set; }

        [Required]
        public required string Title { get; set; }

        [Required]
        public required string Phone { get; set; }

        [Required]
        public required string Position { get; set; }

        public string? ProfileImage { get; set; }
    }

    public class LoginRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public required string Password { get; set; }
    }
}
