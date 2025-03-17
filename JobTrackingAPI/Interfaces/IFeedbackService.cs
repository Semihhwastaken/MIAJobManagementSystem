using JobTrackingAPI.Models;


namespace JobTrackingAPI.Interfaces
{
    public interface IFeedbackService
    {
        Task<Feedback> CreateFeedbackAsync(Feedback feedback);
        Task<List<Feedback>> GetPublicFeedbacksAsync();
        Task<List<Feedback>> GetAllFeedbacksAsync(string? status = null);
        Task<Feedback> UpdateFeedbackStatusAsync(string id, FeedbackStatus status, string? response = null);
        Task<FeedbackStats> GetFeedbackStatsAsync();
        Task<Feedback> GetFeedbackByIdAsync(string id);
        Task<bool> DeleteFeedbackAsync(string id);
    }
}
