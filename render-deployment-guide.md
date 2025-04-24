# Deploying Backend Services to Render.com

This guide explains how to deploy your JobTrackingAPI and NotificationAPI services to Render.com.

## Prerequisites

- A Render.com account
- MongoDB Atlas account (for database)
- (Optional) CloudAMQP or another RabbitMQ provider
- (Optional) Redis provider if required for NotificationAPI

## Deployment Steps

### 1. Create a Web Service for JobTrackingAPI

1. Log in to your Render.com dashboard
2. Click on the "New" button and select "Web Service"
3. Choose "Build and deploy from a Git repository"
4. Connect your GitHub/GitLab repository
5. Configure the service:

   - Name: `job-tracking-api`
   - Root Directory: `JobTrackingAPI`
   - Runtime Environment: `Docker`
   - Instance Type: Start with "Free"
   - Region: Choose the closest to your users (e.g., Frankfurt)
   - Branch: `main` (or your production branch)
   - Auto-Deploy: Enable

6. Add the following environment variables:

   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://+:$PORT
   MongoDbSettings__ConnectionString=mongodb+srv://username:password@your-cluster.mongodb.net/JobTrackingDb?retryWrites=true&w=majority
   MongoDbSettings__DatabaseName=JobTrackingDb
   JwtSettings__Secret=your-256-bit-secret
   EmailSettings__SmtpServer=smtp.gmail.com
   EmailSettings__SmtpPort=587
   EmailSettings__SmtpUsername=your-email@gmail.com
   EmailSettings__SmtpPassword=your-app-password
   StripeSettings__SecretKey=your-stripe-secret-key
   StripeSettings__PublishableKey=your-stripe-publishable-key
   StripeSettings__WebhookSecret=your-stripe-webhook-secret
   StripeSettings__ProPlanPriceId=price-id-for-pro-plan
   StripeSettings__EnterprisePlanPriceId=price-id-for-enterprise-plan
   ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
   ```

7. Click "Create Web Service"

### 2. Create a Web Service for NotificationAPI

1. Click on the "New" button and select "Web Service"
2. Choose "Build and deploy from a Git repository"
3. Select your repository
4. Configure the service:

   - Name: `notification-api`
   - Root Directory: `NotificationAPI`
   - Runtime Environment: `Docker`
   - Instance Type: Start with "Free"
   - Region: Choose the closest to your users (e.g., Frankfurt)
   - Branch: `main` (or your production branch)
   - Auto-Deploy: Enable

5. Add the following environment variables:

   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://+:$PORT
   MongoDbSettings__ConnectionString=mongodb+srv://username:password@your-cluster.mongodb.net/NotificationsDb?retryWrites=true&w=majority
   MongoDbSettings__DatabaseName=NotificationsDb
   JwtSettings__Secret=same-secret-as-job-tracking-api
   RabbitMQ__Host=your-rabbitmq-host.cloudamqp.com
   RabbitMQ__Username=your-rabbitmq-username
   RabbitMQ__Password=your-rabbitmq-password
   Redis__ConnectionString=your-redis-connection-string
   ```

6. Click "Create Web Service"

### 3. Update Frontend Configuration

After both services are deployed, update your frontend application's configuration to use the new API URLs:

1. Update the Vercel environment variables for your frontend:
   - API_URL=https://job-tracking-api.onrender.com
   - NOTIFICATION_API_URL=https://notification-api.onrender.com

### 4. Important Notes for Render Deployment

1. **Port Configuration**:

   - Render automatically assigns a port via the `PORT` environment variable
   - The `ASPNETCORE_URLS=http://+:$PORT` environment variable ensures your app listens on the correct port

2. **Database Connection**:

   - Make sure your MongoDB Atlas IP whitelist allows connections from all IPs (`0.0.0.0/0`) or from Render's IP ranges

3. **CORS Configuration**:

   - Update your allowed origins to include your frontend domain deployed on Vercel

4. **Health Checks**:

   - NotificationAPI already includes health checks, which Render will use to verify the service is running

5. **Free Tier Limitations**:
   - Services on the free tier will spin down after 15 minutes of inactivity
   - The first request after inactivity might take up to 30 seconds to respond

## Troubleshooting

- **Deployment Failures**: Check the build logs in Render dashboard
- **Connection Issues**: Verify all connection strings and credentials
- **CORS Errors**: Make sure ALLOWED_ORIGINS includes your frontend domain
- **Performance Issues**: Consider upgrading from the free tier for production use

## Monitoring

- Monitor your service health from the Render dashboard
- Set up logging to a third-party service for better observability
