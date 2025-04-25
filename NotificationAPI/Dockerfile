FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Sağlık kontrolü ve RabbitMQ bağlantı kontrolü için gerekli araçları yükle
RUN apt-get update && apt-get install -y curl netcat-openbsd && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Önce sadece proje dosyasını kopyala ve bağımlılıkları yükle
# Bu, Docker katmanlarını daha iyi önbelleğe alır
COPY ["NotificationAPI.csproj", "./"]
RUN dotnet restore "NotificationAPI.csproj"

# Tüm paketleri ekle
RUN dotnet add package RabbitMQ.Client --version 6.5.0
RUN dotnet add package Polly --version 8.3.0
RUN dotnet add package Serilog.AspNetCore --version 9.0.0
RUN dotnet add package Serilog.Sinks.Console --version 5.0.1
RUN dotnet add package Serilog.Sinks.File --version 5.0.0
RUN dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.10

# Kaynak kodları kopyala ve derle
COPY . .
RUN dotnet build "NotificationAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "NotificationAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Ortam değişkenleri
ENV ASPNETCORE_URLS=http://+:80
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# RabbitMQ bağlantı ayarları için varsayılan değişkenler
ENV RabbitMQ__HostName=notification-rabbitmq
ENV RabbitMQ__UserName=guest
ENV RabbitMQ__Password=guest
ENV RabbitMQ__Port=5672
ENV RabbitMQ__ConnectionRetryCount=10
ENV RabbitMQ__ConnectionRetryDelaySeconds=5

# Başlangıç komutunu değiştir
ENTRYPOINT ["/app/start.sh"]
