namespace JobTrackingAPI.Models
{
    public class MemberMetricsUpdateDto
    {
        public string TeamId { get; set; } = string.Empty;
        public double PerformanceScore { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int TotalTasks { get; set; }
    }
}
