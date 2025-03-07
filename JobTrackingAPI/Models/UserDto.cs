namespace JobTrackingAPI.Models
{
    public class UserDto
    {
<<<<<<< HEAD
        public string Id { get; set; }
        public string FullName { get; set; }
=======
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Role { get; set; }
        public string? Department { get; set; }
        public List<string>? Teams { get; set; }
>>>>>>> 954951baa56d11e009937a68c5dc1b9badeb4754
    }
}