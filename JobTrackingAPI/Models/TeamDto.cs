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
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? Department { get; set; }
        public string? Title { get; set; }
        public string? Phone { get; set; }
        public string? Position { get; set; }
        public string? ProfileImage { get; set; }
        public List<string>? Expertise { get; set; }
        public AvailabilitySchedule? AvailabilitySchedule { get; set; }
    }
}
