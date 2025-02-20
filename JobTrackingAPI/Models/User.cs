using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("username")]
        public string Username { get; set; }

        [BsonElement("email")]
        public string Email { get; set; }

        [BsonElement("fullName")]
        public string FullName { get; set; }

        [BsonElement("department")]
        public string Department { get; set; }

        [BsonElement("password")]
        public string Password { get; set; }

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("createdDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? UpdatedDate { get; set; }

        public User()
        {
        }

        public User(string username, string email, string fullName, string department, string password)
        {
            Username = username;
            Email = email;
            FullName = fullName;
            Department = department;
            Password = password;
            CreatedDate = DateTime.UtcNow;
        }
    }
}
