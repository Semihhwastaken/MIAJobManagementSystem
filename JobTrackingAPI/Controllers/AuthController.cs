using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
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

        [HttpPost("register/initiate")]
        public async Task<IActionResult> InitiateRegistration([FromBody] Models.InitiateRegistrationRequest request)
        {
            var result = await _authService.InitiateRegistrationAsync(request);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("register/verify")]
        public async Task<IActionResult> VerifyAndRegister([FromBody] Models.VerificationRequest request)
        {
            var (success, message, user) = await _authService.VerifyAndRegisterAsync(
                request.Email,
                request.Code,
                request.Username,
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

            // Generate JWT token
            var token = _authService.GenerateJwtToken(user);
            return Ok(new { message, token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (success, message, token, user) = await _authService.LoginAsync(request.Username, request.Password);
            if (!success || token == null || user == null)
            {
                return BadRequest(new { Message = message });
            }

            return Ok(new { Token = token, User = user });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }
    }

    public class LoginRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public required string Password { get; set; }
    }
}
