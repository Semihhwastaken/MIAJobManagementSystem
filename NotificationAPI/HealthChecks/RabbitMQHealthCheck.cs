using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using NotificationAPI.Settings;
using RabbitMQ.Client;
using System.Net.Sockets;

namespace NotificationAPI.HealthChecks
{
    public class RabbitMQHealthCheck : IHealthCheck
    {
        private readonly RabbitMQSettings _settings;

        public RabbitMQHealthCheck(IOptions<RabbitMQSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                using var tcpClient = new TcpClient();
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(1));
                
                try
                {
                    await tcpClient.ConnectAsync(_settings.HostName, _settings.Port, cts.Token);
                }
                catch (OperationCanceledException)
                {
                    return HealthCheckResult.Unhealthy("RabbitMQ sunucusuna bağlantı zaman aşımına uğradı");
                }

                if (tcpClient.Connected)
                {
                    try
                    {
                        var factory = new ConnectionFactory
                        {
                            HostName = _settings.HostName,
                            UserName = _settings.UserName,
                            Password = _settings.Password,
                            Port = -1,
                            VirtualHost = "/",
                            RequestedConnectionTimeout = TimeSpan.FromSeconds(3)
                        };
                        
                        using var connection = factory.CreateConnection();
                        return HealthCheckResult.Healthy("RabbitMQ bağlantısı sağlıklı");
                    }
                    catch (Exception ex)
                    {
                        return HealthCheckResult.Unhealthy("RabbitMQ kimlik doğrulama başarısız", ex);
                    }
                }
                
                return HealthCheckResult.Unhealthy("RabbitMQ sunucusuna bağlanılamadı");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("RabbitMQ bağlantı kontrolü başarısız", ex);
            }
        }
    }
}