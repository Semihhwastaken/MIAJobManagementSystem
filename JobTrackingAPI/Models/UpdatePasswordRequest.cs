using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class UpdatePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
