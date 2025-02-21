using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using MongoDB.Driver;
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
        private readonly string _jwtSecret;

        public AuthService(IOptions<MongoDbSettings> settings, IOptions<JwtSettings> jwtSettings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _jwtSecret = jwtSettings.Value.Secret;
        }

        public async Task<(bool success, string message, User? user)> RegisterAsync(
            string username, 
            string email, 
            string password,
            string fullName,
            string department,
            string title,
            string phone,
            string position,
            string? profileImage)
        {
            try 
            {
                // Check if username exists
                var existingUsername = await _users.Find(u => u.Username == username).FirstOrDefaultAsync();
                if (existingUsername != null)
                {
                    return (false, "Bu kullanıcı adı zaten kullanılıyor", null);
                }

                // Check if email exists
                var existingEmail = await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
                if (existingEmail != null)
                {
                    return (false, "Bu e-posta adresi zaten kayıtlı", null);
                }

                // Hash password
                var hashedPassword = HashPassword(password);

                // Create new user
                var user = new User(
                    username: username,
                    email: email,
                    fullName: fullName,
                    department: department,
                    password: hashedPassword,
                    profileImage: profileImage,
                    title: title,
                    phone: phone,
                    position: position
                );

                await _users.InsertOneAsync(user);
                return (true, "Kayıt işlemi başarılı", user);
            }
            catch (Exception ex)
            {
                return (false, $"Kayıt işlemi sırasında bir hata oluştu: {ex.Message}", null);
            }

        }

        public async Task<(bool success, string message, string? token, User? user)> LoginAsync(string username, string password)
        {
            var user = await _users.Find(u => u.Username == username).FirstOrDefaultAsync();
            if (user == null)
            {
                return (false, "User not found", null, null);
            }

            if (!VerifyPassword(password, user.Password))
            {
                return (false, "Invalid password", null, null);
            }

            var token = GenerateJwtToken(user);
            return (true, "Login successful", token, user);
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

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Email, user.Email)
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
