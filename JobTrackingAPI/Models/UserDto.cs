namespace JobTrackingAPI.Models
{
    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Role { get; set; }
        public string? Department { get; set; }
        public List<string>? Teams { get; set; }
    }
}