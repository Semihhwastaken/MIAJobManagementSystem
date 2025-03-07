using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models.Requests
{
    public class CreateTeamRequest
    {
        [Required(ErrorMessage = "Takım adı zorunludur")]
        public string Name { get; set; }

        public string? Description { get; set; }
        
        [Required(ErrorMessage = "Departman seçimi zorunludur")]
        public string Department { get; set; }
    }
}
