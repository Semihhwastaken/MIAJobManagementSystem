namespace JobTrackingAPI.Models
{
    /// <summary>
    /// Takım üyesinin metriklerini güncellemek için kullanılan DTO
    /// </summary>
    public class MemberMetricsUpdateDto
    {
        /// <summary>
        /// Performans puanı (0-100 arası)
        /// </summary>
        public double PerformanceScore { get; set; }

        /// <summary>
        /// Tamamlanan görev sayısı
        /// </summary>
        public int CompletedTasks { get; set; }

        /// <summary>
        /// Gecikmiş görev sayısı
        /// </summary>
        public int OverdueTasks { get; set; }

        /// <summary>
        /// Toplam görev sayısı
        /// </summary>
        public int TotalTasks { get; set; }
    }
}
