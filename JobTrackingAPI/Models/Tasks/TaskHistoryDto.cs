using System;
using System.Collections.Generic;

namespace JobTrackingAPI.Models
{
    public class TaskHistoryDto
    {
        public string? Id { get; set; }
        public string? TaskId { get; set; }  // Add this property
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public DateTime DueDate { get; set; }
        public List<UserDto>? AssignedUsers { get; set; }
        public DateTime ChangedOn { get; set; }  // Add this property
        public string? ChangedBy { get; set; }    // Add this property
        public string? ChangeType { get; set; }   // Add this property
    }
}