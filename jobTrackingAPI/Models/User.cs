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

        public List<string> AssignedJobs { get; set; } = new List<string>();

        public User(string username, string email, string fullName, string department)
        {
            Id = ObjectId.GenerateNewId().ToString();
            Username = username;
            Email = email;
            FullName = fullName;
            Department = department;
        }
    }
}
