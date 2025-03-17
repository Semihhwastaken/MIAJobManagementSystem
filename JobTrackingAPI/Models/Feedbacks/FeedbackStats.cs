namespace JobTrackingAPI.Models
{
    public class FeedbackStats
    {
        public int Total { get; set; }
        public int NewCount { get; set; }
        public int RespondedCount { get; set; }
        public int ArchivedCount { get; set; }
        public double AverageRating { get; set; }
    }
}
