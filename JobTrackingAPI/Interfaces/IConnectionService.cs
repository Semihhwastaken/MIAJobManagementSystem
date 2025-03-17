namespace JobTrackingAPI.Services
{
    public interface IConnectionService
    {
        Task AddUserConnection(string userId, string connectionId);
        Task RemoveUserConnection(string userId, string connectionId);
        Task<List<string>> GetUserConnections(string userId);
    }
}
