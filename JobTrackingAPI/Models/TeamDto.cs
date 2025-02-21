using System.Collections.Generic;

namespace JobTrackingAPI.Models
{
    public class StatusUpdateDto
    {
        public string Status { get; set; }
    }

    public class TeamMemberUpdateDto
    {
        public string? ProfileImage { get; set; }
        public List<string>? Expertise { get; set; }
        public string? Phone { get; set; }
        public AvailabilitySchedule? AvailabilitySchedule { get; set; }
    }
}
