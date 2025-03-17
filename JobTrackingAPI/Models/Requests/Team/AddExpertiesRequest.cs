using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models.Requests
{
    public class AddExpertiesRequest
    {
        [Required(ErrorMessage = "Uzmanlık alanı zorunludur")]
        public List<string>? Experties { get; set; }
    }
}
