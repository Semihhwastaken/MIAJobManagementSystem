using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using System.IO;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;

        public UsersController(UserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<List<User>>> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> Get(string id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }
            return Ok(user);
        }

        [HttpPost]
        public async Task<ActionResult<User>> Create(User user)
        {
            await _userService.CreateAsync(user);
            return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, User user)
        {
            var existingUser = await _userService.GetByIdAsync(id);
            if (existingUser == null)
            {
                return NotFound();
            }

            user.Id = id;
            await _userService.UpdateAsync(id, user);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            await _userService.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("username/{username}")]
        public async Task<ActionResult<User>> GetByUsername(string username)
        {
            var user = await _userService.GetByUsernameAsync(username);
            if (user == null)
            {
                return NotFound();
            }
            return Ok(user);
        }

        // GET: api/Users/profile
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

                var user = await _userService.GetByIdAsync(userId);
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

                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                // Güvenlik nedeniyle sadece belirli alanları güncelliyoruz
                user.FullName = request.FullName;
                user.Department = request.Department;
                user.Title = request.Title;
                user.Phone = request.Phone;
                user.Position = request.Position;
                user.ProfileImage = request.ProfileImage;
                user.UpdatedDate = DateTime.UtcNow;

                await _userService.UpdateAsync(userId, user);

                return Ok(new { message = "Profil başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/Users/password
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

                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                // Mevcut şifre kontrolü
                if (!VerifyPassword(request.CurrentPassword, user.Password))
                {
                    return BadRequest("Mevcut şifre yanlış");
                }

                // Yeni şifre güncelleme
                user.Password = HashPassword(request.NewPassword);
                user.UpdatedDate = DateTime.UtcNow;

                await _userService.UpdateAsync(userId, user);

                return Ok(new { message = "Şifre başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // POST: api/Users/profile/image
        [HttpPost("profile/image")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Kullanıcı kimliği bulunamadı");
                }

                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Kullanıcı bulunamadı");
                }

                if (file == null || file.Length == 0)
                {
                    return BadRequest("Dosya seçilmedi");
                }

                // Dosya uzantısını kontrol et
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest("Sadece .jpg, .jpeg, .png ve .gif uzantılı dosyalar yüklenebilir");
                }

                // Dosya boyutunu kontrol et (max 5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    return BadRequest("Dosya boyutu 5MB'dan büyük olamaz");
                }

                // Dosyayı Base64'e çevir
                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    var fileBytes = ms.ToArray();
                    var base64String = Convert.ToBase64String(fileBytes);
                    user.ProfileImage = $"data:image/{extension.Replace(".", "")};base64,{base64String}";
                }

                user.UpdatedDate = DateTime.UtcNow;
                await _userService.UpdateAsync(userId, user);

                return Ok(new { message = "Profil resmi başarıyla güncellendi", profileImage = user.ProfileImage });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
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

    }
}
