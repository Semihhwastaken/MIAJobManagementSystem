#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import ora from 'ora';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Function to validate if .env exists and has BASE_URL
function validateEnvironment() {
  const envPath = path.join(dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error(chalk.red('Error: .env file not found. Please create one with BASE_URL=your_api_url'));
    process.exit(1);
  }
  
  if (!process.env.BASE_URL) {
    console.error(chalk.red('Error: BASE_URL not defined in .env file. Please add BASE_URL=your_api_url'));
    process.exit(1);
  }
  
  console.log(chalk.green(`Using API at: ${process.env.BASE_URL}`));
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

// Function to generate random message content
function generateRandomMessage(length = 50) {
  const words = [
    'task', 'project', 'deadline', 'meeting', 'report', 'client', 'team', 'update',
    'status', 'progress', 'review', 'feedback', 'priority', 'schedule', 'resource',
    'budget', 'timeline', 'milestone', 'goal', 'objective', 'strategy', 'plan',
    'implementation', 'development', 'testing', 'deployment', 'maintenance', 'support',
    'issue', 'risk', 'challenge', 'solution', 'opportunity', 'success', 'failure',
    'improvement', 'innovation', 'efficiency', 'productivity', 'quality', 'performance'
  ];
  
  let message = '';
  const messageLength = Math.floor(Math.random() * length) + 20; // At least 20 words
  
  for (let i = 0; i < messageLength; i++) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    message += randomWord + ' ';
    
    // Add some punctuation occasionally
    if (i > 0 && i % 8 === 0) {
      message = message.trim() + '. ';
    } else if (i > 0 && i % 4 === 0) {
      message = message.trim() + ', ';
    }
  }
  
  return message.trim();
}

// Function to run multi-user message sending test
async function runMultiUserMessageTest(userCount, endpoint, messageType) {
  const baseUrl = process.env.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  
  console.log(chalk.blue(`\nRunning multi-user message sending test with ${chalk.bold(userCount)} users`));
  console.log(chalk.gray(`Each user will send messages to other users simultaneously`));
  console.log(chalk.gray(`Message type: ${messageType}`));
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    avgResponseTime: 0,
    totalResponseTime: 0,
    statusCodes: {},
    userResults: {} // Track results per user
  };
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: "Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Messages",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true
  });
  
  // Calculate total number of messages to be sent
  // Each user will send messages to all other users
  const totalMessages = userCount * (userCount - 1);
  progressBar.start(totalMessages, 0);
  
  // First, test a single login to debug authentication issues
  try {
    const testUsername = "user1";
    const testPassword = "password123";
    console.log(chalk.yellow(`Testing authentication with ${testUsername}...`));
    
    const testAuthResponse = await axios({
      method: 'POST',
      url: `${baseUrl}/api/Auth/login`,
      data: { username: testUsername, password: testPassword },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(chalk.green(`Authentication successful for test user. Response status: ${testAuthResponse.status}`));
    console.log(chalk.gray(`Response data structure: ${JSON.stringify(Object.keys(testAuthResponse.data))}`));
    
    // Check token structure
    if (testAuthResponse.data.token) {
      console.log(chalk.green(`Found token in response.data.token`));
    } else if (testAuthResponse.data.accessToken) {
      console.log(chalk.green(`Found token in response.data.accessToken`));
    } else if (testAuthResponse.data.jwt) {
      console.log(chalk.green(`Found token in response.data.jwt`));
    } else if (testAuthResponse.data.access_token) {
      console.log(chalk.green(`Found token in response.data.access_token`));
    } else {
      console.log(chalk.red(`Warning: Could not identify token in response. Full response data:`));
      console.log(JSON.stringify(testAuthResponse.data, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`Authentication test failed: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
      console.log(chalk.red(`Response data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    console.log(chalk.yellow(`Continuing with full test despite authentication test failure...`));
  }
  
  // Get user IDs first by authenticating all users
  const userTokens = {};
  const userIds = {};
  
  console.log(chalk.blue(`\nAuthenticating ${userCount} users...`));
  for (let userIndex = 1; userIndex <= userCount; userIndex++) {
    const username = `user${userIndex}`;
    const password = "password123";
    
    try {
      const authResponse = await axios({
        method: 'POST',
        url: `${baseUrl}/api/Auth/login`,
        data: { username, password },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      let userToken = null;
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
      
      userTokens[username] = userToken;
      
      // Extract user ID from the response
      if (authResponse.data.user && authResponse.data.user.id) {
        userIds[username] = authResponse.data.user.id;
      }
      
    } catch (error) {
      console.log(chalk.red(`Failed to authenticate ${username}: ${error.message}`));
    }
  }
  
  // Start message sending
  const messagePromises = [];
  
  // For each user, send messages to all other users
  for (let senderIndex = 1; senderIndex <= userCount; senderIndex++) {
    const senderUsername = `user${senderIndex}`;
    const senderToken = userTokens[senderUsername];
    const senderId = userIds[senderUsername];
    
    if (!senderToken || !senderId) {
      console.log(chalk.red(`Skipping ${senderUsername} as authentication failed`));
      continue;
    }
    
    for (let receiverIndex = 1; receiverIndex <= userCount; receiverIndex++) {
      // Don't send messages to self
      if (receiverIndex === senderIndex) continue;
      
      const receiverUsername = `user${receiverIndex}`;
      const receiverId = userIds[receiverUsername];
      
      if (!receiverId) {
        console.log(chalk.red(`Skipping message to ${receiverUsername} as user ID not found`));
        continue;
      }
      
      messagePromises.push((async () => {
        try {
          // Prepare message data based on message type
          let messageData;
          
          switch (messageType) {
            case 'Basic Message':
              messageData = {
                receiverId: receiverId,
                content: `Test message from ${senderUsername} to ${receiverUsername}`,
                subject: `Test Message ${generateRandomString(4)}`
              };
              break;
              
            case 'Long Message':
              messageData = {
                receiverId: receiverId,
                content: generateRandomMessage(100),
                subject: `Performance Test Message ${generateRandomString(4)}`
              };
              break;
              
            case 'Message with Special Characters':
              messageData = {
                receiverId: receiverId,
                content: `Test message with special characters: !@#$%^&*()_+{}|:<>?~\`-=[]\\;',./\" from ${senderUsername}`,
                subject: `Special Characters Test ${generateRandomString(4)}`
              };
              break;
              
            default:
              messageData = {
                receiverId: receiverId,
                content: `Test message from ${senderUsername} to ${receiverUsername}`,
                subject: `Test Message ${generateRandomString(4)}`
              };
          }
          
          const startTime = Date.now();
          
          // Send the message
          const messageEndpoint = endpoint.replace('{senderId}', senderId);
          const messageResponse = await axios({
            method: 'POST',
            url: `${baseUrl}${messageEndpoint}`,
            headers: {
              'Authorization': `Bearer ${senderToken}`,
              'Content-Type': 'application/json'
            },
            data: messageData
          });

          console.log(messageResponse.data);
          
          
          const duration = Date.now() - startTime;
          
          // Update results
          results.totalRequests++;
          results.successfulRequests++;
          results.totalResponseTime += duration;
          
          if (duration < results.minResponseTime) {
            results.minResponseTime = duration;
          }
          
          if (duration > results.maxResponseTime) {
            results.maxResponseTime = duration;
          }
          
          const statusKey = messageResponse.status.toString();
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
          // Store individual message result
          const messageKey = `${senderUsername}_to_${receiverUsername}`;
          results.userResults[messageKey] = {
            success: true,
            duration,
            statusCode: messageResponse.status,
            messageId: messageResponse.data.id || messageResponse.data.messageId || null
          };
          
        } catch (error) {
          results.totalRequests++;
          results.failedRequests++;
          
          const statusCode = error.response ? error.response.status : 0;
          const duration = 0; // Can't measure duration for failed requests
          
          const statusKey = statusCode.toString();
          results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
          
          // Store individual message result with error details
          const messageKey = `${senderUsername}_to_${receiverUsername}`;
          results.userResults[messageKey] = {
            success: false,
            statusCode,
            error: error.message,
            response: error.response ? error.response.data : null,
            fullError: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers,
              config: {
                url: error.response.config.url,
                method: error.response.config.method,
                headers: error.response.config.headers,
                data: error.response.config.data
              }
            } : null
          };
          
          // Log the first few 500 errors in detail for debugging
          if (statusCode === 500 && results.failedRequests <= 3) {
            console.log(chalk.red(`\n[ERROR] 500 Internal Server Error for ${messageKey}:`));
            console.log(chalk.gray(`Request URL: ${error.response?.config?.url}`));
            console.log(chalk.gray(`Request Data: ${JSON.stringify(error.response?.config?.data)}`));
            console.log(chalk.gray(`Response: ${JSON.stringify(error.response?.data)}`));
          }
          
          // Update progress
          progressBar.increment();
          
          // Add a small delay to avoid overwhelming the server
          await delay(50);
        }
        
        // Update progress
        progressBar.increment();
        
        // Add a small delay to avoid overwhelming the server
        await delay(50);
      })());
    }
  }
  
  // Wait for all messages to be sent
  await Promise.all(messagePromises);
  
  progressBar.stop();
  
  // Calculate average response time
  results.avgResponseTime = results.totalResponseTime / results.successfulRequests;
  
  // Clean up minimum response time if no successful requests
  if (results.minResponseTime === Number.MAX_SAFE_INTEGER) {
    results.minResponseTime = 0;
  }
  
  return results;
}

// Function to display test results in a table
function displayResults(results, method, endpoint, userCount, messageType) {
  console.log(chalk.green('\n=== Test Results ==='));
  console.log(chalk.blue(`Endpoint: ${method} ${endpoint}`));
  console.log(chalk.blue(`User Count: ${userCount}`));
  console.log(chalk.blue(`Message Type: ${messageType}`));
  console.log(chalk.blue(`Total Messages: ${results.totalRequests}`));
  console.log(chalk.green(`Successful Messages: ${results.successfulRequests}`));
  console.log(chalk.red(`Failed Messages: ${results.failedRequests}`));
  console.log(chalk.blue(`Min Response Time: ${results.minResponseTime}ms`));
  console.log(chalk.blue(`Max Response Time: ${results.maxResponseTime}ms`));
  console.log(chalk.blue(`Avg Response Time: ${Math.round(results.avgResponseTime)}ms`));
  
  console.log(chalk.yellow('\nStatus Code Distribution:'));
  for (const [statusCode, count] of Object.entries(results.statusCodes)) {
    const color = statusCode.startsWith('2') ? chalk.green : 
                  statusCode.startsWith('4') ? chalk.red : 
                  statusCode.startsWith('5') ? chalk.magenta : chalk.blue;
    
    console.log(color(`  ${statusCode}: ${count} requests`));
  }
  
  // Display error details for failed requests
  if (results.failedRequests > 0) {
    console.log(chalk.red('\nError Details for Failed Requests:'));
    
    // Group errors by error message to avoid repetition
    const errorGroups = {};
    
    for (const [messageKey, result] of Object.entries(results.userResults)) {
      if (!result.success) {
        const errorMessage = result.response?.message || result.error;
        if (!errorGroups[errorMessage]) {
          errorGroups[errorMessage] = [];
        }
        errorGroups[errorMessage].push(messageKey);
      }
    }
    
    // Display grouped errors
    for (const [errorMessage, messageKeys] of Object.entries(errorGroups)) {
      console.log(chalk.red(`  Error: ${errorMessage}`));
      console.log(chalk.yellow(`  Affected messages (${messageKeys.length}): ${messageKeys.slice(0, 5).join(', ')}${messageKeys.length > 5 ? ` and ${messageKeys.length - 5} more...` : ''}`));
      
      // Show full error response for the first message in each group
      const firstMessageKey = messageKeys[0];
      const errorResponse = results.userResults[firstMessageKey].response;
      if (errorResponse && typeof errorResponse === 'object') {
        console.log(chalk.gray(`  Full error response: ${JSON.stringify(errorResponse, null, 2)}`));
      }
      console.log();
    }
  }
}

// Main function
async function main() {
  console.log(chalk.blue('=== Multi-User Message Sending Test ==='));
  
  // Validate environment
  validateEnvironment();
  
  // Main menu loop
  let continueTestingFlag = true;
  
  while (continueTestingFlag) {
    const { userCount } = await inquirer.prompt([{
      type: "list",
      name: "userCount",
      message: "Select number of users for message sending test:",
      choices: [
        "5", 
        "10", 
        "20", 
        "50",
        "Exit"
      ]
    }]);
    
    if (userCount === "Exit") {
      break;
    }
    
    const { messageType } = await inquirer.prompt([{
      type: "list",
      name: "messageType",
      message: "Select message type:",
      choices: [
        "Basic Message",
        "Long Message",
        "Message with Special Characters",
        "Back"
      ]
    }]);
    
    if (messageType === "Back") {
      continue;
    }
    
    console.log(chalk.blue(`\nPreparing to run multi-user message sending test with ${userCount} users...`));
    console.log(chalk.yellow(`This will have user1 through user${userCount} (password: password123) send messages to each other simultaneously.`));
    
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to proceed? This will create many messages in your database.",
      default: false
    }]);
    
    if (!confirm) {
      console.log(chalk.yellow("Test cancelled."));
      continue;
    }
    
    const endpoint = "/api/Messages/send/{senderId}";
    console.log(chalk.blue(`\nRunning multi-user message sending test on ${endpoint}...`));
    
    const results = await runMultiUserMessageTest(parseInt(userCount), endpoint, messageType);
    displayResults(results, "POST", endpoint, userCount, messageType);
    
    // Ask if user wants to continue testing
    const { action } = await inquirer.prompt([{
      type: "list",
      name: "action",
      message: "What would you like to do next?",
      choices: ["Test Another Configuration", "Exit"]
    }]);
    
    if (action === "Exit") {
      continueTestingFlag = false;
    }
  }
  
  console.log(chalk.green("\nThank you for using Multi-User Message Sending Test!"));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  process.exit(1);
});
