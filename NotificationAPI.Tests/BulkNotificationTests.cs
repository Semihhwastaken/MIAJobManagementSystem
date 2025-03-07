using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Moq;
using NotificationAPI.Models;
using NotificationAPI.Services;
using NotificationAPI.Enums;
using Xunit;
using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Hubs;
using NotificationAPI.Settings;
using Microsoft.Extensions.Options;

namespace NotificationAPI.Tests
{
    public class BulkNotificationTests : IDisposable
    {
        private readonly IMongoDatabase _database;
        private readonly INotificationService _notificationService;
        private readonly Mock<IHubContext<NotificationHub>> _mockHubContext;
        private readonly Mock<IHubClients> _mockHubClients;
        private readonly Mock<IClientProxy> _mockClientProxy;
        private readonly Mock<ILogger<NotificationService>> _mockLogger;
        private int _signalRCallCount;

        public BulkNotificationTests()
        {
            _signalRCallCount = 0;
            
            // Setup SignalR mocks
            _mockClientProxy = new Mock<IClientProxy>();
            _mockHubClients = new Mock<IHubClients>();
            _mockHubContext = new Mock<IHubContext<NotificationHub>>();
            
            // Setup client proxy with callback counting
            _mockClientProxy
                .Setup(x => x.SendCoreAsync(
                    It.IsAny<string>(),
                    It.IsAny<object[]>(),
                    It.IsAny<CancellationToken>()))
                .Callback<string, object[], CancellationToken>((method, args, token) => {
                    _signalRCallCount++;
                    _mockLogger.Object.LogInformation("SignalR message sent. Total calls: {SignalRCallCount}", _signalRCallCount);
                })
                .Returns(Task.CompletedTask);

            // Setup hub clients for user, group and all scenarios
            _mockHubClients
                .Setup(x => x.Group(It.IsAny<string>()))
                .Returns(_mockClientProxy.Object);
            _mockHubClients
                .Setup(x => x.All)
                .Returns(_mockClientProxy.Object);
            _mockHubClients
                .Setup(x => x.User(It.IsAny<string>()))
                .Returns(_mockClientProxy.Object);

            // Setup hub context
            _mockHubContext
                .Setup(x => x.Clients)
                .Returns(_mockHubClients.Object);

            // MongoDB connection
            var client = new MongoClient("mongodb+srv://200315055:asker123@mia-ime.9gv81.mongodb.net/JobTrackingDb?retryWrites=true&w=majority");
            _database = client.GetDatabase("JobTrackingDb");

            _mockLogger = new Mock<ILogger<NotificationService>>();
            
            // Updated RabbitMQ settings with only supported properties
            var rabbitSettings = Options.Create(new RabbitMQSettings
            {
                HostName = "localhost",
                UserName = "guest",
                Password = "guest",
                NotificationQueueName = "notifications_test"
            });

            _notificationService = new NotificationService(
                _database,
                _mockHubContext.Object,
                rabbitSettings,
                _mockLogger.Object
            );

            PrepareTestDatabase().Wait();
        }

       private async Task PrepareTestDatabase()
    {
        var usersCollection = _database.GetCollection<dynamic>("users");

        if (usersCollection == null)
        {
            throw new ArgumentException("The users collection is not found.");
        }

        var count = await usersCollection.CountDocumentsAsync(Builders<dynamic>.Filter.Empty);

        if (count == 0)
        {
            throw new ArgumentException("Users collection cannot be empty.");
        }
    }


        [Fact]
        public async Task Should_Send_Bulk_Notifications_To_All_Users()
        {
            // Arrange
            var users = await _database.GetCollection<dynamic>("users")
                .Find(Builders<dynamic>.Filter.Empty)
                .ToListAsync();

            Assert.NotEmpty(users); // Verify that we have users to test with

            var notifications = new List<Notification>();
            foreach (var user in users)
            {
                notifications.Add(new Notification
                {
                    UserId = user._id.ToString(),
                    Title = "Toplu Test Bildirimi",
                    Message = "Bu bir toplu test bildirim_idir.",
                    Type = NotificationType.Comment,
                    CreatedDate = DateTime.UtcNow,
                    IsRead = false
                });
            }
            _mockLogger.Object.LogInformation("Starting bulk notification test with {Count} notifications", notifications.Count);
            await _notificationService.SendBulkNotificationsAsync(notifications);
            _mockLogger.Object.LogInformation("Bulk notifications sent. Verifying results...");

            // Assert
            // MongoDB'den bildirimleri kontrol et
            var notificationCollection = _database.GetCollection<Notification>("Notifications");
            var savedNotifications = await notificationCollection
                .Find(n => n.Title == "Toplu Test Bildirimi")
                .ToListAsync();

            _mockLogger.Object.LogInformation("Found {Count} notifications in database", savedNotifications.Count);
            Assert.Equal(users.Count, savedNotifications.Count);

            // SignalR çağrısını doğrula
            Assert.True(_signalRCallCount > 0, "SignalR should have been called");

            // Temizlik
            await notificationCollection.DeleteManyAsync(
                n => n.Title == "Toplu Test Bildirimi"
            );
        }

        [Fact]
        public async Task Should_Handle_Batch_Processing()
        {
            // Arrange
            const int batchSize = 25; // Her batch'te işlenecek bildirim sayısı
            var users = await _database.GetCollection<dynamic>("users")
                .Find(Builders<dynamic>.Filter.Empty)
                .ToListAsync();

            var allNotifications = new List<Notification>();
            foreach (var user in users)
            {
                allNotifications.Add(new Notification
                {
                    UserId = user._id.ToString(),
                    Title = "Batch Test Bildirimi",
                    Message = "Bu bir batch test bildirim_idir.",
                    Type = NotificationType.TaskDeleted,
                    CreatedDate = DateTime.UtcNow,
                    IsRead = false
                });
            }
            // Act
            _mockLogger.Object.LogInformation("Starting batch processing test with {TotalCount} notifications in batches of {BatchSize}", allNotifications.Count, batchSize);
            var batches = allNotifications.Chunk(batchSize);
            var batchNumber = 1;
            foreach (var batch in batches)
            {
                _mockLogger.Object.LogInformation("Processing batch {BatchNumber} with {Count} notifications", batchNumber, batch.Count());
                await _notificationService.SendBulkNotificationsAsync(batch.ToList());
                await Task.Delay(100); // Batch'ler arasında kısa bir bekleme
                batchNumber++;
            }

            _mockLogger.Object.LogInformation("Batch processing completed. Verifying results...");
            // Assert
            var notificationCollection = _database.GetCollection<Notification>("Notifications");
            var savedNotifications = await notificationCollection
                .Find(n => n.Title == "Batch Test Bildirimi")
                .ToListAsync();

            Assert.Equal(users.Count, savedNotifications.Count);

            // Temizlik
            await notificationCollection.DeleteManyAsync(
                n => n.Title == "Batch Test Bildirimi"
            );
        }

        [Fact]
        public async Task Should_Handle_Concurrent_Notifications()
        {
            // Arrange
            var users = await _database.GetCollection<dynamic>("users")
                .Find(Builders<dynamic>.Filter.Empty)
                .ToListAsync();

            var tasks = new List<Task>();
            var notifications = users.Select(user => new Notification
            {
                UserId = user._id.ToString(),
                Title = "Concurrent Test Bildirimi",
                Message = "Bu bir eşzamanlı test bildirim_idir.",
                Type = NotificationType.TaskCompleted,
                CreatedDate = DateTime.UtcNow,
                IsRead = false
            }).ToList();

            // Act
            _mockLogger.Object.LogInformation("Starting concurrent notifications test with {Count} notifications", notifications.Count);
            foreach (var notification in notifications)
            {
                tasks.Add(_notificationService.CreateNotificationAsync(notification));
            }

            await Task.WhenAll(tasks);
            _mockLogger.Object.LogInformation("All concurrent notifications processed. Verifying results...");
            // Assert
            var notificationCollection = _database.GetCollection<Notification>("Notifications");
            var savedNotifications = await notificationCollection
                .Find(n => n.Title == "Concurrent Test Bildirimi")
                .ToListAsync();

            Assert.Equal(users.Count, savedNotifications.Count);

            // Temizlik
            await notificationCollection.DeleteManyAsync(
                n => n.Title == "Concurrent Test Bildirimi"
            );
        }

        public void Dispose()
        {
            try
            {
                // Cleanup test notifications
                var notificationCollection = _database.GetCollection<Notification>("Notifications");
                notificationCollection.DeleteMany(Builders<Notification>.Filter.Empty);
            }
            catch (Exception ex)
            {
                _mockLogger.Object.LogError(ex, "Error during test cleanup");
            }
        }
    }
}
