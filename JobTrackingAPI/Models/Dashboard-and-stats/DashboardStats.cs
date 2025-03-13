namespace JobTrackingAPI.Models
{
    public class DashboardStats
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int PendingTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int InProgressTasks { get; set; } // Devam eden görevler için yeni özellik
        public int PreviousTotalTasks { get; set; }
        public int PreviousCompletedTasks { get; set; }
        public int PreviousInProgressTasks { get; set; }
        public int PreviousOverdueTasks { get; set; }
        public List<ChartDataPoint>? LineChartData { get; set; }
        public TeamActivity? TeamActivity { get; set; }
        public List<TopContributor>? TopContributors { get; set; }
    }

    public class ChartDataPoint
    {
        public DateTime Date { get; set; }
        public string? DateString { get; set; } // Frontend için string formatlı tarih ekliyoruz
        public int Completed { get; set; }
        public int NewTasks { get; set; }
    }

    public class TeamActivity
    {
        public int CompletedTasksCount { get; set; }
        public double CompletionRate { get; set; }
        public double AverageTaskDuration { get; set; }
        public double PerformanceScore { get; set; }
    }

    public class TopContributor
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? ProfileImage { get; set; }
        public int TasksCompleted { get; set; }
        public double PerformanceScore { get; set; }
        public string? Role { get; set; }
    }
}