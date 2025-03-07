using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;
using JobTrackingAPI.Services;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System;
using System.Text;
using System.Security.Cryptography;
using System.IO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Hubs;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IHubContext<ChatHub> _hubContext;
        private static readonly Dictionary<string, DateTime> _lastSeen = new();

        public UsersController(IUserService userService, IHubContext<ChatHub> hubContext)
        {
            _userService = userService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<List<User>>> GetAll()
        {
            var users = await _userService.GetAllUsers();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> Get(string id)
        {
            var user = await _userService.GetUserById(id);
            if (user == null)
            {
                return NotFound();
            }
            return Ok(user);
        }

        [HttpPost]
        public async Task<ActionResult<User>> Create(User user)
        {
            await _userService.UpdateUser(user.Id, user);
            return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            var currentUser = await _userService.GetUserById(id);
            if (currentUser == null)
            {
                return NotFound();
            }

            currentUser.FullName = request.FullName;
            currentUser.Department = request.Department;
            currentUser.Title = request.Title;
            currentUser.Phone = request.Phone;
            currentUser.Position = request.Position;
            if (request.ProfileImage != null)
            {
                currentUser.ProfileImage = request.ProfileImage;
            }
            currentUser.UpdatedDate = System.DateTime.UtcNow;

            await _userService.UpdateUser(id, currentUser);
            return Ok(currentUser);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userService.GetUserById(id);
            if (user == null)
            {
                return NotFound();
            }

            await _userService.DeleteUser(id);
            return NoContent();
        }

        [HttpGet("username/{username}")]
        public async Task<ActionResult<User>> GetByUsername(string username)
        {
            var user = await _userService.GetUserByEmail(username);
            if (user == null)
            {
                return NotFound();
            }
            return Ok(user);
        }

        // GET: api/Users/profile
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetCurrentUserProfile()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği bulunamadı");
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                var profile = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    department = user.Department,
                    title = user.Title,
                    phone = user.Phone,
                    position = user.Position,
                    profileImage = user.ProfileImage
                };

                return Ok(profile);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/Users/profile
        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği bulunamadı");
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                user.FullName = request.FullName;
                user.Department = request.Department;
                user.Title = request.Title;
                user.Phone = request.Phone;
                user.Position = request.Position;
                user.ProfileImage = request.ProfileImage;
                user.UpdatedDate = DateTime.UtcNow;

                await _userService.UpdateUser(userId, user);

                return Ok(new { message = "Profil başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/Users/password
        [Authorize]
        [HttpPut("password")]
        public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği bulunamadı");
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                if (!VerifyPasswordWithHashAndSalt(request.CurrentPassword, user.PasswordHash, user.PasswordSalt))
                {
                    return BadRequest("Mevcut şifre yanlış");
                }

                var (newHash, newSalt) = CreatePasswordHash(request.NewPassword);
                user.PasswordHash = newHash;
                user.PasswordSalt = newSalt;
                user.UpdatedDate = DateTime.UtcNow;

                await _userService.UpdateUser(userId, user);

                return Ok(new { message = "Şifre başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [Authorize]
        [HttpPost("profile/image")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadProfileImage([FromForm] UploadProfileImageRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği bulunamadı");
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                if (request.File == null || request.File.Length == 0)
                {
                    return BadRequest("Dosya seçilmedi");
                }

                var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
                string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest("Sadece .jpg, .jpeg, .png ve .gif uzantılı dosyalar yüklenebilir");
                }

                if (request.File.Length > 5 * 1024 * 1024)
                {
                    return BadRequest("Dosya boyutu 5MB'dan büyük olamaz");
                }

                using (var ms = new MemoryStream())
                {
                    await request.File.CopyToAsync(ms);
                    var fileBytes = ms.ToArray();
                    var base64String = Convert.ToBase64String(fileBytes);
                    user.ProfileImage = $"data:image/{extension.Replace(".", "")};base64,{base64String}";
                }

                user.UpdatedDate = DateTime.UtcNow;
                await _userService.UpdateUser(userId, user);

                return Ok(new { message = "Profil resmi başarıyla güncellendi", profileImage = user.ProfileImage });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}/online")]
        public ActionResult<bool> GetUserOnlineStatus(string id)
        {
            var isOnline = false;
            if (_lastSeen.TryGetValue(id, out DateTime lastSeenTime))
            {
                // Kullanıcı son 2 dakika içinde aktifse online kabul et
                isOnline = (DateTime.UtcNow - lastSeenTime).TotalMinutes <= 2;
            }
            return Ok(new { isOnline });
        }

        [HttpPost("{id}/heartbeat")]
        public ActionResult UpdateUserHeartbeat(string id)
        {
            _lastSeen[id] = DateTime.UtcNow;
            return Ok();
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private bool VerifyPassword(string password, string hashedPassword)
        {
            var hashedInput = HashPassword(password);
            return hashedInput == hashedPassword;
        }

        private (byte[] Hash, byte[] Salt) CreatePasswordHash(string password)
        {
            using (var hmac = new HMACSHA512())
            {
                var salt = hmac.Key;
                var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
                
                return (hash, salt);
            }
        }

        private bool VerifyPasswordWithHashAndSalt(string password, byte[] storedHash, byte[] storedSalt)
        {
            if (storedHash.Length == 0 || storedSalt.Length == 0)
                return false;
            
            using (var hmac = new HMACSHA512(storedSalt))
            {
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
                
                for (int i = 0; i < computedHash.Length; i++)
                {
                    if (computedHash[i] != storedHash[i])
                        return false;
                }
            }
            
            return true;
        }
    }

    public class UpdateUserRequest
    {
        public required string FullName { get; set; }
        public required string Department { get; set; }
        public required string Title { get; set; }
        public required string Phone { get; set; }
        public required string Position { get; set; }
        public string? ProfileImage { get; set; }
    }
}
