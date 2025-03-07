using System.Collections.Generic;
using System;

namespace JobTrackingAPI.Models
{
    public class StatusUpdateDto
    {
        public string Status { get; set; }
    }

    public class TeamDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public List<UserDto>? Members { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}