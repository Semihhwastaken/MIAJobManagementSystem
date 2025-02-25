using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models.Requests
{
    public class AddExpertiesRequest
    {
        [Required(ErrorMessage = "Uzmanlık alanı zorunludur")]
        public string Experties { get; set; }
    }
}
