FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
# Gerekli dizinleri oluştur
RUN mkdir -p /app/keys
RUN mkdir -p /app/wwwroot/uploads

# Render'ın doğrudan port eşlemesi için
ENV ASPNETCORE_URLS=http://+:$PORT
# Default port (eğer PORT değişkeni yoksa)
ENV PORT=8080
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["JobTrackingAPI.csproj", "./"]
RUN dotnet restore "JobTrackingAPI.csproj"
COPY . .
RUN dotnet build "JobTrackingAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "JobTrackingAPI.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "JobTrackingAPI.dll"]
