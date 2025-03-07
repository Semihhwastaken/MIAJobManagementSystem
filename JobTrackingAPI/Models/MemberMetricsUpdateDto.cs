namespace JobTrackingAPI.Models
{
<<<<<<< HEAD
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
=======
    public class MemberMetricsUpdateDto
    {
        public string TeamId { get; set; } = string.Empty;
        public double PerformanceScore { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int TotalTasks { get; set; }
>>>>>>> newdb1
    }
}
