using NotificationAPI.Settings;
using NotificationAPI.Services;
using NotificationAPI.Hubs;
using MongoDB.Driver;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Net.Sockets;
using RabbitMQ.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

builder.Services.Configure<RabbitMQSettings>(
    builder.Configuration.GetSection("RabbitMQSettings"));

// MongoDB bağlantısını daha dayanıklı hale getir
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = builder.Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>();
    
    var mongoSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);
    mongoSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
    mongoSettings.ConnectTimeout = TimeSpan.FromSeconds(10);
    mongoSettings.RetryWrites = true;
    mongoSettings.RetryReads = true;
    
    return new MongoClient(mongoSettings);
});

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var mongoClient = sp.GetRequiredService<IMongoClient>();
    var settings = builder.Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>();
    return mongoClient.GetDatabase(settings.DatabaseName);
});

builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddHostedService<NotificationBackgroundService>();

// CORS politikasını yapılandır
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader());
});

// SignalR ve diğer servisler
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();

// Daha detaylı Swagger yapılandırması
builder.Services.ConfigureSwaggerGen(options => {
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Notification API",
        Version = "v1",
        Description = "API for managing notifications in the task management system"
    });
});

builder.Services.AddSwaggerGen();

// Sağlık kontrolleri ekle
builder.Services.AddHealthChecks()
    .AddCheck("mongodb", () => 
    {
        try
        {
            var mongoClient = builder.Services.BuildServiceProvider().GetRequiredService<IMongoClient>();
            mongoClient.GetDatabase("admin").RunCommand<dynamic>(new MongoDB.Bson.BsonDocument("ping", 1));
            return HealthCheckResult.Healthy("MongoDB bağlantısı sağlıklı");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MongoDB bağlantısı başarısız", ex);
        }
    })
    .AddCheck("rabbitmq", () => 
    {
        try
        {
            var rabbitSettings = builder.Configuration.GetSection("RabbitMQSettings").Get<RabbitMQSettings>();
            using var tcpClient = new TcpClient();
            var connectResult = tcpClient.BeginConnect(rabbitSettings.HostName, rabbitSettings.Port, null, null);
            var success = connectResult.AsyncWaitHandle.WaitOne(TimeSpan.FromSeconds(1));
            
            if (success)
            {
                try
                {
                    var factory = new ConnectionFactory
                    {
                        HostName = rabbitSettings.HostName,
                        UserName = rabbitSettings.UserName,
                        Password = rabbitSettings.Password,
                        Port = rabbitSettings.Port,
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
    });

// Kimlik doğrulamayı ekle
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/notificationHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Serilog yapılandırması
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

// Configure the HTTP request pipeline.
// Swagger'ı hem Development hem de Production modunda etkinleştir
app.UseSwagger();
app.UseSwaggerUI(c => {
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Notification API V1");
    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();
app.UseCors("AllowAll");

// Kimlik doğrulamayı pipeline'a ekle
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/notificationHub");
app.MapHealthChecks("/health");

app.Run();
