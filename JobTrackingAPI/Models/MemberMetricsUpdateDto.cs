namespace JobTrackingAPI.Models
{
    /// <summary>
    /// Takım üyesinin metriklerini güncellemek için kullanılan DTO
    /// </summary>
    public class MemberMetricsUpdateDto
    {
        /// <summary>
        /// Tamamlanan görev sayısı
        /// </summary>
        public int CompletedTasks { get; set; }

        /// <summary>
        /// Performans puanı (0-100 arası)
        /// </summary>
        public double PerformanceScore { get; set; }
    }
}
