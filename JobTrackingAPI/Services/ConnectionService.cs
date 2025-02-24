namespace JobTrackingAPI.Services
{
    public class ConnectionService : IConnectionService
    {
        private readonly Dictionary<string, HashSet<string>> _connections = new();

        public Task AddUserConnection(string userId, string connectionId)
        {
            if (!_connections.ContainsKey(userId))
            {
                _connections[userId] = new HashSet<string>();
            }
            _connections[userId].Add(connectionId);
            return Task.CompletedTask;
        }

        public Task RemoveUserConnection(string userId, string connectionId)
        {
            if (_connections.ContainsKey(userId))
            {
                _connections[userId].Remove(connectionId);
                if (_connections[userId].Count == 0)
                {
                    _connections.Remove(userId);
                }
            }
            return Task.CompletedTask;
        }

        public Task<List<string>> GetUserConnections(string userId)
        {
            if (_connections.ContainsKey(userId))
            {
                return Task.FromResult(_connections[userId].ToList());
            }
            return Task.FromResult(new List<string>());
        }
    }
}
