FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443
# Create directories needed by the application
RUN mkdir /app/keys
RUN mkdir /app/wwwroot

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
