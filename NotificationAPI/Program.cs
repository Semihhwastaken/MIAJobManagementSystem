using NotificationAPI.Settings;
using NotificationAPI.Services;
using NotificationAPI.Hubs;
using MongoDB.Driver;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using NotificationAPI.HealthChecks;
using RabbitMQ.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

builder.Services.Configure<RabbitMQSettings>(
    builder.Configuration.GetSection("RabbitMQSettings"));

// MongoDB bağlantısını daha dayanıklı hale getir
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = builder.Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>()
        ?? throw new InvalidOperationException("MongoDbSettings configuration is missing.");

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
    var settings = builder.Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>()
        ?? throw new InvalidOperationException("MongoDbSettings configuration is missing.");
    return mongoClient.GetDatabase(settings.DatabaseName);
});

builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddHostedService<NotificationBackgroundService>();

// Configure CORS policy for dynamic origins
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
               {
                   // Allow Vercel preview deployments, localhost, and the production domain
                   return origin.EndsWith(".vercel.app") ||
                          origin.Contains("localhost") ||
                          origin.EndsWith("miajobmanagement.com");
               })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Important for SignalR
    });
});

// URL yapılandırmasını ekle
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxConcurrentConnections = 1000;
    serverOptions.Limits.MaxConcurrentUpgradedConnections = 1000;
    serverOptions.Limits.Http2.MaxStreamsPerConnection = 100;
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);

    // Use command line args to set different ports for each instance
    var port = args.Length > 0 ? int.Parse(args[0]) : 8080;
    serverOptions.ListenAnyIP(port, configure => configure.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2);
});

// Explicitly set URLs to HTTP only
var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://*:8080";
builder.WebHost.UseUrls(urls);

// SignalR ve diğer servisler
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at http://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();

// Daha detaylı Swagger yapılandırması
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Notification API",
        Version = "v1",
        Description = "API for managing notifications in the task management system"
    });
});

// Sağlık kontrolleri ekle
builder.Services.AddHealthChecks()
    .AddCheck<MongoDbHealthCheck>("mongodb")
    .AddCheck<RabbitMQHealthCheck>("rabbitmq");

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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured")))
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

// Rate limiting ekle
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                QueueLimit = 50,
                Window = TimeSpan.FromSeconds(10)
            }));
});

// Response caching ekle
builder.Services.AddResponseCaching();
builder.Services.AddMemoryCache();

// MongoDB bağlantı havuzu ayarları
builder.Services.Configure<MongoClientSettings>(settings =>
{
    settings.MaxConnectionPoolSize = 1000;
    settings.MinConnectionPoolSize = 10;
    settings.MaxConnecting = 20;
});

// Add Redis for distributed caching
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "NotificationAPI_";
});

// Optimize RabbitMQ connection
builder.Services.AddSingleton<IConnectionFactory>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<RabbitMQSettings>>().Value;
    return new ConnectionFactory
    {
        HostName = settings.HostName,
        UserName = settings.UserName,
        Password = settings.Password,
        Port = settings.Port,
        VirtualHost = settings.VirtualHost,
        DispatchConsumersAsync = true,
        RequestedChannelMax = 10,
        RequestedConnectionTimeout = TimeSpan.FromSeconds(30),
        AutomaticRecoveryEnabled = true,
        NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline.
// Swagger'ı hem Development hem de Production modunda etkinleştir
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Notification API V1");
    c.RoutePrefix = "swagger"; // Keep swagger UI at /swagger
});



// Use the specific CORS policy
app.UseCors("AllowFrontend"); // Apply the dynamic CORS policy

app.UseRateLimiter();
app.UseResponseCaching();

app.UseRouting(); // Routing must come after CORS

// Authentication & Authorization must come after UseRouting
app.UseAuthentication(); // Ensure Authentication is added if needed by SignalR/Controllers
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/notificationHub");
app.MapHealthChecks("/health");

app.Run();
