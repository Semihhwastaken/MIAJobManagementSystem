using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using MongoDB.Driver;
using System.Collections.Generic;
using Microsoft.Extensions.Options;
using JobTrackingAPI.Settings;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace JobTrackingAPI.Services
{
    public class AuthService
    {
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<VerificationCode> _verificationCodes;
        private readonly EmailService _emailService;
        private readonly CacheService _cacheService;
        private readonly Random _random;
        private readonly string _jwtSecret;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IOptions<MongoDbSettings> settings,
            IOptions<JwtSettings> jwtSettings,
            EmailService emailService,
            CacheService cacheService,
            ILogger<AuthService> logger)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _verificationCodes = database.GetCollection<VerificationCode>(settings.Value.VerificationCodesCollectionName);
            _emailService = emailService;
            _cacheService = cacheService;
            _random = new Random();
            _jwtSecret = jwtSettings.Value.Secret;
            _logger = logger;
        }

        private string GenerateVerificationCode()
        {
            return _random.Next(100000, 999999).ToString();
        }

        public async Task<VerificationResponse> InitiateRegistrationAsync(InitiateRegistrationRequest request)
        {
            try
            {
                // Check if email or username already exists
                var existingUser = await _users.Find(u => u.Email == request.Email || u.Username == request.Username).FirstOrDefaultAsync();
                if (existingUser != null)
                {
                    return new VerificationResponse
                    {
                        Success = false,
                        Message = existingUser.Email == request.Email ? 
                            "Bu email adresi zaten kullanımda." : 
                            "Bu kullanıcı adı zaten kullanımda."
                    };
                }

                // Generate and save verification code
                var code = GenerateVerificationCode();
                var verificationCode = new VerificationCode
                {
                    Email = request.Email,
                    Code = code,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(1)
                };

                // Remove any existing verification codes for this email
                await _verificationCodes.DeleteManyAsync(vc => vc.Email == request.Email);

                // Save new verification code
                await _verificationCodes.InsertOneAsync(verificationCode);

                // Send verification email
                await _emailService.SendVerificationEmailAsync(request.Email, code);

                return new VerificationResponse
                {
                    Success = true,
                    Message = "Doğrulama kodu e-posta adresinize gönderildi."
                };
            }
            catch (Exception ex)
            {
                return new VerificationResponse
                {
                    Success = false,
                    Message = $"Kayıt işlemi başlatılırken bir hata oluştu: {ex.Message}"
                };
            }
        }

        public async Task<(bool success, string message, User? user)> VerifyAndRegisterAsync(
            string email,
            string code,
            string username,
            string password,
            string fullName,
            string department,
            string title,
            string phone,
            string position,
            string? profileImage)
        {
            var verificationCode = await _verificationCodes.Find(vc =>
                vc.Email == email &&
                vc.Code == code &&
                vc.ExpiresAt > DateTime.UtcNow
            ).FirstOrDefaultAsync();

            if (verificationCode == null)
            {
                return (false, "Geçersiz veya süresi dolmuş doğrulama kodu.", null);
            }

            // Create password hash and salt
            var (passwordHash, passwordSalt) = CreatePasswordHash(password);

            var now = DateTime.UtcNow;

            // Create the user
            var user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                FullName = fullName,
                Department = department,
                Title = title,
                Phone = phone,
                Position = position,
                ProfileImage = profileImage ?? string.Empty,
                CreatedDate = now,
                UpdatedDate = now
            };

            try
            {
                await _users.InsertOneAsync(user);

                // Clean up verification codes
                await _verificationCodes.DeleteManyAsync(vc => vc.Email == email);

                return (true, "Kayıt başarıyla tamamlandı.", user);
            }
            catch (Exception ex)
            {
                return (false, $"Kayıt sırasında bir hata oluştu: {ex.Message}", null);
            }
        }

        public async Task<User?> AuthenticateAsync(string username, string password)
        {
            var user = await _users.Find(x => x.Username == username).FirstOrDefaultAsync();
            if (user == null)
                return null;

            var hashedPassword = HashPassword(password);
            if (user.Password != hashedPassword)
                return null;

            return user;
        }

        public async Task<(bool success, string message, string? token, User? user)> LoginAsync(string username, string password)
        {
            try
            {
                // Check if username exists
                var user = await _users.Find(u => u.Username == username).FirstOrDefaultAsync();
                if (user == null)
                {
                    _logger.LogWarning("Login attempt failed: Username {Username} not found", username);
                    return (false, "Kullanıcı adı veya şifre hatalı", null, null);
                }

                // Handle users with either password hash/salt or legacy password
                bool validPassword = false;
                
                // Check if user has password hash and salt
                if (user.PasswordHash != null && user.PasswordHash.Length > 0 && 
                    user.PasswordSalt != null && user.PasswordSalt.Length > 0)
                {
                    // Use secure password verification with hash and salt
                    validPassword = VerifyPassword(password, user.PasswordHash, user.PasswordSalt);
                    _logger.LogDebug("Verifying password with hash/salt for user {Username}", username);
                }
                // Fall back to legacy password if available
                else if (!string.IsNullOrEmpty(user.Password))
                {
                    // Use legacy password check
                    string hashedPassword = HashPassword(password);
                    validPassword = (user.Password == hashedPassword);
                    _logger.LogDebug("Verifying password with legacy method for user {Username}", username);
                    
                    // Optionally upgrade to secure hash/salt
                    if (validPassword)
                    {
                        var (passwordHash, passwordSalt) = CreatePasswordHash(password);
                        var passwordUpdate = Builders<User>.Update
                            .Set(u => u.PasswordHash, passwordHash)
                            .Set(u => u.PasswordSalt, passwordSalt);
                        await _users.UpdateOneAsync(u => u.Id == user.Id, passwordUpdate);
                        _logger.LogInformation("Upgraded password security for user {Username}", username);
                    }
                }
                else
                {
                    _logger.LogError("User {Username} has no password information stored", username);
                    return (false, "Kullanıcı adı veya şifre hatalı", null, null);
                }

                if (!validPassword)
                {
                    _logger.LogWarning("Login attempt failed: Invalid password for user {Username}", username);
                    return (false, "Kullanıcı adı veya şifre hatalı", null, null);
                }

                // Password is correct, generate token
                var token = GenerateJwtToken(user);

                // Update last login date
                var update = Builders<User>.Update
                    .Set(u => u.LastLoginDate, DateTime.UtcNow)
                    .Set(u => u.IsOnline, true);
                await _users.UpdateOneAsync(u => u.Id == user.Id, update);

                // Cache user data in separate try-catch to prevent login failure due to caching
                try
                {
                    _cacheService.CacheCurrentUserData(user);
                    
                    var userTasks = await GetUserTasksAsync(user.Id);
                    _cacheService.CacheUserTasks(user.Id, userTasks);
                    
                    var userTeams = await GetUserTeamsAsync(user.Id);
                    _cacheService.CacheUserTeams(user.Id, userTeams);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error caching user data during login for {Username}", username);
                    // Continue with login despite caching error
                }

                _logger.LogInformation("User {Username} logged in successfully", username);
                return (true, "Giriş başarılı", token, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed for user {Username}", username);
                return (false, "Giriş sırasında bir hata oluştu", null, null);
            }
        }

        private async Task<List<TaskItem>> GetUserTasksAsync(string userId)
        {
            // Implement logic to get user tasks from the database
            // This is a placeholder implementation
            return await Task.FromResult(new List<TaskItem>());
        }

        private async Task<List<Team>> GetUserTeamsAsync(string userId)
        {
            // Implement logic to get user teams from the database
            // This is a placeholder implementation
            return await Task.FromResult(new List<Team>());
        }

        public async Task<User?> GetUserByIdAsync(string userId)
        {
            return await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        private (byte[] hash, byte[] salt) CreatePasswordHash(string password)
        {
            using var hmac = new HMACSHA512();
            var salt = hmac.Key;
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            return (hash, salt);
        }

        public string GenerateJwtToken(User user)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim("FullName", user.FullName ?? string.Empty),
                    new Claim("Department", user.Department ?? string.Empty)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private bool VerifyPassword(string password, byte[] storedHash, byte[] storedSalt)
        {
            if (storedHash == null || storedHash.Length == 0 || storedSalt == null || storedSalt.Length == 0)
            {
                _logger.LogError("Password hash or salt is empty");
                return false;
            }

            using (var hmac = new HMACSHA512(storedSalt))
            {
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
                
                if (computedHash.Length != storedHash.Length)
                {
                    _logger.LogError($"Hash length mismatch. Computed: {computedHash.Length}, Stored: {storedHash.Length}");
                    return false;
                }

                for (int i = 0; i < computedHash.Length; i++)
                {
                    if (computedHash[i] != storedHash[i])
                    {
                        return false;
                    }
                }
                return true;
            }
        }
    }
}
