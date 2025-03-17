using System;

namespace JobTrackingAPI.Models
{
    public class ActiveTasksResponse
    {
        public int TotalActiveTasks { get; set; }
        public int TodoTasks { get; set; }
        public int InProgressTasks { get; set; }
        public bool IsBusy { get; set; }
    }
} 