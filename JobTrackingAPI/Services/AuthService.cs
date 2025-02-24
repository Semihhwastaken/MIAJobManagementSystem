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

namespace JobTrackingAPI.Services
{
    public class AuthService
    {
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<VerificationCode> _verificationCodes;
        private readonly EmailService _emailService;
        private readonly Random _random;
        private readonly string _jwtSecret;

        public AuthService(
            IOptions<MongoDbSettings> settings,
            IOptions<JwtSettings> jwtSettings,
            EmailService emailService)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _verificationCodes = database.GetCollection<VerificationCode>(settings.Value.VerificationCodesCollectionName);
            _emailService = emailService;
            _random = new Random();
            _jwtSecret = jwtSettings.Value.Secret;
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

            // Hash password
            var hashedPassword = HashPassword(password);

            var now = DateTime.UtcNow;

            // Create the user
            var user = new User
            {
                Username = username,
                Email = email,
                Password = hashedPassword,
                FullName = fullName,
                Department = department,
                Title = title,
                Phone = phone,
                Position = position,
                ProfileImage = profileImage ?? string.Empty,
                CreatedAt = now,
                UpdatedAt = now,
                LeadingTeams = new List<string>(),
                MemberOfTeams = new List<string>()
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
            var user = await AuthenticateAsync(username, password);
            if (user == null)
            {
                return (false, "Kullanıcı adı veya şifre hatalı.", null, null);
            }

            var token = GenerateJwtToken(user);
            return (true, "Giriş başarılı.", token, user);
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
                    new Claim("FullName", user.FullName),
                    new Claim("Department", user.Department)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
