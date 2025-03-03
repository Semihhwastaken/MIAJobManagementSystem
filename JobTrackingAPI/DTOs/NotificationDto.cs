using System;
using JobTrackingAPI.Enums;

namespace JobTrackingAPI.DTOs
{
    /// <summary>
    /// Bildirim veri transfer nesnesi
    /// </summary>
    public class NotificationDto
    {
        /// <summary>
        /// Bildirimin gönderileceği kullanıcı ID'si
        /// </summary>
        public string UserId { get; set; } = null!;

        /// <summary>
        /// Bildirimin başlığı
        /// </summary>
        public string Title { get; set; } = null!;

        /// <summary>
        /// Bildirimin mesajı
        /// </summary>
        public string Message { get; set; } = null!;

        /// <summary>
        /// Bildirimin tipi
        /// </summary>
        public Enums.NotificationType Type { get; set; }

        /// <summary>
        /// İlgili iş kaydının ID'si
        /// </summary>
        public string? RelatedJobId { get; set; }
    }
}
