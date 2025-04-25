using System.Text;
using System.Text.Json;
using MongoDB.Driver;
using NotificationAPI.Models;
using NotificationAPI.Settings;
using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Hubs;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using Microsoft.Extensions.Logging;
using NotificationAPI.Enums;

namespace NotificationAPI.Services
{
    /// <summary>
    /// Bildirim işlemlerini yöneten servis sınıfı
    /// </summary>
    public class NotificationService : INotificationService
    {
        private readonly IMongoCollection<Notification> _notifications;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly RabbitMQSettings _rabbitSettings;
        private readonly ILogger<NotificationService> _logger;
        private IConnection? _rabbitConnection;
        private IModel? _channel;
        private bool _isConnected = false;
        private int _retryCount = 0;
        private const int MaxRetryCount = 5;

        /// <summary>
        /// NotificationService sınıfının yapıcı metodu
        /// </summary>
        /// <param name="database">MongoDB veritabanı bağlantısı</param>
        /// <param name="hubContext">SignalR hub context</param>
        /// <param name="rabbitSettings">RabbitMQ ayarları</param>
        /// <param name="logger">Logger servisi</param>
        public NotificationService(
            IMongoDatabase database,
            IHubContext<NotificationHub> hubContext,
            IOptions<RabbitMQSettings> rabbitSettings,
            ILogger<NotificationService> logger)
        {
            _notifications = database.GetCollection<Notification>("Notifications");
            _hubContext = hubContext;
            _rabbitSettings = rabbitSettings.Value;
            _logger = logger;
            
            TryConnect();
            CreateIndexes();
        }
        
        /// <summary>
        /// RabbitMQ'ya bağlanmayı dener
        /// </summary>
        /// <returns>Bağlantı başarılı ise true, değilse false</returns>
        private bool TryConnect()
        {
            _logger.LogInformation("RabbitMQ bağlantısı kuruluyor... Deneme: {RetryCount}", _retryCount + 1);
            
            try
            {
                var factory = new ConnectionFactory
                {
                    HostName = _rabbitSettings.HostName,
                    UserName = _rabbitSettings.UserName,
                    Password = _rabbitSettings.Password,
                    Port = -1,
                    VirtualHost = "/",
                };

                _rabbitConnection = factory.CreateConnection();
                _channel = _rabbitConnection.CreateModel();

                _channel.QueueDeclare(
                    queue: _rabbitSettings.NotificationQueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);
                
                _isConnected = true;
                _retryCount = 0;
                _logger.LogInformation("RabbitMQ bağlantısı başarıyla kuruldu");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RabbitMQ bağlantısı kurulamadı. Deneme: {RetryCount}", _retryCount + 1);
                
                // Bağlantı başarısız olduğunda kısa bir süre bekle
                Thread.Sleep(2000 * (_retryCount + 1));
                
                _retryCount++;
                
                if (_retryCount < MaxRetryCount)
                {
                    return TryConnect();
                }
                
                return false;
            }
        }

        private void CreateIndexes()
        {
            try
            {
                var indexes = new[]
                {
                    new CreateIndexModel<Notification>(
                        Builders<Notification>.IndexKeys
                            .Ascending(n => n.UserId)
                            .Descending(n => n.CreatedDate),
                        new CreateIndexOptions { Background = true, Name = "UserId_CreatedDate" }
                    ),
                    new CreateIndexModel<Notification>(
                        Builders<Notification>.IndexKeys.Ascending(n => n.IsRead),
                        new CreateIndexOptions { Background = true, Name = "IsRead" }
                    ),
                    new CreateIndexModel<Notification>(
                        Builders<Notification>.IndexKeys.Ascending("UserId").Ascending("IsRead"),
                        new CreateIndexOptions { Background = true, Name = "UserId_IsRead" }
                    )
                };

                _notifications.Indexes.CreateMany(indexes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating indexes");
            }
        }

        /// <summary>
        /// Belirli bir kullanıcının tüm bildirimlerini getirir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>Kullanıcının bildirimleri</returns>
        public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId)
        {
            try
            {
                var filter = Builders<Notification>.Filter.Eq(n => n.UserId, userId);
                var sort = Builders<Notification>.Sort.Descending(n => n.CreatedDate);
                var options = new FindOptions<Notification>
                {
                    Limit = 50, // Son 50 bildirimi getir
                    Sort = sort
                };

                var notifications = await _notifications.FindAsync(filter, options);
                return await notifications.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Belirli bir kullanıcının okunmamış bildirimlerini getirir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>Kullanıcının okunmamış bildirimleri</returns>
        public async Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(string userId)
        {
            try
            {
                return await _notifications.Find(n => n.UserId == userId && !n.IsRead)
                                         .SortByDescending(n => n.CreatedDate)
                                         .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Okunmamış bildirimler getirilirken hata oluştu. UserId: {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Belirli bir bildirimi okundu olarak işaretleme
        /// </summary>
        /// <param name="notificationId">Bildirim ID'si</param>
        /// <returns>Bildirim okundu olarak işaretilirse true, değilse false</returns>
        public async Task<bool> MarkAsReadAsync(string notificationId)
        {
            try
            {
                var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
                var result = await _notifications.UpdateOneAsync(n => n.Id == notificationId, update);
                return result.ModifiedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim okundu olarak işaretlenirken hata oluştu. NotificationId: {NotificationId}", notificationId);
                throw;
            }
        }

        /// <summary>
        /// Belirli bir kullanıcının tüm bildirimlerini okundu olarak işaretleme
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>Bildirimler okundu olarak işaretilirse true, değilse false</returns>
        public async Task<bool> MarkAllAsReadAsync(string userId)
        {
            try
            {
                var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
                var result = await _notifications.UpdateManyAsync(n => n.UserId == userId && !n.IsRead, update);
                return result.ModifiedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tüm bildirimler okundu olarak işaretlenirken hata oluştu. UserId: {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Belirli bir bildirimi silme
        /// </summary>
        /// <param name="notificationId">Bildirim ID'si</param>
        /// <returns>Bildirim silinirse true, değilse false</returns>
        public async Task<bool> DeleteNotificationAsync(string notificationId)
        {
            try
            {
                var result = await _notifications.DeleteOneAsync(n => n.Id == notificationId);
                return result.DeletedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim silinirken hata oluştu. NotificationId: {NotificationId}", notificationId);
                throw;
            }
        }

        /// <summary>
        /// Toplu bildirim gönderme
        /// </summary>
        /// <param name="notifications">Gönderilecek bildirimler</param>
        public async Task SendBulkNotificationsAsync(List<Notification> notifications)
        {
            try
            {
                _logger.LogInformation("Toplu bildirim gönderiliyor. Bildirim sayısı: {Count}", notifications.Count);
                
                // Bildirimleri MongoDB'ye kaydet
                await _notifications.InsertManyAsync(notifications);
                
                // Bildirimleri 100'lük gruplar halinde işle
                var batches = notifications.Chunk(100);
                
                foreach (var batch in batches)
                {
                    var message = JsonSerializer.Serialize(batch);
                    var body = Encoding.UTF8.GetBytes(message);

                    // RabbitMQ bağlantısını kontrol et
                    if (!_isConnected || _channel == null || _channel.IsClosed)
                    {
                        _logger.LogWarning("RabbitMQ bağlantısı kapalı. Yeniden bağlanmaya çalışılıyor...");
                        if (!TryConnect())
                        {
                            _logger.LogError("RabbitMQ'ya bağlanılamadı. Bildirimler sadece veritabanına kaydedildi.");
                            continue;
                        }
                    }

                    try 
                    {
                        _channel.BasicPublish(
                            exchange: "",
                            routingKey: _rabbitSettings.NotificationQueueName,
                            basicProperties: null,
                            body: body);
                            
                        _logger.LogInformation("Bildirim grubu RabbitMQ'ya başarıyla gönderildi. Grup boyutu: {Size}", batch.Length);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "RabbitMQ'ya mesaj gönderilirken hata oluştu. Yeniden bağlanmaya çalışılıyor...");
                        if (TryConnect())
                        {
                            // Yeniden bağlantı başarılı olduysa, mesajı tekrar göndermeyi dene
                            try
                            {
                                _channel.BasicPublish(
                                    exchange: "",
                                    routingKey: _rabbitSettings.NotificationQueueName,
                                    basicProperties: null,
                                    body: body);
                                    
                                _logger.LogInformation("Bildirim grubu yeniden bağlantı sonrası RabbitMQ'ya başarıyla gönderildi.");
                            }
                            catch (Exception retryEx)
                            {
                                _logger.LogError(retryEx, "Yeniden bağlantı sonrası RabbitMQ'ya mesaj gönderilirken hata oluştu.");
                            }
                        }
                    }
                }
                
                // Bildirimleri real-time olarak SignalR üzerinden gönder
                foreach (var notification in notifications)
                {
                    await _hubContext.Clients.User(notification.UserId).SendAsync("ReceiveNotification", notification);
                }
                
                _logger.LogInformation("Toplu bildirim gönderme işlemi tamamlandı.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Toplu bildirim gönderilirken hata oluştu.");
                throw;
            }
        }

        /// <summary>
        /// Test bildirimi gönderme
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>Gönderilen test bildirimi</returns>
        public async Task<Notification> SendTestNotificationAsync(string userId)
        {
            try
            {
                var notification = new Notification(
                    userId: userId,
                    title: "Test Bildirimi",
                    message: "Bu bir test bildirimidir.",
                    type: NotificationType.Message,
                    relatedJobId: null
                );

                await _notifications.InsertOneAsync(notification);
                await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", notification);

                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Test bildirimi gönderilirken hata oluştu. UserId: {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Bildirim oluşturma
        /// </summary>
        /// <param name="notification">Oluşturulacak bildirim</param>
        /// <returns>Oluşturulan bildirim</returns>
        public async Task<Notification> CreateNotificationAsync(Notification notification)
        {
            try
            {
                await _notifications.InsertOneAsync(notification);
                await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);
                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim oluşturulurken hata oluştu. UserId: {UserId}", notification.UserId);
                throw;
            }
        }
    }
}
