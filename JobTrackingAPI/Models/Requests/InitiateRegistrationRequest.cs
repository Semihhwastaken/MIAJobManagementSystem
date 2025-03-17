using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class InitiateRegistrationRequest
    {
        [Required(ErrorMessage = "E-posta adresi gereklidir")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz")]
        public required string Email { get; set; }

        [Required(ErrorMessage = "Kullanıcı adı gereklidir")]
        [MinLength(3, ErrorMessage = "Kullanıcı adı en az 3 karakter olmalıdır")]
        public required string Username { get; set; }

        [Required(ErrorMessage = "Şifre gereklidir")]
        [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır")]
        public required string Password { get; set; }

        [Required(ErrorMessage = "Ad Soyad gereklidir")]
        public required string FullName { get; set; }

        [Required(ErrorMessage = "Departman gereklidir")]
        public required string Department { get; set; }

        [Required(ErrorMessage = "Ünvan gereklidir")]
        public required string Title { get; set; }

        [Required(ErrorMessage = "Telefon numarası gereklidir")]
        public required string Phone { get; set; }

        [Required(ErrorMessage = "Pozisyon gereklidir")]
        public required string Position { get; set; }
        public string? Role { get; set; } = "User";

        public string? ProfileImage { get; set; }
    }
}
