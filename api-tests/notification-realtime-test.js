#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import * as signalR from '@microsoft/signalr';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Function to validate if .env exists and has BASE_URL
function validateEnvironment() {
  const envPath = path.join(dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error(chalk.red('Error: .env file not found. Please create one with BASE_URL=your_api_url and NOTIFICATION_URL=your_notification_api_url'));
    process.exit(1);
  }
  
  if (!process.env.BASE_URL) {
    console.error(chalk.red('Error: BASE_URL not defined in .env file. Please add BASE_URL=your_api_url'));
    process.exit(1);
  }

  if (!process.env.NOTIFICATION_URL) {
    console.warn(chalk.yellow('Warning: NOTIFICATION_URL not defined in .env file. Using http://localhost:8080 as default.'));
    process.env.NOTIFICATION_URL = 'https://miajobmanagementsystem-1.onrender.com';
  }
  
  console.log(chalk.green(`Using API at: ${process.env.BASE_URL}`));
  console.log(chalk.green(`Using Notification API at: ${process.env.NOTIFICATION_URL}`));
}

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to generate a random string
function generateRandomString(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to authenticate user and get token
async function authenticateUser(username, password) {
  try {
    const baseUrl = process.env.BASE_URL;
    const authResponse = await axios({
      method: 'POST',
      url: `${baseUrl}/api/Auth/login`,
      data: { username, password },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    let userToken = null;
    let userId = null;
    
    if (authResponse.data.token) {
      userToken = authResponse.data.token;
    } else if (authResponse.data.accessToken) {
      userToken = authResponse.data.accessToken;
    } else if (authResponse.data.jwt) {
      userToken = authResponse.data.jwt; 
    } else if (authResponse.data.access_token) {
      userToken = authResponse.data.access_token;
    } else {
      // Try to find token in any property of the response
      for (const key in authResponse.data) {
        if (typeof authResponse.data[key] === 'string' && 
            authResponse.data[key].length > 20 && 
            authResponse.data[key].includes('.')) {
          userToken = authResponse.data[key];
          break;
        }
      }
    }
    
    if (!userToken) {
      throw new Error('Token not found in response');
    }
    
    // Extract user ID from the response
    if (authResponse.data.user && authResponse.data.user.id) {
      userId = authResponse.data.user.id;
    }
    
    return { token: userToken, userId };
  } catch (error) {
    console.error(chalk.red(`Authentication failed: ${error.message}`));
    throw error;
  }
}

// Function to connect to SignalR hub
async function connectToNotificationHub(token, userId) {
  try {
    const notificationUrl = process.env.NOTIFICATION_URL;
    console.log(chalk.blue(`Connecting to SignalR hub at ${notificationUrl} for user ${userId}...`));
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${notificationUrl}/notificationHub?userId=${userId}`, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // More aggressive reconnect strategy
      .build();
    
    // Set up notification handler
    connection.on("ReceiveNotification", (notification) => {
      console.log(chalk.green(`\nReceived notification: ${JSON.stringify(notification, null, 2)}`));
    });
    
    // Start the connection
    await connection.start();
    console.log(chalk.green(`Connected to SignalR hub successfully!`));
    
    // The hub automatically adds the user to the group based on the userId query parameter
    // No need to explicitly call JoinUserGroup as it doesn't exist in the hub implementation
    
    return connection;
  } catch (error) {
    console.error(chalk.red(`Failed to connect to SignalR hub: ${error.message}`));
    throw error;
  }
}

// Function to send a test notification
async function sendTestNotification(token, userId) {
  try {
    const notificationUrl = process.env.NOTIFICATION_URL;
    console.log(chalk.blue(`Sending test notification to user ${userId}...`));
    
    const response = await axios({
      method: 'POST',
      url: `${notificationUrl}/api/Notifications/test?userId=${userId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(chalk.green(`Test notification sent successfully!`));
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to send test notification: ${error.message}`));
    throw error;
  }
}

// Function to create a notification
async function createNotification(token, notification) {
  try {
    const notificationUrl = process.env.NOTIFICATION_URL;
    
    // Ensure the notification type is a number, not a string
    if (typeof notification.type === 'string') {
      const notificationTypes = {
        'Comment': 0,
        'Mention': 1,
        'TaskAssigned': 2,
        'TaskUpdated': 3,
        'TaskCompleted': 4,
        'TaskDeleted': 5,
        'TaskOverdue': 6,
        'Reminder': 7,
        'Message': 8,
        'CalendarEventCreated': 9,
        'CalendarEventUpdated': 10,
        'CalendarEventDeleted': 11
      };
      
      notification.type = notificationTypes[notification.type] || 0;
    }
    
    // Ensure dates are in the correct format
    if (notification.createdDate && !(notification.createdDate instanceof Date)) {
      notification.createdDate = new Date(notification.createdDate);
    }
    
    // Ensure required fields are present
    if (!notification.userId) {
      throw new Error('userId is required');
    }
    
    if (!notification.title) {
      throw new Error('title is required');
    }
    
    if (!notification.message) {
      throw new Error('message is required');
    }
    
    // Add retry logic for resilience
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await axios({
          method: 'POST',
          url: `${notificationUrl}/api/Notifications`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: notification,
          timeout: 10000 // 10 second timeout
        });
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Only retry on 503 Service Unavailable or network errors
        if (error.response && error.response.status === 503 || !error.response) {
          retries--;
          if (retries > 0) {
            // Exponential backoff: 1s, 2s, 4s
            const backoffTime = Math.pow(2, 3-retries) * 1000;
            console.log(chalk.yellow(`Retrying after ${backoffTime}ms (${retries} retries left)`));
            await delay(backoffTime);
            continue;
          }
        } else {
          // Don't retry other errors
          break;
        }
      }
    }
    
    // If we got here, all retries failed
    if (lastError.response) {
      throw new Error(`Request failed with status code ${lastError.response.status}`);
    } else {
      throw lastError;
    }
  } catch (error) {
    console.error(chalk.red(`Failed to create notification: ${error.message}`));
    if (error.response && error.response.data) {
      console.error(chalk.red(`Server response: ${JSON.stringify(error.response.data).substring(0, 100)}...`));
    }
    throw error;
  }
}

// Function to run real-time notification test
async function runRealtimeNotificationTest() {
  try {
    console.log(chalk.blue("\nRunning realtime notification test..."));
    
    // Get credentials from environment variables or prompt user
    const username = process.env.API_USERNAME || 'user1';
    const password = process.env.API_PASSWORD || 'password123';
    
    // Authenticate user
    console.log(chalk.blue(`Authenticating as ${username}...`));
    const { token, userId } = await authenticateUser(username, password);
    console.log(chalk.green(`Successfully authenticated as ${username}!`));
    
    // Try connecting directly to an API instance first (bypassing Nginx)
    console.log(chalk.blue(`Testing direct connection to API instance...`));
    try {
      // Try direct connection to first API instance
      const directUrl = "http://localhost:8081"; // First API instance
      console.log(chalk.yellow(`Attempting direct connection to ${directUrl}`));
      
      const directConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${directUrl}/notificationHub?userId=${userId}`, {
          accessTokenFactory: () => token,
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();
      
      // Start the connection
      await directConnection.start();
      console.log(chalk.green(`Direct connection successful! The hub is working properly.`));
      await directConnection.stop();
    } catch (directError) {
      console.error(chalk.red(`Direct connection failed: ${directError.message}`));
      console.log(chalk.yellow(`This suggests the API instance might not be exposing the hub correctly.`));
    }
    
    // Connect to SignalR hub
    console.log(chalk.blue(`Connecting to SignalR hub...`));
    const connection = await connectToNotificationHub(token, userId);
    
    // Send a test notification
    console.log(chalk.blue(`Sending test notification...`));
    await sendTestNotification(token, userId);
    
    // Wait for notification to be received
    console.log(chalk.yellow(`Waiting for notification to be received...`));
    await delay(5000);
    
    // Disconnect from hub
    console.log(chalk.blue(`Disconnecting from SignalR hub...`));
    await connection.stop();
    
    console.log(chalk.green(`Realtime notification test completed successfully!`));
  } catch (error) {
    console.error(chalk.red(`Realtime notification test failed: ${error.message}`));
  }
}

// Function to run notification load test
async function runNotificationLoadTest(userCount, notificationsPerUser) {
  try {
    const baseUrl = process.env.BASE_URL;
    console.log(chalk.blue(`\nRunning notification load test with ${userCount} users and ${notificationsPerUser} notifications per user...`));
    
    // Authenticate all users
    console.log(chalk.blue(`Authenticating ${userCount} users...`));
    const users = [];
    const hubConnections = [];
    
    for (let i = 1; i <= userCount; i++) {
      try {
        const username = `user${i}`;
        const { token, userId } = await authenticateUser(username, 'password123');
        users.push({ username, token, userId });
        
        // Only connect a subset of users to the hub to avoid connection limits
        if (i <= Math.min(10, userCount)) {
          // Connect to SignalR hub for each user
          const hubConnection = await connectToNotificationHub(token, userId);
          hubConnections.push(hubConnection);
        }
        
        // Add a small delay to avoid overwhelming the server
        await delay(300);
      } catch (error) {
        console.error(chalk.red(`Failed to authenticate user${i}: ${error.message}`));
      }
    }
    
    console.log(chalk.green(`Successfully authenticated ${users.length} users!`));
    console.log(chalk.green(`Connected ${hubConnections.length} users to SignalR hub!`));
    
    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: "Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Notifications",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });
    
    const totalNotifications = users.length * notificationsPerUser;
    progressBar.start(totalNotifications, 0);
    
    // Send notifications
    console.log(chalk.blue(`\nSending ${totalNotifications} notifications with rate limiting...`));
    
    const results = {
      totalNotifications: totalNotifications,
      successfulNotifications: 0,
      failedNotifications: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      statusCodes: {},
      errors: []
    };
    
    // Process in smaller batches to avoid overwhelming the server
    const batchSize = 10;  
    const batchDelay = 500;  
    
    // Create all notification objects first
    const allNotifications = [];
    
    // For each user, create notification objects
    for (const sender of users) {
      for (let i = 0; i < notificationsPerUser; i++) {
        // Create a random notification type (as numeric value)
        const notificationTypes = [
          { name: 'Comment', value: 0 },
          { name: 'Mention', value: 1 },
          { name: 'TaskAssigned', value: 2 },
          { name: 'TaskUpdated', value: 3 },
          { name: 'TaskCompleted', value: 4 },
          { name: 'TaskDeleted', value: 5 },
          { name: 'TaskOverdue', value: 6 },
          { name: 'Reminder', value: 7 },
          { name: 'Message', value: 8 },
          { name: 'CalendarEventCreated', value: 9 },
          { name: 'CalendarEventUpdated', value: 10 },
          { name: 'CalendarEventDeleted', value: 11 }
        ];
        const randomTypeObj = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        
        // Create notification data
        allNotifications.push({
          sender,
          notification: {
            userId: sender.userId,
            title: `Test Notification ${i + 1}`,
            message: `This is a test notification ${i + 1} from load test. Type: ${randomTypeObj.name}. Random ID: ${generateRandomString(8)}`,
            type: randomTypeObj.value, // Use numeric value
            relatedJobId: generateRandomString(24),
            isRead: false,
            createdDate: new Date().toISOString()
          }
        });
      }
    }
    
    // Process notifications in batches
    for (let i = 0; i < allNotifications.length; i += batchSize) {
      const batch = allNotifications.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(async ({ sender, notification }) => {
        try {
          const startTime = Date.now();
          
          // Send notification
          const result = await createNotification(sender.token, notification);
          
          const duration = Date.now() - startTime;
          
          // Update results
          results.successfulNotifications++;
          results.totalResponseTime += duration;
          
          if (duration < results.minResponseTime) {
            results.minResponseTime = duration;
          }
          
          if (duration > results.maxResponseTime) {
            results.maxResponseTime = duration;
          }
          
          const statusKey = '201'; // Created
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
        } catch (error) {
          results.failedNotifications++;
          
          const statusCode = error.response ? error.response.status : 0;
          const statusKey = statusCode.toString();
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
          results.errors.push({
            message: error.message,
            response: error.response ? error.response.data : null
          });
        }
        
        // Update progress
        progressBar.increment();
      }));
      
      // Add delay between batches to avoid overwhelming the server
      if (i + batchSize < allNotifications.length) {
        await delay(batchDelay);
      }
    }
    
    progressBar.stop();
    
    // Calculate average response time
    results.avgResponseTime = results.totalResponseTime / results.successfulNotifications;
    
    // Clean up minimum response time if no successful requests
    if (results.minResponseTime === Number.MAX_SAFE_INTEGER) {
      results.minResponseTime = 0;
    }
    
    // Wait for notifications to be processed
    console.log(chalk.yellow(`\nWaiting for notifications to be processed...`));
    await delay(5000);
    
    // Disconnect all hub connections
    console.log(chalk.blue(`Disconnecting from SignalR hubs...`));
    for (const connection of hubConnections) {
      await connection.stop();
    }
    
    return results;
  } catch (error) {
    console.error(chalk.red(`Notification load test failed: ${error.message}`));
    return {
      error: error.message,
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0
    };
  }
}

// Function to run high volume notification load test
async function runHighVolumeNotificationTest(userCount, notificationsPerUser) {
  try {
    const baseUrl = process.env.BASE_URL;
    console.log(chalk.blue(`\nRunning high volume notification load test with ${userCount} users and ${notificationsPerUser} notifications per user...`));
    
    // Authenticate all users concurrently
    console.log(chalk.blue(`Authenticating ${userCount} users concurrently...`));
    const users = [];
    const hubConnections = [];
    
    // Create a progress bar for authentication
    const authProgressBar = new cliProgress.SingleBar({
      format: "Authentication Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Users",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });
    
    authProgressBar.start(userCount, 0);
    
    // Create batches of users to authenticate concurrently
    // This allows for truly concurrent authentication instead of sequential
    const concurrentBatchSize = 20; // Authenticate 20 users at a time
    
    for (let batchStart = 1; batchStart <= userCount; batchStart += concurrentBatchSize) {
      const batchEnd = Math.min(batchStart + concurrentBatchSize - 1, userCount);
      const authPromises = [];
      
      // Create promises for each user in the batch
      for (let i = batchStart; i <= batchEnd; i++) {
        authPromises.push((async () => {
          try {
            const username = `user${i}`;
            const { token, userId } = await authenticateUser(username, 'password123');
            users.push({ username, token, userId });
            
            // Only connect a subset of users to the hub to avoid connection limits
            if (users.length <= Math.min(10, userCount)) {
              // Connect to SignalR hub for each user
              try {
                const hubConnection = await connectToNotificationHub(token, userId);
                hubConnections.push(hubConnection);
              } catch (hubError) {
                console.error(chalk.red(`Failed to connect user${i} to SignalR hub: ${hubError.message}`));
              }
            }
          } catch (error) {
            console.error(chalk.red(`Failed to authenticate user${i}: ${error.message}`));
          } finally {
            // Update progress regardless of success or failure
            authProgressBar.increment();
          }
        })());
      }
      
      // Wait for all authentications in this batch to complete
      await Promise.all(authPromises);
    }
    
    authProgressBar.stop();
    
    console.log(chalk.green(`Successfully authenticated ${users.length} users!`));
    console.log(chalk.green(`Connected ${hubConnections.length} users to SignalR hub!`));
    
    // Create progress bar for notifications
    const progressBar = new cliProgress.SingleBar({
      format: "Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Notifications",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });
    
    const totalNotifications = users.length * notificationsPerUser;
    progressBar.start(totalNotifications, 0);
    
    // Send notifications
    console.log(chalk.blue(`\nSending ${totalNotifications} notifications with rate limiting...`));
    
    const results = {
      totalNotifications: totalNotifications,
      successfulNotifications: 0,
      failedNotifications: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      statusCodes: {},
      errors: []
    };
    
    // Process in smaller batches to avoid overwhelming the server
    const batchSize = 3;  
    const batchDelay = 2000;  
    
    // Create all notification objects first
    const allNotifications = [];
    
    // For each user, create notification objects
    for (const sender of users) {
      for (let i = 0; i < notificationsPerUser; i++) {
        // Create a random notification type (as numeric value)
        const notificationTypes = [
          { name: 'Comment', value: 0 },
          { name: 'Mention', value: 1 },
          { name: 'TaskAssigned', value: 2 },
          { name: 'TaskUpdated', value: 3 },
          { name: 'TaskCompleted', value: 4 },
          { name: 'TaskDeleted', value: 5 },
          { name: 'TaskOverdue', value: 6 },
          { name: 'Reminder', value: 7 },
          { name: 'Message', value: 8 },
          { name: 'CalendarEventCreated', value: 9 },
          { name: 'CalendarEventUpdated', value: 10 },
          { name: 'CalendarEventDeleted', value: 11 }
        ];
        const randomTypeObj = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        
        // Create notification data
        allNotifications.push({
          sender,
          notification: {
            userId: sender.userId,
            title: `Test Notification ${i + 1}`,
            message: `This is a test notification ${i + 1} from load test. Type: ${randomTypeObj.name}. Random ID: ${generateRandomString(8)}`,
            type: randomTypeObj.value, // Use numeric value
            relatedJobId: generateRandomString(24),
            isRead: false,
            createdDate: new Date().toISOString()
          }
        });
      }
    }
    
    // Process notifications in batches
    for (let i = 0; i < allNotifications.length; i += batchSize) {
      const batch = allNotifications.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(async ({ sender, notification }) => {
        try {
          const startTime = Date.now();
          
          // Send notification
          const result = await createNotification(sender.token, notification);
          
          const duration = Date.now() - startTime;
          
          // Update results
          results.successfulNotifications++;
          results.totalResponseTime += duration;
          
          if (duration < results.minResponseTime) {
            results.minResponseTime = duration;
          }
          
          if (duration > results.maxResponseTime) {
            results.maxResponseTime = duration;
          }
          
          const statusKey = '201'; // Created
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
        } catch (error) {
          results.failedNotifications++;
          
          const statusCode = error.response ? error.response.status : 0;
          const statusKey = statusCode.toString();
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
          results.errors.push({
            message: error.message,
            response: error.response ? error.response.data : null
          });
        }
        
        // Update progress
        progressBar.increment();
      }));
      
      // Add delay between batches to avoid overwhelming the server
      if (i + batchSize < allNotifications.length) {
        await delay(batchDelay);
      }
    }
    
    progressBar.stop();
    
    // Calculate average response time
    results.avgResponseTime = results.totalResponseTime / results.successfulNotifications;
    
    // Clean up minimum response time if no successful requests
    if (results.minResponseTime === Number.MAX_SAFE_INTEGER) {
      results.minResponseTime = 0;
    }
    
    // Wait for notifications to be processed
    console.log(chalk.yellow(`\nWaiting for notifications to be processed...`));
    await delay(5000);
    
    // Disconnect all hub connections
    console.log(chalk.blue(`Disconnecting from SignalR hubs...`));
    for (const connection of hubConnections) {
      await connection.stop();
    }
    
    return results;
  } catch (error) {
    console.error(chalk.red(`High volume notification load test failed: ${error.message}`));
    return {
      error: error.message,
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0
    };
  }
}

// Function to display test results
function displayResults(results) {
  console.log(chalk.green('\n=== Test Results ==='));
  console.log(chalk.blue(`Total Notifications: ${results.totalNotifications}`));
  console.log(chalk.green(`Successful Notifications: ${results.successfulNotifications}`));
  console.log(chalk.red(`Failed Notifications: ${results.failedNotifications}`));
  
  if (results.successfulNotifications > 0) {
    console.log(chalk.blue(`Min Response Time: ${results.minResponseTime}ms`));
    console.log(chalk.blue(`Max Response Time: ${results.maxResponseTime}ms`));
    console.log(chalk.blue(`Avg Response Time: ${Math.round(results.avgResponseTime)}ms`));
  }
  
  console.log(chalk.yellow('\nStatus Code Distribution:'));
  for (const [statusCode, count] of Object.entries(results.statusCodes)) {
    const color = statusCode.startsWith('2') ? chalk.green : 
                  statusCode.startsWith('4') ? chalk.red : 
                  statusCode.startsWith('5') ? chalk.magenta : chalk.blue;
    
    console.log(color(`  ${statusCode}: ${count} notifications`));
  }
  
  if (results.failedNotifications > 0) {
    console.log(chalk.red('\nError Summary:'));
    
    // Group errors by message
    const errorGroups = {};
    for (const error of results.errors) {
      if (!errorGroups[error.message]) {
        errorGroups[error.message] = [];
      }
      errorGroups[error.message].push(error);
    }
    
    for (const [message, errors] of Object.entries(errorGroups)) {
      console.log(chalk.red(`  ${message} (${errors.length} occurrences)`));
    }
  }
}

// Main function
async function main() {
  console.log(chalk.blue('=== Notification System Test ==='));
  
  // Validate environment
  validateEnvironment();
  
  // Main menu loop
  let continueTestingFlag = true;
  
  while (continueTestingFlag) {
    const { testType } = await inquirer.prompt([{
      type: "list",
      name: "testType",
      message: "Select test type:",
      choices: [
        "Real-time Notification Test",
        "Notification Load Test",
        "High Volume Load Test (500+ Users)",
        "Exit"
      ]
    }]);
    
    if (testType === "Exit") {
      break;
    }
    
    if (testType === "Real-time Notification Test") {
      console.log(chalk.blue('\nRunning real-time notification test...'));
      const success = await runRealtimeNotificationTest();
      
      if (success) {
        console.log(chalk.green('\nReal-time notification test completed successfully!'));
      } else {
        console.log(chalk.red('\nReal-time notification test failed.'));
      }
    } else if (testType === "Notification Load Test") {
      const { userCount } = await inquirer.prompt([{
        type: "list",
        name: "userCount",
        message: "Select number of users:",
        choices: ["5", "10", "20", "50", "100", "Back"]
      }]);
      
      if (userCount === "Back") {
        continue;
      }
      
      const { notificationsPerUser } = await inquirer.prompt([{
        type: "list",
        name: "notificationsPerUser",
        message: "Select notifications per user:",
        choices: ["1", "5", "10", "20", "50", "Back"]
      }]);
      
      if (notificationsPerUser === "Back") {
        continue;
      }
      
      console.log(chalk.blue('\nRunning notification load test...'));
      const results = await runNotificationLoadTest(parseInt(userCount), parseInt(notificationsPerUser));
      
      displayResults(results);
    } else if (testType === "High Volume Load Test (500+ Users)") {
      console.log(chalk.yellow('\nWARNING: High volume tests can put significant load on your system.'));
      console.log(chalk.yellow('Make sure your server is properly configured to handle this load.'));
      
      const { confirm } = await inquirer.prompt([{
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to proceed with high volume testing?",
        default: false
      }]);
      
      if (!confirm) {
        continue;
      }
      
      const { userCount } = await inquirer.prompt([{
        type: "list",
        name: "userCount",
        message: "Select number of users for high volume test:",
        choices: ["200", "500", "750", "1000", "Back"]
      }]);
      
      if (userCount === "Back") {
        continue;
      }
      
      const { notificationsPerUser } = await inquirer.prompt([{
        type: "list",
        name: "notificationsPerUser",
        message: "Select notifications per user (be careful with high values):",
        choices: ["1", "2", "5", "10", "Back"]
      }]);
      
      if (notificationsPerUser === "Back") {
        continue;
      }
      
      console.log(chalk.blue('\nRunning high volume notification test...'));
      console.log(chalk.yellow('This test will use a more aggressive batching strategy to avoid overwhelming the server.'));
      
      // Use smaller batch size and longer delays for high volume tests
      const results = await runHighVolumeNotificationTest(parseInt(userCount), parseInt(notificationsPerUser));
      
      displayResults(results);
    }
    
    // Ask if user wants to continue testing
    const { action } = await inquirer.prompt([{
      type: "list",
      name: "action",
      message: "What would you like to do next?",
      choices: ["Run Another Test", "Exit"]
    }]);
    
    if (action === "Exit") {
      continueTestingFlag = false;
    }
  }
  
  console.log(chalk.green("\nThank you for using Notification System Test!"));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  process.exit(1);
});
