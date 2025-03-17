using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [Required]
        public string Id { get; set; } = null!;

        [BsonElement("username")]
        [Required]
        public string Username { get; set; } = null!;

        [BsonElement("email")]
        [Required]
        public string Email { get; set; } = null!;

        [BsonElement("passwordHash")]
        public byte[] PasswordHash { get; set; } = Array.Empty<byte>();

        [BsonElement("passwordSalt")]
        public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();

        [BsonElement("fullName")]
        [Required]
        public string? FullName { get; set; }

        [BsonElement("department")]
        [Required]
        public string? Department { get; set; }

        [BsonElement("title")]
        [Required]
        public string? Title { get; set; }

        [BsonElement("phone")]
        [Required]
        public string? Phone { get; set; }

        [BsonElement("position")]
        [Required]
        public string? Position { get; set; }

        [BsonElement("userStatus")]
        public string UserStatus { get; set; } = "active";

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("profileImage")]
        public string? ProfileImage { get; set; }

        [BsonElement("expertise")]
        public List<string> Expertise { get; set; } = new List<string>();

        [BsonElement("metrics")]
        public MemberMetricsUpdateDto Metrics { get; set; } = new MemberMetricsUpdateDto();

        [BsonElement("availabilitySchedule")]
        public AvailabilitySchedule? AvailabilitySchedule { get; set; }

        [BsonElement("role")]
        public string Role { get; set; } = "User"; // Default role is "User", can be "Admin" or "User"

        [BsonElement("onlineStatus")]
        public string OnlineStatus { get; set; } = "offline";

        [BsonElement("performanceScore")]
        public double PerformanceScore { get; set; }

        [BsonElement("completedTasksCount")]
        public int CompletedTasksCount { get; set; }

        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedDate")]
        public DateTime? UpdatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("lastLoginDate")]
        public DateTime? LastLoginDate { get; set; }

        [BsonElement("isOnline")]
        public bool IsOnline { get; set; } = false;

        [BsonElement("ownerTeams")]
        public List<string> OwnerTeams { get; set; } = new List<string>();

        [BsonElement("memberTeams")]
        public List<string> MemberTeams { get; set; } = new List<string>();

        [BsonElement("taskHistory")]
        public List<string> TaskHistory { get; set; } = new List<string>();

        [BsonElement("subscriptionPlan")]
        public string SubscriptionPlan { get; set; } = "basic"; // default olarak basic plan

        [BsonElement("subscriptionId")]
        public string? SubscriptionId { get; set; }

        [BsonElement("subscriptionStatus")]
        public string SubscriptionStatus { get; set; } = "active";

        [BsonElement("subscriptionEndDate")]
        public DateTime? SubscriptionEndDate { get; set; }

        // New subscription properties
        [BsonElement("subscriptionDate")]
        public DateTime? SubscriptionDate { get; set; }

        [BsonElement("subscriptionExpiryDate")]
        public DateTime? SubscriptionExpiryDate { get; set; }
    }
}