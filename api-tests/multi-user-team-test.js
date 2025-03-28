#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import ora from 'ora';
import dotenv from 'dotenv';

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

// Function to run multi-user team creation stress test
async function runMultiUserTeamCreationTest(userCount, endpoint) {
  const baseUrl = process.env.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  
  console.log(chalk.blue(`\nRunning multi-user team creation stress test with ${chalk.bold(userCount)} users`));
  console.log(chalk.gray(`Each user will create one team simultaneously`));
  
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
    format: "Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Users",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true
  });
  
  progressBar.start(userCount, 0);
  
  // Start concurrent user simulations
  const userPromises = [];
  
  // First, test a single login to debug authentication issues
  try {
    const testUsername = "user1";
    const testPassword = "password123";
    console.log(chalk.yellow(`Testing authentication with ${testUsername}...`));
    
    const testAuthResponse = await axios({
      method: 'POST',
      url: `${baseUrl}/api/Auth/login`,
      data: { username: testUsername, password: testPassword }
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
  
  for (let userIndex = 1; userIndex <= userCount; userIndex++) {
    const username = `user${userIndex}`;
    const password = "password123";
    
    userPromises.push((async () => {
      try {
        // Step 1: Authenticate with this specific user
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
              console.log(chalk.yellow(`Found potential token in response.data.${key}`));
              break;
            }
          }
          
          if (!userToken) {
            throw new Error('Token not found in response');
          }
        }
        
        // Step 2: Create team with this user
        const teamData = {
          name: `Team-${username}-${generateRandomString(6)}`,
          description: `This is a test team created by ${username} during stress test`,
          department: "Engineering",
          teamType: "Development",
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        };
        
        const startTime = Date.now();
        
        const teamResponse = await axios({
          method: 'POST',
          url: fullUrl,
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          data: teamData
        });
        
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
        
        const statusKey = teamResponse.status.toString();
        results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
        
        // Store individual user result
        results.userResults[username] = {
          success: true,
          duration,
          statusCode: teamResponse.status,
          teamId: teamResponse.data.id || teamResponse.data.teamId || null
        };
        
      } catch (error) {
        results.totalRequests++;
        results.failedRequests++;
        
        const statusCode = error.response ? error.response.status : 0;
        const duration = 0; // Can't measure duration for failed requests
        
        const statusKey = statusCode.toString();
        results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
        
        // Store individual user result with error details
        results.userResults[username] = {
          success: false,
          statusCode,
          error: error.message,
          response: error.response ? error.response.data : null
        };
      }
      
      // Update progress
      progressBar.increment();
    })());
  }
  
  // Wait for all users to complete their requests
  await Promise.all(userPromises);
  
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
function displayResults(results, method, endpoint, userCount) {
  console.log(chalk.green('\n=== Test Results ==='));
  console.log(chalk.blue(`Endpoint: ${method} ${endpoint}`));
  console.log(chalk.blue(`User Count: ${userCount}`));
  console.log(chalk.blue(`Total Requests: ${results.totalRequests}`));
  console.log(chalk.green(`Successful Requests: ${results.successfulRequests}`));
  console.log(chalk.red(`Failed Requests: ${results.failedRequests}`));
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
    
    for (const [username, result] of Object.entries(results.userResults)) {
      if (!result.success) {
        const errorMessage = result.response?.message || result.error;
        if (!errorGroups[errorMessage]) {
          errorGroups[errorMessage] = [];
        }
        errorGroups[errorMessage].push(username);
      }
    }
    
    // Display grouped errors
    for (const [errorMessage, usernames] of Object.entries(errorGroups)) {
      console.log(chalk.red(`  Error: ${errorMessage}`));
      console.log(chalk.yellow(`  Affected users (${usernames.length}): ${usernames.slice(0, 5).join(', ')}${usernames.length > 5 ? ` and ${usernames.length - 5} more...` : ''}`));
      
      // Show full error response for the first user in each group
      const firstUser = usernames[0];
      const errorResponse = results.userResults[firstUser].response;
      if (errorResponse && typeof errorResponse === 'object') {
        console.log(chalk.gray(`  Full error response: ${JSON.stringify(errorResponse, null, 2)}`));
      }
      console.log();
    }
  }
}

// Main function
async function main() {
  console.log(chalk.blue('=== Multi-User Team Creation Stress Test ==='));
  
  // Validate environment
  validateEnvironment();
  
  // Main menu loop
  let continueTestingFlag = true;
  
  while (continueTestingFlag) {
    const { userCount } = await inquirer.prompt([{
      type: "list",
      name: "userCount",
      message: "Select number of users for team creation test:",
      choices: [
        "10", 
        "50", 
        "100", 
        "200",
        "Exit"
      ]
    }]);
    
    if (userCount === "Exit") {
      break;
    }
    
    console.log(chalk.blue(`\nPreparing to run multi-user team creation test with ${userCount} users...`));
    console.log(chalk.yellow(`This will log in as user1 through user${userCount} (password: Semih123.) and create a team with each user simultaneously.`));
    
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to proceed? This will create many teams in your database.",
      default: false
    }]);
    
    if (!confirm) {
      console.log(chalk.yellow("Test cancelled."));
      continue;
    }
    
    const endpoint = "/api/Team/create";
    console.log(chalk.blue(`\nRunning multi-user team creation test on ${endpoint}...`));
    
    const results = await runMultiUserTeamCreationTest(parseInt(userCount), endpoint);
    displayResults(results, "POST", endpoint, userCount);
    
    // Ask if user wants to continue testing
    const { action } = await inquirer.prompt([{
      type: "list",
      name: "action",
      message: "What would you like to do next?",
      choices: ["Test Another User Count", "Exit"]
    }]);
    
    if (action === "Exit") {
      continueTestingFlag = false;
    }
  }
  
  console.log(chalk.green("\nThank you for using Multi-User Team Creation Test!"));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  process.exit(1);
});
