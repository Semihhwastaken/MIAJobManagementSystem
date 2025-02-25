namespace JobTrackingAPI.Models
{
    public class DashboardStats
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int PreviousTotalTasks { get; set; }
        public int PreviousCompletedTasks { get; set; }
        public int PreviousInProgressTasks { get; set; }
        public int PreviousOverdueTasks { get; set; }
        public List<LineChartDataItem> LineChartData { get; set; }
    }

    public class LineChartDataItem
    {
        public DateTime Date { get; set; }
        public int Completed { get; set; }
        public int NewTasks { get; set; }
    }
}