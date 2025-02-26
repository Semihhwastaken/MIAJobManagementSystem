namespace JobTrackingAPI.Models
{
    /// <summary>
    /// Takım üyesinin metriklerini güncellemek için kullanılan DTO
    /// </summary>
    public class MemberMetricsUpdateDto
    {
        /// <summary>
        /// Görev sayısı
        /// </summary>
        public int TaskCount { get; set; }

        /// <summary>
        /// Performans puanı (0-100 arası)
        /// </summary>
        public double PerformanceScore { get; set; }
    }
}
