using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models.Requests
{
    public class UploadProfileImageRequest
    {
        /// <summary>
        /// Profil resmi dosyası (maksimum 5MB, .jpg, .jpeg, .png, .gif)
        /// </summary>
        [Required(ErrorMessage = "Profile image file is required")]
        public IFormFile File { get; set; } = null!;
    }
}
