using Microsoft.Extensions.Caching.Memory;
using JobTrackingAPI.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading;
using Microsoft.Extensions.Caching.Distributed;
using JobTrackingAPI.Extensions;

namespace JobTrackingAPI.Services
{
    public class CacheService
    {
        private readonly IMemoryCache _cache;
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<CacheService> _logger;
        
        // Cache süreleri için optimize edilmiş sabitler
        private static readonly TimeSpan ACTIVE_TASKS_CACHE = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan COMPLETED_TASKS_CACHE = TimeSpan.FromMinutes(30);
        private static readonly TimeSpan USER_INFO_CACHE = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan TEAM_INFO_CACHE = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan DASHBOARD_CACHE = TimeSpan.FromMinutes(5);
        
        // Cache metrikleri için sayaçlar
        private int _cacheHits;
        private int _cacheMisses;
        private readonly Dictionary<string, int> _keyAccessCount;
        
        public CacheService(
            IMemoryCache cache, 
            IDistributedCache distributedCache,
            ILogger<CacheService> logger)
        {
            _cache = cache;
            _distributedCache = distributedCache;
            _logger = logger;
            _keyAccessCount = new Dictionary<string, int>();
            _cacheHits = 0;
            _cacheMisses = 0;
        }

        // Performance monitoring için metrikler
        public CacheMetrics GetMetrics()
        {
            return new CacheMetrics
            {
                Hits = _cacheHits,
                Misses = _cacheMisses,
                HitRatio = _cacheHits + _cacheMisses == 0 ? 0 : (double)_cacheHits / (_cacheHits + _cacheMisses),
                MostAccessedKeys = _keyAccessCount.OrderByDescending(x => x.Value).Take(10).ToDictionary(x => x.Key, x => x.Value)
            };
        }

        private void TrackAccess(string key, bool isHit)
        {
            if (isHit) 
                Interlocked.Increment(ref _cacheHits);
            else 
                Interlocked.Increment(ref _cacheMisses);

            lock (_keyAccessCount)
            {
                if (!_keyAccessCount.ContainsKey(key))
                    _keyAccessCount[key] = 0;
                _keyAccessCount[key]++;
            }
        }

        // Akıllı Cache Yenileme için geliştirilmiş GetOrUpdateAsync
        public async Task<T?> GetOrUpdateAsync<T>(string key, Func<Task<T?>> factory, TimeSpan? expiration = null)
        {
            if (!_cache.TryGetValue(key, out T? result))
            {
                TrackAccess(key, false);
                result = await factory();
                if (result != null)
                {
                    var options = new MemoryCacheEntryOptions();
                    
                    // Cache süresini ve önceliği belirleme
                    if (key.Contains("active_tasks"))
                    {
                        options.SetSlidingExpiration(ACTIVE_TASKS_CACHE)
                               .SetPriority(CacheItemPriority.High);
                    }
                    else if (key.Contains("completed_tasks"))
                    {
                        options.SetSlidingExpiration(COMPLETED_TASKS_CACHE)
                               .SetPriority(CacheItemPriority.Low);
                    }
                    else if (key.Contains("user_"))
                    {
                        options.SetSlidingExpiration(USER_INFO_CACHE)
                               .SetPriority(CacheItemPriority.Normal);
                    }
                    else if (key.Contains("team_"))
                    {
                        options.SetSlidingExpiration(TEAM_INFO_CACHE)
                               .SetPriority(CacheItemPriority.Normal);
                    }
                    else if (key.Contains("dashboard"))
                    {
                        options.SetSlidingExpiration(DASHBOARD_CACHE)
                               .SetPriority(CacheItemPriority.High);
                    }
                    else
                    {
                        options.SetSlidingExpiration(expiration ?? USER_INFO_CACHE)
                               .SetPriority(CacheItemPriority.Normal);
                    }

                    // Arka planda yenileme için post-eviction callback
                    options.RegisterPostEvictionCallback((key, value, reason, state) =>
                    {
                        if (reason == EvictionReason.Expired)
                        {
                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    var newValue = await factory();
                                    if (newValue != null)
                                    {
                                        _cache.Set(key.ToString(), newValue, options);
                                        _logger.LogInformation($"Background refresh completed for key {key}");
                                    }
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, $"Error during background refresh for key {key}");
                                }
                            });
                        }
                    });

                    _cache.Set(key, result, options);
                    _logger.LogInformation($"Created and cached item with key {key}");
                }
            }
            else
            {
                TrackAccess(key, true);
                _logger.LogInformation($"Retrieved cached item with key {key}");
            }
            return result;
        }

        // Bulk Cache Operations için yeni metod
        public async Task BulkCacheOperationAsync<T>(
            IEnumerable<string> keys,
            Func<string, Task<T?>> factory,
            TimeSpan? expiration = null)
        {
            var tasks = keys.Select(async key =>
            {
                try
                {
                    var value = await factory(key);
                    if (value != null)
                    {
                        await GetOrUpdateAsync(key, async () => value, expiration);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error during bulk cache operation for key {key}");
                }
            });

            await Task.WhenAll(tasks);
        }

        // Cache Invalidation için geliştirilmiş metod
        public async Task InvalidateCachePatternAsync(string pattern)
        {
            try
            {
                var keysToRemove = _keyAccessCount.Keys
                    .Where(k => k.Contains(pattern))
                    .ToList();

                foreach (var key in keysToRemove)
                {
                    _cache.Remove(key);
                    lock (_keyAccessCount)
                    {
                        _keyAccessCount.Remove(key);
                    }
                }

                _logger.LogInformation($"Invalidated {keysToRemove.Count} cache entries matching pattern: {pattern}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error during cache invalidation for pattern {pattern}");
            }
        }

        // User related cache keys
        public string GetUserCacheKey(string userId) => $"user_{userId}";
        public string GetUserTasksCacheKey(string userId) => $"user_tasks_{userId}";
        public string GetUserTeamsCacheKey(string userId) => $"teams_{userId}";
        public string GetUserPerformanceCacheKey(string userId) => $"performance_{userId}";
        public string GetUserTaskHistoryCacheKey(string userId) => $"task_history_{userId}";
        
        // Team related cache keys
        public string GetTeamCacheKey(string teamId) => $"team_{teamId}";
        public string GetTeamMembersCacheKey(string teamId) => $"team_members_{teamId}";
        
        // Bulk cache operations için yeni metodlar
        public void BulkCacheUserData(string userId, User userData, List<TaskItem> tasks, List<Team> teams)
        {
            var options = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(USER_INFO_CACHE)
                .SetPriority(CacheItemPriority.High);

            _cache.Set(GetUserCacheKey(userId), userData, options);
            _cache.Set(GetUserTasksCacheKey(userId), tasks, options);
            _cache.Set(GetUserTeamsCacheKey(userId), teams, options);
            
            _logger.LogInformation($"Bulk cached data for user {userId}");
        }

        // Performans metrikleri için yeni cache
        public void CachePerformanceMetrics(string userId, PerformanceScore metrics)
        {
            var options = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(USER_INFO_CACHE)
                .SetPriority(CacheItemPriority.Normal);

            _cache.Set(GetUserPerformanceCacheKey(userId), metrics, options);
        }

        // Statik veriler için uzun süreli cache
        public void CacheStaticData<T>(string key, T data)
        {
            var options = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TEAM_INFO_CACHE)
                .SetPriority(CacheItemPriority.NeverRemove);

            _cache.Set(key, data, options);
        }

        // Cache preloading için yeni metod
        public async Task PreloadUserCache(string userId, Func<Task<User>> getUserData, 
            Func<Task<List<TaskItem>>> getTasks, Func<Task<List<Team>>> getTeams)
        {
            var userData = await getUserData();
            var tasks = await getTasks();
            var teams = await getTeams();

            BulkCacheUserData(userId, userData, tasks, teams);
        }

        // Cache current user data
        public void CacheCurrentUserData(User user, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserCacheKey(user.Id), user, expiration ?? USER_INFO_CACHE);
            _logger.LogInformation($"Cached current user data for user {user.Id}");
        }
        
        // Cache user tasks
        public void CacheUserTasks(string userId, List<TaskItem> tasks, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserTasksCacheKey(userId), tasks, expiration ?? USER_INFO_CACHE);
            _logger.LogInformation($"Cached tasks for user {userId}");
        }
        
        // Cache user teams
        public void CacheUserTeams(string userId, List<Team> teams, TimeSpan? expiration = null)
        {
            _cache.Set(GetUserTeamsCacheKey(userId), teams, expiration ?? USER_INFO_CACHE);
            _logger.LogInformation($"Cached teams for user {userId}");
        }
        
        // Get user from cache
        public User? GetCachedUser(string userId)
        {
            if (_cache.TryGetValue(GetUserCacheKey(userId), out User? cachedUser))
            {
                _logger.LogInformation($"Retrieved cached user data for user {userId}");
                return cachedUser;
            }
            _logger.LogInformation($"No cached user data found for user {userId}");
            return null;
        }
        
        // Get user tasks from cache
        public List<TaskItem>? GetCachedUserTasks(string userId)
        {
            if (_cache.TryGetValue(GetUserTasksCacheKey(userId), out List<TaskItem>? cachedTasks))
            {
                _logger.LogInformation($"Retrieved cached tasks for user {userId}");
                return cachedTasks;
            }
            _logger.LogInformation($"No cached tasks found for user {userId}");
            return null;
        }
        
        // Get user teams from cache
        public List<Team>? GetCachedUserTeams(string userId)
        {
            if (_cache.TryGetValue(GetUserTeamsCacheKey(userId), out List<Team>? cachedTeams))
            {
                _logger.LogInformation($"Retrieved cached teams for user {userId}");
                return cachedTeams;
            }
            _logger.LogInformation($"No cached teams found for user {userId}");
            return null;
        }
        
        // Invalidate user related caches
        public void InvalidateUserCaches(string userId)
        {
            var keysToRemove = new[]
            {
                GetUserCacheKey(userId),
                GetUserTasksCacheKey(userId),
                GetUserTeamsCacheKey(userId),
                GetUserPerformanceCacheKey(userId)
            };

            foreach (var key in keysToRemove)
            {
                _cache.Remove(key);
            }
            _logger.LogInformation($"Invalidated all caches for user {userId}");
        }
        
        // Invalidate team related caches
        public void InvalidateTeamCaches(string teamId)
        {
            var keysToRemove = new[]
            {
                GetTeamCacheKey(teamId),
                GetTeamMembersCacheKey(teamId)
            };

            foreach (var key in keysToRemove)
            {
                _cache.Remove(key);
            }
            _logger.LogInformation($"Invalidated all caches for team {teamId}");
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
        public T? GetOrCreate<T>(string key, Func<T?>? factory, TimeSpan? expiration = null)
        {
            if (string.IsNullOrEmpty(key))
            {
                _logger.LogWarning("Attempted to get or create cache with null or empty key");
                return default;
            }

            if (!_cache.TryGetValue(key, out T? result))
            {
                if (factory == null)
                {
                    _logger.LogInformation($"Removing cache for key {key}");
                    _cache.Remove(key);
                    return default;
                }

                result = factory();
                if (result != null)
                {
                    var options = new MemoryCacheEntryOptions()
                        .SetSlidingExpiration(expiration ?? USER_INFO_CACHE)
                        .SetPriority(CacheItemPriority.Normal);

                    _cache.Set(key, result, options);
                    _logger.LogInformation($"Created and cached item with key {key}");
                }
            }
            else
            {
                _logger.LogInformation($"Retrieved cached item with key {key}");
            }
            return result;
        }
        
        // Async version of GetOrCreate
        public async Task<T?> GetOrCreateAsync<T>(string key, Func<Task<T?>> factory, TimeSpan? expiration = null)
        {
            if (!_cache.TryGetValue(key, out T? result))
            {
                result = await factory();
                if (result != null)
                {
                    _cache.Set(key, result, expiration ?? USER_INFO_CACHE);
                    _logger.LogInformation($"Created and cached item with key {key}");
                }
            }
            else
            {
                _logger.LogInformation($"Retrieved cached item with key {key}");
            }
            return result;
        }

        // Kullanıcı verilerini preload eden yeni metod
        public async Task PreloadUserDataAsync(
            string userId, 
            Func<Task<User?>> getUserData,
            Func<Task<List<TaskItem>>> getActiveTasks,
            Func<Task<List<TaskItem>>> getCompletedTasks,
            Func<Task<List<Team>>> getUserTeams,
            Func<Task<DashboardStats>> getDashboardStats,
            Func<Task<List<TaskHistory>>> getTaskHistory)
        {
            try
            {
                _logger.LogInformation($"Starting data preload for user {userId}");

                var tasks = new List<Task>();

                // User data
                tasks.Add(GetOrUpdateAsync(
                    GetUserCacheKey(userId),
                    getUserData,
                    USER_INFO_CACHE));

                // Active tasks
                tasks.Add(GetOrUpdateAsync(
                    GetUserTasksCacheKey(userId),
                    getActiveTasks,
                    ACTIVE_TASKS_CACHE));

                // Completed tasks
                tasks.Add(GetOrUpdateAsync(
                    $"completed_tasks_{userId}",
                    getCompletedTasks,
                    COMPLETED_TASKS_CACHE));

                // Teams
                tasks.Add(GetOrUpdateAsync(
                    GetUserTeamsCacheKey(userId),
                    getUserTeams,
                    TEAM_INFO_CACHE));

                // Dashboard stats
                tasks.Add(GetOrUpdateAsync(
                    $"dashboard_stats_{userId}",
                    getDashboardStats,
                    DASHBOARD_CACHE));

                // Task History
                tasks.Add(GetOrUpdateAsync(
                    GetUserTaskHistoryCacheKey(userId),
                    getTaskHistory,
                    COMPLETED_TASKS_CACHE));

                await Task.WhenAll(tasks);

                _logger.LogInformation($"Completed data preload for user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error during data preload for user {userId}");
                throw;
            }
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            try
            {
                // Önce memory cache'e bak
                if (_cache.TryGetValue(key, out T? result))
                {
                    return result;
                }

                // Memory cache'de yoksa distributed cache'e bak
                var distributedResult = await _distributedCache.GetAsync<T>(key);
                if (distributedResult != null)
                {
                    // Distributed cache'den alınan veriyi memory cache'e de ekle
                    _cache.Set(key, distributedResult, TimeSpan.FromMinutes(5));
                }

                return distributedResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Cache get error for key: {key}");
                return default;
            }
        }

        private async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
        {
            try
            {
                // Memory cache'e ekle
                _cache.Set(key, value, expiration ?? TimeSpan.FromMinutes(5));

                // Distributed cache'e ekle
                var options = new DistributedCacheEntryOptions
                {
                    SlidingExpiration = expiration ?? TimeSpan.FromMinutes(5)
                };
                await _distributedCache.SetAsync(key, value, options);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Cache set error for key: {key}");
            }
        }
    }

    public class CacheMetrics
    {
        public int Hits { get; set; }
        public int Misses { get; set; }
        public double HitRatio { get; set; }
        public Dictionary<string, int> MostAccessedKeys { get; set; } = new();
    }
}