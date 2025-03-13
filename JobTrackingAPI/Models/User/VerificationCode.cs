using System;
using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class VerificationCode
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [Required]
        public required string Email { get; set; }

        [Required]
        public required string Code { get; set; }

        public DateTime ExpiresAt { get; set; }
    }

    public class VerificationRequest
    {
        [Required(ErrorMessage = "E-posta adresi gereklidir")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz")]
        public required string Email { get; set; }

        [Required(ErrorMessage = "Doğrulama kodu gereklidir")]
        public required string Code { get; set; }

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

        public string? ProfileImage { get; set; }
    }

    public class VerificationResponse
    {
        public bool Success { get; set; }
        public required string Message { get; set; }
        public string? Token { get; set; }
    }
}
