using System.Collections.Generic;
<<<<<<< HEAD
=======
using System;
>>>>>>> newdb1

namespace JobTrackingAPI.Models
{
    public class StatusUpdateDto
    {
        public string Status { get; set; }
    }

<<<<<<< HEAD
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
=======
    public class TeamDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public List<UserDto>? Members { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
>>>>>>> newdb1
    }
}