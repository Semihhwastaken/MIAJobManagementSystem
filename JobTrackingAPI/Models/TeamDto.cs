using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class StatusUpdateDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    public class TeamMemberUpdateDto
    {
        public string? ProfileImage { get; set; }
        public List<string>? Expertise { get; set; }
        public string? Phone { get; set; }
        public AvailabilitySchedule? AvailabilitySchedule { get; set; }
    }
}
