using Microsoft.Extensions.Caching.Memory;
using JobTrackingAPI.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace JobTrackingAPI.Services
{
    public class CacheService
    {
        private readonly IMemoryCache _cache;
        private readonly TimeSpan _defaultExpiration = TimeSpan.FromMinutes(10);
        private readonly ILogger<CacheService> _logger;
        
        public CacheService(IMemoryCache cache, ILogger<CacheService> logger)
        {
            _cache = cache;
            _logger = logger;
        }
        
        // User related cache keys
        public string GetUserCacheKey(string userId) => $"user_{userId}";
        public string GetUserTasksCacheKey(string userId) => $"user_tasks_{userId}";
        public string GetUserTeamsCacheKey(string userId) => $"teams_{userId}";
        public string GetUserPerformanceCacheKey(string userId) => $"performance_{userId}";
        
        // Team related cache keys
        public string GetTeamCacheKey(string teamId) => $"team_{teamId}";
        public string GetTeamMembersCacheKey(string teamId) => $"team_members_{teamId}";
        
        // Cache current user data
        public void CacheCurrentUserData(User user, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserCacheKey(user.Id), user, expiration ?? _defaultExpiration);
            _logger.LogInformation($"Cached current user data for user {user.Id}");
        }
        
        // Cache user tasks
        public void CacheUserTasks(string userId, List<TaskItem> tasks, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserTasksCacheKey(userId), tasks, expiration ?? _defaultExpiration);
            _logger.LogInformation($"Cached tasks for user {userId}");
        }
        
        // Cache user teams
        public void CacheUserTeams(string userId, List<Team> teams, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserTeamsCacheKey(userId), teams, expiration ?? _defaultExpiration);
            _logger.LogInformation($"Cached teams for user {userId}");
        }
        
        // Get user from cache
        public User GetCachedUser(string userId)
        {
            var user = _cache.TryGetValue(GetUserCacheKey(userId), out User cachedUser) ? cachedUser : null;
            _logger.LogInformation(user != null ? $"Retrieved cached user data for user {userId}" : $"No cached user data found for user {userId}");
            return user;
        }
        
        // Get user tasks from cache
        public List<TaskItem> GetCachedUserTasks(string userId)
        {
            var tasks = _cache.TryGetValue(GetUserTasksCacheKey(userId), out List<TaskItem> cachedTasks) ? cachedTasks : null;
            _logger.LogInformation(tasks != null ? $"Retrieved cached tasks for user {userId}" : $"No cached tasks found for user {userId}");
            return tasks;
        }
        
        // Get user teams from cache
        public List<Team> GetCachedUserTeams(string userId)
        {
            var teams = _cache.TryGetValue(GetUserTeamsCacheKey(userId), out List<Team> cachedTeams) ? cachedTeams : null;
            _logger.LogInformation(teams != null ? $"Retrieved cached teams for user {userId}" : $"No cached teams found for user {userId}");
            return teams;
        }
        
        // Invalidate user related caches
        public void InvalidateUserCaches(string userId)
        {
            _cache.Remove(GetUserCacheKey(userId));
            _cache.Remove(GetUserTasksCacheKey(userId));
            _cache.Remove(GetUserTeamsCacheKey(userId));
            _cache.Remove(GetUserPerformanceCacheKey(userId));
            _logger.LogInformation($"Invalidated cache for user {userId}");
        }
        
        // Invalidate team related caches
        public void InvalidateTeamCaches(string teamId)
        {
            _cache.Remove(GetTeamCacheKey(teamId));
            _cache.Remove(GetTeamMembersCacheKey(teamId));
            _logger.LogInformation($"Invalidated cache for team {teamId}");
        }
        
        // Invalidate all team members' caches when team is updated
        public void InvalidateTeamMembersCaches(Team team)
        {
            foreach (var member in team.Members)
            {
                InvalidateUserCaches(member.Id);
            }
            InvalidateTeamCaches(team.Id);
            _logger.LogInformation($"Invalidated cache for all members of team {team.Id}");
        }
        
        // Invalidate task-related caches
        public void InvalidateTaskRelatedCaches(TaskItem task)
        {
            // Invalidate assigned users' caches
            if (task.AssignedUsers != null)
            {
                foreach (var user in task.AssignedUsers)
                {
                    InvalidateUserCaches(user.Id);
                }
            }
            
            // If task belongs to a team, invalidate that team's cache too
            if (!string.IsNullOrEmpty(task.TeamId))
            {
                InvalidateTeamCaches(task.TeamId);
            }
            _logger.LogInformation($"Invalidated cache for task {task.Id}");
        }
        
        // Generic get or create method for any cache item
        public TItem GetOrCreate<TItem>(string key, Func<TItem> factory, TimeSpan? expiration = null)
        {
            if (!_cache.TryGetValue(key, out TItem result))
            {
                result = factory();
                _cache.Set(key, result, expiration ?? _defaultExpiration);
                _logger.LogInformation($"Created and cached item with key {key}");
            }
            else
            {
                _logger.LogInformation($"Retrieved cached item with key {key}");
            }
            return result;
        }
        
        // Async version of GetOrCreate
        public async Task<TItem> GetOrCreateAsync<TItem>(string key, Func<Task<TItem>> factory, TimeSpan? expiration = null)
        {
            if (!_cache.TryGetValue(key, out TItem result))
            {
                result = await factory();
                _cache.Set(key, result, expiration ?? _defaultExpiration);
                _logger.LogInformation($"Created and cached item with key {key}");
            }
            else
            {
                _logger.LogInformation($"Retrieved cached item with key {key}");
            }
            return result;
        }
    }
}