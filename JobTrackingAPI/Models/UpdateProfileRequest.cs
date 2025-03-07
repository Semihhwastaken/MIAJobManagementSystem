using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class UpdateProfileRequest
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Department { get; set; } = string.Empty;

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Phone { get; set; } = string.Empty;

        [Required]
        public string Position { get; set; } = string.Empty;

        public string? ProfileImage { get; set; }
    }
}
