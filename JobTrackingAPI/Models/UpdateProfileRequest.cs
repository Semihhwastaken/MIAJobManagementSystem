using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class UpdateProfileRequest
    {
        [Required]
        public string FullName { get; set; }

        [Required]
        public string Department { get; set; }

        [Required]
        public string Title { get; set; }

        [Required]
        public string Phone { get; set; }

        [Required]
        public string Position { get; set; }

        public string? ProfileImage { get; set; }
    }
}
