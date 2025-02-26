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

        [BsonElement("fullName")]
        [Required]
        public string? FullName { get; set; }

        [BsonElement("department")]
        [Required]
        public string? Department { get; set; }

        [BsonElement("password")]
        [Required]
        public string Password { get; set; } = null!;

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

        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedDate")]
        public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("lastLoginDate")]
        public DateTime? LastLoginDate { get; set; }

        [BsonElement("isOnline")]
        public bool IsOnline { get; set; } = false;

        [BsonElement("teams")]
        public List<string> Teams { get; set; } = new List<string>();
    }
}