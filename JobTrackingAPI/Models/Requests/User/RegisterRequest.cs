using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class RegisterRequest
    {
        [Required]
        public string Username { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        public string? FullName { get; set; }
        public string? Department { get; set; }
        public string? Title { get; set; }
        public string? Phone { get; set; }
        public string? Position { get; set; }
        public string? ProfileImage { get; set; }
        public string? Role { get; set; }
    }
}
