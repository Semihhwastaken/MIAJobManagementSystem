#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import chalk from 'chalk';
import axios from 'axios';
import cliProgress from 'cli-progress';
import { table } from 'table';
import ora from 'ora';
import figlet from 'figlet';

// ESM için __dirname ve __filename yerine kullanılacak değişkenler
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Constants for test intensities
const TEST_INTENSITIES = {
  EASY: {
    concurrentUsers: 10,
    requestsPerUser: 20,
    delayBetweenRequests: 500 // ms
  },
  NORMAL: {
    concurrentUsers: 50,
    requestsPerUser: 50,
    delayBetweenRequests: 200 // ms
  },
  HARD: {
    concurrentUsers: 100,
    requestsPerUser: 100,
    delayBetweenRequests: 50 // ms
  }
};

// Load API definitions from JSON file
const API_TYPES = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-definitions.json'), 'utf8'));

// Function to validate if .env exists and has BASE_URL
async function validateEnvironment() {
  const envPath = path.join(__dirname, ".env");
  
  if (!fs.existsSync(envPath)) {
    console.log(chalk.yellow("No .env file found. Creating one for you..."));
    
    const { baseUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message: "Enter the base URL for your API (e.g., http://localhost:5000):",
        validate: input => input.trim() !== "" ? true : "Base URL is required"
      }
    ]);
    
    fs.writeFileSync(envPath, `BASE_URL=${baseUrl}\n`);
    console.log(chalk.green(".env file created successfully!"));
    process.env.BASE_URL = baseUrl;
  } else {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    if (!envConfig.BASE_URL) {
      const { baseUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "baseUrl",
          message: "Enter the base URL for your API (e.g., http://localhost:5000):",
          validate: input => input.trim() !== "" ? true : "Base URL is required"
        }
      ]);
      
      fs.appendFileSync(envPath, `BASE_URL=${baseUrl}\n`);
      console.log(chalk.green("BASE_URL added to .env file!"));
      process.env.BASE_URL = baseUrl;
    } else {
      console.log(chalk.green(`Using BASE_URL: ${envConfig.BASE_URL}`));
    }
  }
}

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// JWT token storage
let jwtToken = null;

// Function to authenticate and get JWT token
async function authenticate() {
  const spinner = ora('JWT token alınıyor...').start();
  try {
    const { username, password } = API_TYPES.Auth.credentials;
    
    if (!username || !password) {
      throw new Error('Authentication credentials not configured in api-definitions.json');
    }

    // Sabit /api/Auth/login endpoint'ini kullan
    const response = await axios({
      method: 'POST',
      url: `${process.env.BASE_URL}/api/Auth/login`,
      data: { username, password }
    });

    // Check the response structure and get token based on the API's response format
    let token = null;
    if (response.data.token) {
      token = response.data.token;
    } else if (response.data.accessToken) {
      token = response.data.accessToken;
    } else if (response.data.jwt) {
      token = response.data.jwt; 
    } else if (response.data.access_token) {
      token = response.data.access_token;
    } else {
      console.log(chalk.yellow('Warning: Could not find token in response data. Response structure:'));
      console.log(JSON.stringify(response.data, null, 2));
      throw new Error('Token not found in response');
    }

    jwtToken = token;
    spinner.succeed('JWT token başarıyla alındı');
    console.log(chalk.green(`Bearer ${jwtToken.substring(0, 15)}... formatında token alındı`));
  } catch (error) {
    spinner.fail('JWT token alınamadı');
    console.error(chalk.red(`Auth Error: ${error.message}`));
    if (error.response) {
      console.error(chalk.red(`Status: ${error.response.status}`));
      console.error(chalk.red(`Response data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    throw error;
  }
}

// Function to make API requests with error handling
async function makeRequest(method, url, data = null, requiresAuth = false) {
  // Static counter to limit log messages
  makeRequest.counter = makeRequest.counter || 0;
  makeRequest.counter++;
  
  // Config objesini try bloğu dışında tanımlayarak scope hatasını engelleyelim
  const config = {
    method,
    url,
    timeout: 10000,
    headers: {} // Boş headers objesi oluştur
  };
  
  try {
    if (requiresAuth) {
      if (!jwtToken) {
        await authenticate();
      }
      config.headers['Authorization'] = `Bearer ${jwtToken}`;
      
      // Her 100 istekte bir token mesajını göster
      if (makeRequest.counter % 100 === 0) {
        console.log(chalk.gray(`[${makeRequest.counter}] Sending requests with Bearer token: ${jwtToken.substring(0, 15)}...`));
      }
    }
    
    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.data = data;
      // Content-Type header'ını ekle
      config.headers['Content-Type'] = 'application/json';
      
      // Debug mode için Content-Type header'ını göster
      if (makeRequest.counter % 100 === 0 || makeRequest.counter <= 5) {
        console.log(chalk.blue(`[${makeRequest.counter}] Headers: ${JSON.stringify(config.headers)}`));
        console.log(chalk.gray(`[${makeRequest.counter}] Data: `));
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
    
    const startTime = Date.now();
    const response = await axios(config);
    const endTime = Date.now();
    
    return {
      success: true,
      statusCode: response.status,
      duration: endTime - startTime,
      error: null
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - (error.config ? Date.now() : 0);
    
    // If authentication fails, try to reauthenticate once
    if (requiresAuth && error.response && error.response.status === 401 && jwtToken) {
      console.log(chalk.yellow('Token geçersiz oldu veya süresi doldu. Yeniden kimlik doğrulaması yapılıyor...'));
      jwtToken = null;
      try {
        await authenticate();
        console.log(chalk.green('Yeniden kimlik doğrulaması başarılı, isteği tekrarlıyorum...'));
        return await makeRequest(method, url, data, requiresAuth);
      } catch (authError) {
        console.error(chalk.red('Yeniden kimlik doğrulaması başarısız'));
        console.error(chalk.red(`Kimlik Hatası: ${authError.message}`));
      }
    }

    // Hata detaylarını kaydet
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (Status: ${error.response.status})`;
      // Eğer 400 hatası alındıysa, response data'yı göster
      if (error.response.status === 400) {
        console.log(chalk.red(`400 Bad Request Hatası:`));
        console.log(chalk.yellow(`Hata Detayları: ${JSON.stringify(error.response.data, null, 2)}`));
        console.log(chalk.yellow(`İstek URL: ${url}`));
        console.log(chalk.yellow(`İstek method: ${method}`));
        console.log(chalk.yellow(`Headers: ${JSON.stringify(config.headers)}`));
        console.log(chalk.yellow(`Data: ${JSON.stringify(data, null, 2)}`));
      }
      // Eğer 415 hatası alındıysa, Content-Type ile ilgili bilgilendirme ekle
      else if (error.response.status === 415) {
        console.log(chalk.red(`Content-Type hatası: API JSON verilerini kabul etmiyor olabilir`));
        // Hata ayıklama için daha fazla bilgi
        console.log(chalk.yellow(`İstek URL: ${url}`));
        console.log(chalk.yellow(`İstek method: ${method}`));
        console.log(chalk.yellow(`Headers: ${JSON.stringify(config.headers)}`));
        console.log(chalk.yellow(`Data: ${data ? JSON.stringify(data).substring(0, 100) : 'null'}`));
      }
    }

    return {
      success: false,
      statusCode: error.response ? error.response.status : 0,
      duration: duration,
      error: errorMessage
    };
  }
}

// Function to get existing tasks for dependencies
async function getExistingTaskIds() {
  try {
    const baseUrl = process.env.BASE_URL;
    const fullUrl = `${baseUrl}/api/Tasks`;
    
    console.log(chalk.blue(`Fetching existing tasks for dependencies...`));
    
    // Authenticate if needed
    if (!jwtToken) {
      await authenticate();
    }
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      const taskIds = response.data.map(task => task.id).filter(id => id);
      console.log(chalk.green(`Found ${taskIds.length} existing tasks`));
      
      if (taskIds.length > 0) {
        return taskIds.slice(0, 5); // Return up to 5 task IDs
      }
    }
    
    // If we reach here, either no tasks were found or the response format was unexpected
    console.log(chalk.yellow(`No tasks found or unexpected response format. Using fallback task IDs.`));
    
    // Return fallback task IDs
    return [
      "67d2c7ed664c5cbba91de413", 
      "67d2c7ed664c5cbba91de414",
      "67d2c7ed664c5cbba91de415"
    ];
  } catch (error) {
    console.error(chalk.red(`Error fetching tasks: ${error.message}`));
    console.log(chalk.yellow(`Using fallback task IDs due to error.`));
    
    // Return fallback task IDs in case of error
    return [
      "67d2c7ed664c5cbba91de413", 
      "67d2c7ed664c5cbba91de414",
      "67d2c7ed664c5cbba91de415"
    ];
  }
}

// Function to update parameter sets with real task IDs for dependencies
async function updateDependenciesWithRealTaskIds(parameterSets) {
  const taskIds = await getExistingTaskIds();
  
  console.log(chalk.blue(`Updating dependencies with task IDs: ${taskIds.join(', ')}`));
  
  // Create a deep copy of the parameter sets
  const updatedSets = JSON.parse(JSON.stringify(parameterSets));
  
  // Update dependencies in each parameter set
  updatedSets.forEach(set => {
    if (set.data.dependencies !== undefined) {
      // For "Task with Dependencies" and "Complex Task", add at least 2 dependencies
      if (set.name === "Task with Dependencies" || set.name === "Complex Task") {
        set.data.dependencies = taskIds.slice(0, Math.min(2, taskIds.length));
      }
      console.log(chalk.gray(`Updated dependencies for ${set.name}: ${set.data.dependencies.join(', ')}`));
    }
  });
  
  return updatedSets;
}

// Function to get current user information
async function getCurrentUser() {
  try {
    const baseUrl = process.env.BASE_URL;
    const fullUrl = `${baseUrl}/api/Auth/current-user`;
    
    console.log(chalk.blue(`Fetching current user information...`));
    
    // Authenticate if needed
    if (!jwtToken) {
      await authenticate();
    }
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (response.data && response.data.id) {
      console.log(chalk.green(`Found current user: ${response.data.username}`));
      return {
        id: response.data.id,
        username: response.data.username,
        fullName: response.data.fullName || response.data.username
      };
    } else {
      console.log(chalk.yellow(`Unexpected user response format`));
      return {
        id: API_TYPES.Auth.credentials.username,
        username: API_TYPES.Auth.credentials.username,
        fullName: API_TYPES.Auth.credentials.username
      };
    }
  } catch (error) {
    console.error(chalk.red(`Error fetching current user: ${error.message}`));
    return {
      id: API_TYPES.Auth.credentials.username,
      username: API_TYPES.Auth.credentials.username,
      fullName: API_TYPES.Auth.credentials.username
    };
  }
}

// Function to run stress test on a specific endpoint
async function runStressTest(method, endpoint, intensity, requiresAuth = false, sampleData = null) {
  const baseUrl = process.env.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  
  console.log(chalk.blue(`\nRunning ${chalk.bold(intensity)} stress test on ${method} ${fullUrl}`));
  console.log(chalk.gray(`Concurrent Users: ${TEST_INTENSITIES[intensity].concurrentUsers}`));
  console.log(chalk.gray(`Requests Per User: ${TEST_INTENSITIES[intensity].requestsPerUser}`));
  console.log(chalk.gray(`Delay Between Requests: ${TEST_INTENSITIES[intensity].delayBetweenRequests}ms`));
  
  if (sampleData) {
    console.log(chalk.blue(`Request Body Data: ${JSON.stringify(sampleData, null, 2)}`));
  }
  
  // Kimlik doğrulama gerekiyorsa, teste başlamadan önce token al
  if (requiresAuth) {
    console.log(chalk.blue(`Bu endpoint kimlik doğrulaması gerektiriyor (requiresAuth: true)`));
    console.log(chalk.gray(`/api/Auth/login endpoint'inden JWT token alınıyor...`));
    try {
      await authenticate();
    } catch (error) {
      console.error(chalk.red(`Kimlik doğrulama başarısız oldu: ${error.message}`));
      console.log(chalk.yellow('Token olmadan teste devam ediliyor, 401 hataları bekleniyor...'));
    }
  } else {
    console.log(chalk.gray(`Bu endpoint kimlik doğrulaması gerektirmiyor (requiresAuth: false)`));
  }
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    avgResponseTime: 0,
    totalResponseTime: 0,
    statusCodes: {}
  };
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: "Progress |" + chalk.cyan("{bar}") + "| {percentage}% || {value}/{total} Requests",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true
  });
  
  const totalRequests = TEST_INTENSITIES[intensity].concurrentUsers * 
                       TEST_INTENSITIES[intensity].requestsPerUser;
  
  progressBar.start(totalRequests, 0);
  
  // Start concurrent user simulations
  const userPromises = [];
  
  for (let user = 0; user < TEST_INTENSITIES[intensity].concurrentUsers; user++) {
    userPromises.push((async () => {
      for (let req = 0; req < TEST_INTENSITIES[intensity].requestsPerUser; req++) {
        // Önemli değişiklik: null yerine sampleData parametresini geçiriyoruz
        const result = await makeRequest(method, fullUrl, sampleData, requiresAuth);
        
        // Update results
        results.totalRequests++;
        
        if (result.success) results.successfulRequests++;
        else results.failedRequests++;
        
        results.totalResponseTime += result.duration;
        
        if (result.duration < results.minResponseTime) {
          results.minResponseTime = result.duration;
        }
        
        if (result.duration > results.maxResponseTime) {
          results.maxResponseTime = result.duration;
        }
        
        const statusKey = result.statusCode.toString();
        results.statusCodes[statusKey] = (results.statusCodes[statusKey] || 0) + 1;
        
        // Update progress
        progressBar.increment();
        
        // Add delay between requests
        await delay(TEST_INTENSITIES[intensity].delayBetweenRequests);
      }
    })());
  }
  
  // Wait for all users to complete their requests
  await Promise.all(userPromises);
  
  progressBar.stop();
  
  // Calculate average response time
  results.avgResponseTime = results.totalResponseTime / results.totalRequests;
  
  // Clean up minimum response time if no successful requests
  if (results.minResponseTime === Number.MAX_SAFE_INTEGER) {
    results.minResponseTime = 0;
  }
  
  return results;
}

// Function to display test results in a table
function displayResults(results, method, endpoint, intensity) {
  console.log(chalk.green("\n✅ Stress Test Complete"));
  console.log(chalk.blue(`\nResults for ${method} ${endpoint} (${intensity} intensity):`));
  
  // Create summary table
  const summaryData = [
    ["Metric", "Value"],
    ["Total Requests", results.totalRequests],
    ["Successful Requests", `${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`],
    ["Failed Requests", `${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(2)}%)`],
    ["Min Response Time", `${results.minResponseTime} ms`],
    ["Max Response Time", `${results.maxResponseTime} ms`],
    ["Avg Response Time", `${results.avgResponseTime.toFixed(2)} ms`]
  ];
  
  // Display status code distribution in a separate table
  const statusData = [["Status Code", "Count", "Percentage"]];
  Object.entries(results.statusCodes).forEach(([code, count]) => {
    statusData.push([
      code,
      count,
      `${((count / results.totalRequests) * 100).toFixed(2)}%`
    ]);
  });
  
  console.log(table(summaryData));
  console.log(chalk.blue("\nStatus Code Distribution:"));
  console.log(table(statusData));
  
  // Generate success metrics
  let testOutcome;
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  
  if (successRate >= 95) {
    testOutcome = chalk.green("PASSED ✅ - API is performing well");
  } else if (successRate >= 80) {
    testOutcome = chalk.yellow("WARNING ⚠️ - API is experiencing some issues");
  } else {
    testOutcome = chalk.red("FAILED ❌ - API is not performing well");
  }
  
  console.log(`\nTest Outcome: ${testOutcome}`);
  
  // Save results to file
  const resultsDir = path.join(__dirname, "results");
  fs.ensureDirSync(resultsDir);
  
  const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
  const resultsFile = path.join(
    resultsDir, 
    `stress-test-${endpoint.replace(/\//g, "-").replace(/^\-/, "")}-${intensity.toLowerCase()}-${timestamp}.json`
  );
  
  fs.writeJsonSync(resultsFile, {
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    intensity,
    results
  }, { spaces: 2 });
  
  console.log(chalk.gray(`\nResults saved to: ${resultsFile}`));
}

// Main function for dynamic testing
async function main() {
  // Print app banner
  console.log("\n");
  console.log(chalk.cyan(figlet.textSync("Dynamic Task Test", { font: "Standard" })));
  console.log(chalk.gray(" Created for MIA Job Management System\n"));
  
  // Validate environment and authentication credentials
  await validateEnvironment();
  
  // Check if authentication credentials are configured
  if (!API_TYPES.Auth.credentials.username || !API_TYPES.Auth.credentials.password) {
    const { username, password } = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "Enter your API username:",
        validate: input => input.trim() !== "" ? true : "Username is required"
      },
      {
        type: "password",
        name: "password",
        message: "Enter your API password:",
        validate: input => input.trim() !== "" ? true : "Password is required"
      }
    ]);

    API_TYPES.Auth.credentials.username = username;
    API_TYPES.Auth.credentials.password = password;

    // Save credentials to api-definitions.json
    fs.writeFileSync(
      path.join(__dirname, 'api-definitions.json'),
      JSON.stringify(API_TYPES, null, 2),
      'utf8'
    );
  }

  let continueTestingFlag = true;
  
  while (continueTestingFlag) {
    // First, select the API endpoint category
    const { apiCategory } = await inquirer.prompt([
      {
        type: "list",
        name: "apiCategory",
        message: "Select API category to test:",
        choices: ["Task", "Message", "Comment", "Feedback", "Team", "CalendarEvent", "Exit"]
      }
    ]);
    
    if (apiCategory === "Exit") {
      continueTestingFlag = false;
      break;
    }
    
    // Load API definitions for the selected category
    let categoryTests;
    if (apiCategory === "Task") {
      categoryTests = API_TYPES["Custom Categories"]["TasksEndpoints"];
    } else if (apiCategory === "Message") {
      categoryTests = API_TYPES["Custom Categories"]["MessageEndpoints"];
    } else if (apiCategory === "Comment") {
      categoryTests = API_TYPES["Custom Categories"]["CommentEndpoints"];
    } else if (apiCategory === "Feedback") {
      categoryTests = API_TYPES["Custom Categories"]["FeedbackEndpoints"];
    } else if (apiCategory === "Team") {
      categoryTests = API_TYPES["Custom Categories"]["TeamEndpoints"];
    } else if (apiCategory === "CalendarEvent") {
      categoryTests = API_TYPES["Custom Categories"]["CalendarEventEndpoints"];
    }
    
    if (!categoryTests) {
      console.log(chalk.red(`No tests defined for ${apiCategory} category`));
      continue;
    }
    
    // Select HTTP method to test
    const { httpMethod } = await inquirer.prompt([{
      type: "list",
      name: "httpMethod",
      message: "Select HTTP method to test:",
      choices: Object.keys(categoryTests).concat(["Back to Main Menu", "Exit"])
    }]);
    
    if (httpMethod === "Exit") {
      continueTestingFlag = false;
      break;
    } else if (httpMethod === "Back to Main Menu") {
      continue;
    }
    
    // Get the tests for the selected method
    const methodTests = categoryTests[httpMethod];
    
    if (!methodTests) {
      console.log(chalk.red(`No tests defined for ${httpMethod} method in ${apiCategory} category`));
      continue;
    }

    // If POST method is selected for Tasks, show the dynamic parameter sets
    if (apiCategory === "Task" && httpMethod === "POST") {
      // Check if DynamicQueryTests category exists
      if (!API_TYPES["Custom Categories"]["DynamicQueryTests"]) {
        console.log(chalk.yellow("\nDynamic Query Tests category not found in api-definitions.json."));
        continue;
      }

      const dynamicTests = API_TYPES["Custom Categories"]["DynamicQueryTests"];
      
      if (!dynamicTests.parameterSets || dynamicTests.parameterSets.length === 0) {
        console.log(chalk.yellow("\nNo parameter sets defined for dynamic testing."));
        continue;
      }
      
      // Update dependencies with real task IDs
      let updatedParameterSets = await updateDependenciesWithRealTaskIds(dynamicTests.parameterSets);
      
      // Show available parameter sets
      const { paramSetChoice } = await inquirer.prompt([
        {
          type: "list",
          name: "paramSetChoice",
          message: "Select parameter set to test:",
          choices: [
            ...updatedParameterSets.map((set, index) => ({
              name: `${set.name} - ${set.description}`,
              value: index
            })),
            {
              name: "Compare All Parameter Sets",
              value: "all"
            },
            {
              name: "Back",
              value: "back"
            },
            {
              name: "Exit",
              value: "exit"
            }
          ]
        }
      ]);
      
      if (paramSetChoice === "back") {
        continue;
      }
      
      if (paramSetChoice === "exit") {
        continueTestingFlag = false;
        break;
      }

      // Select test intensity
      const { intensity } = await inquirer.prompt([{
        type: "list",
        name: "intensity",
        message: "Select test intensity:",
        choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
      }]);
      
      if (intensity === "Back") {
        continue;
      }
      
      if (intensity === "Exit") {
        continueTestingFlag = false;
        break;
      }
      
      if (paramSetChoice === "all") {
        // Run tests for all parameter sets and compare results
        console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
        
        const allResults = [];
        const spinner = ora('Preparing comparison tests...').start();
        
        for (let i = 0; i < updatedParameterSets.length; i++) {
          const paramSet = updatedParameterSets[i];
          spinner.text = `Testing parameter set: ${paramSet.name}`;
          
          const result = await runStressTest(
            dynamicTests.methods[0], 
            dynamicTests.endpoints[0], 
            intensity, 
            dynamicTests.requiresAuth, 
            paramSet.data
          );
          
          allResults.push({
            name: paramSet.name,
            description: paramSet.description,
            results: result
          });
        }
        
        spinner.succeed('All parameter set tests completed');
        
        // Display comparison results
        console.log(chalk.green("\n✅ Dynamic Parameter Test Comparison Complete"));
        
        // Create comparison table
        const comparisonData = [
          ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
        ];
        
        allResults.forEach(result => {
          const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
          comparisonData.push([
            result.name,
            result.results.avgResponseTime.toFixed(2),
            `${successRate}%`,
            result.results.minResponseTime,
            result.results.maxResponseTime
          ]);
        });
        
        console.log(table(comparisonData));
        
        // Find the slowest parameter set
        const slowestSet = allResults.reduce((prev, current) => 
          prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
        );
        
        console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
        console.log(chalk.gray(`Description: ${slowestSet.description}`));
        console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
        
        // Save comparison results to file
        const resultsDir = path.join(__dirname, "results");
        fs.ensureDirSync(resultsDir);
        
        const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
        const resultsFile = path.join(
          resultsDir, 
          `dynamic-comparison-${intensity.toLowerCase()}-${timestamp}.json`
        );
        
        fs.writeJsonSync(resultsFile, {
          timestamp: new Date().toISOString(),
          endpoint: dynamicTests.endpoints[0],
          method: dynamicTests.methods[0],
          intensity,
          parameterSets: dynamicTests.parameterSets.map(set => set.name),
          results: allResults
        }, { spaces: 2 });
        
        console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
      } else {
        // Run test for a single parameter set
        const paramSet = updatedParameterSets[paramSetChoice];
        console.log(chalk.blue(`\nRunning test for parameter set: ${paramSet.name}`));
        console.log(chalk.gray(`Description: ${paramSet.description}`));
        
        const results = await runStressTest(
          dynamicTests.methods[0], 
          dynamicTests.endpoints[0], 
          intensity, 
          dynamicTests.requiresAuth, 
          paramSet.data
        );
        
        displayResults(results, dynamicTests.methods[0], dynamicTests.endpoints[0], intensity);
      }
      
      // Ask if user wants to continue or go back
      const { action } = await inquirer.prompt([{
        type: "list",
        name: "action",
        message: "What would you like to do next?",
        choices: ["Test Another Parameter Set", "Back to Method Selection", "Back to Main Menu", "Exit"]
      }]);
      
      if (action === "Test Another Parameter Set") {
        continue;
      } else if (action === "Back to Method Selection") {
        continue;
      } else if (action === "Back to Main Menu") {
        continue;
      } else {
        continueTestingFlag = false;
        break;
      }
    } else if (apiCategory === "Task" && httpMethod === "PUT") {
      // Check if TasksEndpoints PUT category exists
      if (!API_TYPES["Custom Categories"]["TasksEndpoints"] || !API_TYPES["Custom Categories"]["TasksEndpoints"]["PUT"]) {
        console.log(chalk.yellow("\nPUT method not found in TasksEndpoints in api-definitions.json."));
        continue;
      }

      const putTests = API_TYPES["Custom Categories"]["TasksEndpoints"]["PUT"];
      
      if (!putTests.parameterSets || putTests.parameterSets.length === 0) {
        console.log(chalk.yellow("\nNo parameter sets defined for PUT testing."));
        continue;
      }
      
      // First, get existing task IDs to use for the PUT operation
      const existingTaskIds = await getExistingTaskIds();
      if (existingTaskIds.length === 0) {
        console.log(chalk.yellow("\nNo existing tasks found to update. Please create tasks first."));
        continue;
      }

      // Select a task ID to update
      const { taskId } = await inquirer.prompt([
        {
          type: "list",
          name: "taskId",
          message: "Select a task ID to update:",
          choices: existingTaskIds
        }
      ]);

      // Update the endpoint with the selected task ID
      const endpoint = putTests.endpoints[0].replace("{id}", taskId);
      
      // Update parameter sets with the selected task ID and real user information
      let updatedParameterSets = JSON.parse(JSON.stringify(putTests.parameterSets));
      
      // Get current user information
      const currentUser = await getCurrentUser();
      
      // Update each parameter set with the task ID and current user info
      updatedParameterSets = updatedParameterSets.map(set => {
        // Set the task ID
        set.data.id = taskId;
        
        // Set the current user info if available
        if (currentUser && set.data.createdBy) {
          set.data.createdBy.id = currentUser.id || "";
          set.data.createdBy.username = currentUser.username || "";
          set.data.createdBy.fullName = currentUser.fullName || "";
        }
        
        // Update dependencies with real task IDs if needed
        if (set.data.dependencies && Array.isArray(set.data.dependencies)) {
          // Filter out the current task ID to avoid self-dependency
          const availableTaskIds = existingTaskIds.filter(id => id !== taskId);
          
          if (availableTaskIds.length > 0 && set.data.dependencies.length === 0) {
            // Add a random task as dependency
            const randomTaskId = availableTaskIds[Math.floor(Math.random() * availableTaskIds.length)];
            set.data.dependencies.push(randomTaskId);
          }
        }
        
        return set;
      });
      
      // Show available parameter sets
      const { paramSetChoice } = await inquirer.prompt([
        {
          type: "list",
          name: "paramSetChoice",
          message: "Select parameter set to test:",
          choices: [
            ...updatedParameterSets.map((set, index) => ({
              name: `${set.name} - ${set.description}`,
              value: index
            })),
            {
              name: "Compare All Parameter Sets",
              value: "all"
            },
            {
              name: "Back",
              value: "back"
            },
            {
              name: "Exit",
              value: "exit"
            }
          ]
        }
      ]);
      
      if (paramSetChoice === "back") {
        continue;
      }
      
      if (paramSetChoice === "exit") {
        continueTestingFlag = false;
        break;
      }

      // Select test intensity
      const { intensity } = await inquirer.prompt([{
        type: "list",
        name: "intensity",
        message: "Select test intensity:",
        choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
      }]);
      
      if (intensity === "Back") {
        continue;
      }
      
      if (intensity === "Exit") {
        continueTestingFlag = false;
        break;
      }

      if (paramSetChoice === "all") {
        // Run tests for all parameter sets and compare results
        console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
        
        const allResults = [];
        const spinner = ora('Preparing comparison tests...').start();
        
        for (let i = 0; i < updatedParameterSets.length; i++) {
          const paramSet = updatedParameterSets[i];
          spinner.text = `Testing parameter set: ${paramSet.name}`;
          
          const result = await runStressTest(
            "PUT", 
            endpoint, 
            intensity, 
            putTests.requiresAuth, 
            paramSet.data
          );
          
          allResults.push({
            name: paramSet.name,
            description: paramSet.description,
            results: result
          });
        }
        
        spinner.succeed('All parameter set tests completed');
        
        // Display comparison results
        console.log(chalk.green("\n✅ Dynamic PUT Test Comparison Complete"));
        
        // Create comparison table
        const comparisonData = [
          ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
        ];
        
        allResults.forEach(result => {
          const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
          comparisonData.push([
            result.name,
            result.results.avgResponseTime.toFixed(2),
            `${successRate}%`,
            result.results.minResponseTime,
            result.results.maxResponseTime
          ]);
        });
        
        console.log(table(comparisonData));
        
        // Find the slowest parameter set
        const slowestSet = allResults.reduce((prev, current) => 
          prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
        );
        
        console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
        console.log(chalk.gray(`Description: ${slowestSet.description}`));
        console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
        
        // Save comparison results to file
        const resultsDir = path.join(__dirname, "results");
        fs.ensureDirSync(resultsDir);
        
        const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
        const resultsFile = path.join(
          resultsDir, 
          `dynamic-put-comparison-${intensity.toLowerCase()}-${timestamp}.json`
        );
        
        fs.writeJsonSync(resultsFile, {
          timestamp: new Date().toISOString(),
          endpoint,
          method: "PUT",
          intensity,
          parameterSets: updatedParameterSets.map(set => set.name),
          results: allResults
        }, { spaces: 2 });
        
        console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
      } else {
        // Run test for a single parameter set
        const paramSet = updatedParameterSets[paramSetChoice];
        console.log(chalk.blue(`\nRunning test for parameter set: ${paramSet.name}`));
        console.log(chalk.gray(`Description: ${paramSet.description}`));
        console.log(chalk.gray(`Updating task with ID: ${taskId}`));
        
        const results = await runStressTest(
          "PUT", 
          endpoint, 
          intensity, 
          putTests.requiresAuth, 
          paramSet.data
        );
        
        displayResults(results, "PUT", endpoint, intensity);
      }
      
      // Ask if user wants to continue or go back
      const { action } = await inquirer.prompt([{
        type: "list",
        name: "action",
        message: "What would you like to do next?",
        choices: ["Test Another Parameter Set", "Back to Method Selection", "Back to Main Menu", "Exit"]
      }]);
      
      if (action === "Test Another Parameter Set") {
        continue;
      } else if (action === "Back to Method Selection") {
        continue;
      } else if (action === "Back to Main Menu") {
        continue;
      } else {
        continueTestingFlag = false;
        break;
      }
    } else if (apiCategory === "Message") {
      // Handle Message API testing
      const messageTests = categoryTests;
      
      if (httpMethod === "GET") {
        // For GET, we need to select which endpoint to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select GET endpoint to test:",
            choices: [
              ...messageTests.GET.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        let endpoint = messageTests.GET.endpoints[endpointChoice];
        
        // Handle different GET endpoints
        if (endpoint.includes("{userId}") && !endpoint.includes("{otherUserId}")) {
          // For getting messages for a specific user
          const currentUser = await getCurrentUser();
          endpoint = endpoint.replace("{userId}", currentUser.id);
          
        } else if (endpoint.includes("{userId}") && endpoint.includes("{otherUserId}")) {
          // For getting conversation between two users
          console.log(chalk.blue("\nFetching users for conversation..."));
          
          // Get current user
          const currentUser = await getCurrentUser();
          
          // Get other users
          let users = [];
          try {
            const usersResponse = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/Users`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(usersResponse.data)) {
              users = usersResponse.data;
            } else if (usersResponse.data && typeof usersResponse.data === 'object') {
              if (Array.isArray(usersResponse.data.data)) {
                users = usersResponse.data.data;
              } else if (usersResponse.data.users && Array.isArray(usersResponse.data.users)) {
                users = usersResponse.data.users;
              } else if (usersResponse.data.items && Array.isArray(usersResponse.data.items)) {
                users = usersResponse.data.items;
              } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
                users = usersResponse.data.results;
              }
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError fetching users: ${error.message}`));
            if (error.response) {
              console.log(chalk.red(`Status: ${error.response.status}`));
              console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
            }
          }
          
          // Ensure users is an array
          if (!Array.isArray(users)) {
            console.log(chalk.yellow("Could not extract users array from response. Creating a fallback array."));
            users = [];
          }
          
          // Filter out the current user
          const otherUsers = users.filter(user => 
            user && 
            typeof user === 'object' && 
            user.id && 
            user.id !== currentUser.id
          );
          
          if (otherUsers.length === 0) {
            console.log(chalk.yellow("\nNo other users found. Creating a fallback test user..."));
            otherUsers.push({
              id: "67d2c7ed664c5cbba91de412", // Use a fallback ID
              username: "TestRecipient",
              fullName: "Test Recipient (Fallback)"
            });
          }
          
          // Select a user for the conversation
          const { otherUserId } = await inquirer.prompt([
            {
              type: "list",
              name: "otherUserId",
              message: "Select user for conversation:",
              choices: otherUsers.map(user => ({
                name: user.fullName || user.username || user.id,
                value: user.id
              }))
            }
          ]);
          
          // Update the endpoint with both user IDs
          endpoint = endpoint.replace("{userId}", currentUser.id).replace("{otherUserId}", otherUserId);
        }
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          messageTests.GET.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "POST") {
        // For POST, we need to select which endpoint and parameter set to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select POST endpoint to test:",
            choices: [
              ...messageTests.POST.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Update the endpoint with the sender ID
        let endpoint = messageTests.POST.endpoints[endpointChoice].replace("{senderId}", currentUser.id);
        
        // Select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select parameter set to test:",
            choices: [
              ...messageTests.POST.parameterSets.map((set, index) => ({
                name: `${set.name} - ${set.description}`,
                value: index
              })),
              {
                name: "Compare All Parameter Sets",
                value: "all"
              },
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (paramSetChoice === "back") {
          continue;
        }
        
        if (paramSetChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Get other users for receiver selection
        let users = [];
        try {
          const usersResponse = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Users`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(usersResponse.data)) {
            users = usersResponse.data;
          } else if (usersResponse.data && typeof usersResponse.data === 'object') {
            if (Array.isArray(usersResponse.data.data)) {
              users = usersResponse.data.data;
            } else if (usersResponse.data.users && Array.isArray(usersResponse.data.users)) {
              users = usersResponse.data.users;
            } else if (usersResponse.data.items && Array.isArray(usersResponse.data.items)) {
              users = usersResponse.data.items;
            } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
              users = usersResponse.data.results;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching users: ${error.message}`));
        }
        
        // Ensure users is an array
        if (!Array.isArray(users)) {
          console.log(chalk.yellow("Could not extract users array from response. Creating a fallback array."));
          users = [];
        }
        
        // Filter out the current user
        const otherUsers = users.filter(user => 
          user && 
          typeof user === 'object' && 
          user.id && 
          user.id !== currentUser.id
        );
        
        if (otherUsers.length === 0) {
          console.log(chalk.yellow("\nNo other users found. Creating a fallback test user..."));
          otherUsers.push({
            id: "67d2c7ed664c5cbba91de412", // Use a fallback ID
            username: "TestRecipient",
            fullName: "Test Recipient (Fallback)"
          });
        }
        
        // Select a user as the receiver
        const { receiverId } = await inquirer.prompt([
          {
            type: "list",
            name: "receiverId",
            message: "Select message recipient:",
            choices: otherUsers.map(user => ({
              name: user.fullName || user.username || user.id,
              value: user.id
            }))
          }
        ]);
        
        // Update parameter sets with the selected receiver ID
        let updatedParameterSets = JSON.parse(JSON.stringify(messageTests.POST.parameterSets));
        updatedParameterSets = updatedParameterSets.map(set => {
          set.data.receiverId = receiverId;
          return set;
        });
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        if (paramSetChoice === "all") {
          // Run tests for all parameter sets and compare results
          console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
          
          const allResults = [];
          const spinner = ora('Preparing comparison tests...').start();
          
          for (let i = 0; i < updatedParameterSets.length; i++) {
            const paramSet = updatedParameterSets[i];
            spinner.text = `Testing parameter set: ${paramSet.name}`;
            
            const result = await runStressTest(
              httpMethod, 
              endpoint, 
              intensity, 
              messageTests.POST.requiresAuth, 
              paramSet.data
            );
            
            allResults.push({
              name: paramSet.name,
              description: paramSet.description,
              results: result
            });
          }
          
          spinner.succeed('All parameter set tests completed');
          
          // Display comparison results
          console.log(chalk.green("\n✅ Message Parameter Test Comparison Complete"));
          
          // Create comparison table
          const comparisonData = [
            ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
          ];
          
          allResults.forEach(result => {
            const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
            comparisonData.push([
              result.name,
              result.results.avgResponseTime.toFixed(2),
              `${successRate}%`,
              result.results.minResponseTime,
              result.results.maxResponseTime
            ]);
          });
          
          console.log(table(comparisonData));
          
          // Find the slowest parameter set
          const slowestSet = allResults.reduce((prev, current) => 
            prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
          );
          
          console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
          console.log(chalk.gray(`Description: ${slowestSet.description}`));
          console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
          
          // Save comparison results to file
          const resultsDir = path.join(__dirname, "results");
          fs.ensureDirSync(resultsDir);
          
          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
          const resultsFile = path.join(
            resultsDir, 
            `message-comparison-${intensity.toLowerCase()}-${timestamp}.json`
          );
          
          fs.writeJsonSync(resultsFile, {
            timestamp: new Date().toISOString(),
            endpoint,
            method: httpMethod,
            intensity,
            parameterSets: updatedParameterSets.map(set => set.name),
            results: allResults
          }, { spaces: 2 });
          
          console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
        } else {
          // Run test for a single parameter set
          const paramSet = updatedParameterSets[paramSetChoice];
          console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
          console.log(chalk.gray(`Parameter set: ${paramSet.name}`));
          console.log(chalk.gray(`Sending message to: ${otherUsers.find(u => u.id === receiverId)?.fullName || receiverId}`));
          
          const results = await runStressTest(
            httpMethod, 
            endpoint, 
            intensity, 
            messageTests.POST.requiresAuth, 
            paramSet.data
          );
          
          displayResults(results, httpMethod, endpoint, intensity);
        }
        
      } else if (httpMethod === "PUT") {
        // For PUT, we need to fetch existing messages to mark as read
        console.log(chalk.blue("\nFetching unread messages..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get messages
        let messages = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Messages/user/${currentUser.id}`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            messages = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              messages = response.data.data;
            } else if (response.data.messages && Array.isArray(response.data.messages)) {
              messages = response.data.messages;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              messages = response.data.items;
            }
          }
          
          // Debug the response structure
          console.log(chalk.gray(`Messages response type: ${typeof response.data}`));
          if (typeof response.data === 'object') {
            console.log(chalk.gray(`Messages response structure: ${Array.isArray(response.data) ? 'Array' : 'Object with keys: ' + Object.keys(response.data).join(', ')}`));
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching messages: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // Ensure messages is an array
        if (!Array.isArray(messages)) {
          console.log(chalk.yellow("Could not extract messages array from response. Creating a fallback array."));
          messages = [];
        }
        
        // Filter unread messages
        const unreadMessages = messages.filter(message => 
          message && 
          typeof message === 'object' && 
          message.id && 
          message.receiverId === currentUser.id && 
          !message.isRead
        );
        
        // If no unread messages found, create fallback messages
        if (unreadMessages.length === 0) {
          console.log(chalk.yellow("\nNo unread messages found. Creating fallback test messages..."));
          unreadMessages.push({
            id: "67d2c7ed664c5cbba91de420",
            senderId: "67d2c7ed664c5cbba91de412",
            receiverId: currentUser.id,
            content: "This is a test message",
            subject: "Test Message",
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
        
        // Select a message to mark as read
        const { messageId } = await inquirer.prompt([
          {
            type: "list",
            name: "messageId",
            message: "Select message to mark as read:",
            choices: unreadMessages.map(message => ({
              name: `${message.subject} (${new Date(message.createdAt).toLocaleString()})`,
              value: message.id
            }))
          }
        ]);

        // Update the endpoint with the selected message ID
        const endpoint = messageTests.PUT.endpoints[0].replace("{id}", messageId);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Marking message with ID: ${messageId} as read`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          messageTests.PUT.requiresAuth, 
          {}
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "DELETE") {
        // For DELETE, we need to fetch existing messages to delete
        console.log(chalk.blue("\nFetching messages..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get messages
        let messages = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Messages/user/${currentUser.id}`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            messages = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              messages = response.data.data;
            } else if (response.data.messages && Array.isArray(response.data.messages)) {
              messages = response.data.messages;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              messages = response.data.items;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching messages: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // Ensure messages is an array
        if (!Array.isArray(messages)) {
          console.log(chalk.yellow("Could not extract messages array from response. Creating a fallback array."));
          messages = [];
        }
        
        // Filter messages that the user can delete (sent or received by the user)
        const userMessages = messages.filter(message => 
          message && 
          typeof message === 'object' && 
          message.id && 
          (message.senderId === currentUser.id || message.receiverId === currentUser.id)
        );
        
        // If no messages found, create fallback messages
        if (userMessages.length === 0) {
          console.log(chalk.yellow("\nNo messages found that you can delete. Creating fallback test messages..."));
          userMessages.push({
            id: "67d2c7ed664c5cbba91de420",
            senderId: currentUser.id,
            receiverId: "67d2c7ed664c5cbba91de412",
            content: "This is a test message",
            subject: "Test Message",
            createdAt: new Date().toISOString()
          });
          
          userMessages.push({
            id: "67d2c7ed664c5cbba91de421",
            senderId: "67d2c7ed664c5cbba91de412",
            receiverId: currentUser.id,
            content: "This is a reply to your test message",
            subject: "Re: Test Message",
            createdAt: new Date().toISOString()
          });
        }
        
        // Select a message to delete
        const { messageId } = await inquirer.prompt([
          {
            type: "list",
            name: "messageId",
            message: "Select message to delete:",
            choices: userMessages.map(message => ({
              name: `${message.subject} (${message.senderId === currentUser.id ? 'Sent' : 'Received'} - ${new Date(message.createdAt).toLocaleString()})`,
              value: message.id
            }))
          }
        ]);
        
        // Update the endpoint with the selected message ID and user ID
        const endpoint = messageTests.DELETE.endpoints[0]
          .replace("{messageId}", messageId)
          .replace("{userId}", currentUser.id);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Deleting message with ID: ${messageId}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          messageTests.DELETE.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
      }
    } else if (apiCategory === "Comment") {
      // Handle Comment API testing
      const commentTests = categoryTests;
      
      if (httpMethod === "GET") {
        // For GET, we need to select which endpoint to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select GET endpoint to test:",
            choices: [
              ...commentTests.GET.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        let endpoint = commentTests.GET.endpoints[endpointChoice];
        
        // For getting comments for a specific task, we need to fetch existing tasks first
        if (endpoint.includes("{taskId}")) {
          console.log(chalk.blue("\nFetching existing tasks..."));
          
          // Get current user
          const currentUser = await getCurrentUser();
          
          // Get tasks
          const taskIds = await getExistingTaskIds();
          
          if (taskIds.length === 0) {
            console.log(chalk.yellow("\nNo tasks found. Creating a fallback task ID..."));
            taskIds.push("67d2c7ed664c5cbba91de430"); // Use a fallback ID
          }
          
          // Select a task to get comments for
          const { taskId } = await inquirer.prompt([
            {
              type: "list",
              name: "taskId",
              message: "Select task to get comments from:",
              choices: taskIds.map((id, index) => ({
                name: `Task ${index + 1}: ${id}`,
                value: id
              }))
            }
          ]);
          
          // Update the endpoint with the selected task ID
          endpoint = endpoint.replace("{taskId}", taskId);
        }
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          commentTests.GET.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "POST") {
        // For POST, we need to select which endpoint and parameter set to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select POST endpoint to test:",
            choices: [
              ...commentTests.POST.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get endpoint
        let endpoint = commentTests.POST.endpoints[endpointChoice];
        let isUserTaskComment = endpoint.includes("user-task-comment");
        
        // Select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select parameter set to test:",
            choices: [
              ...commentTests.POST.parameterSets.map((set, index) => ({
                name: `${set.name} - ${set.description}`,
                value: index
              })),
              {
                name: "Compare All Parameter Sets",
                value: "all"
              },
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (paramSetChoice === "back") {
          continue;
        }
        
        if (paramSetChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Get task IDs for the comment
        console.log(chalk.blue("\nFetching existing tasks..."));
        const taskIds = await getExistingTaskIds();
        
        if (taskIds.length === 0) {
          console.log(chalk.yellow("\nNo tasks found. Creating a fallback task ID..."));
          taskIds.push("67d2c7ed664c5cbba91de430"); // Use a fallback ID
        }
        
        // Select a task for the comment
        const { taskId } = await inquirer.prompt([
          {
            type: "list",
            name: "taskId",
            message: "Select task for the comment:",
            choices: taskIds.map((id, index) => ({
              name: `Task ${index + 1}: ${id}`,
              value: id
            }))
          }
        ]);
        
        // Update parameter sets with the selected task ID and user ID
        let updatedParameterSets = JSON.parse(JSON.stringify(commentTests.POST.parameterSets));
        updatedParameterSets = updatedParameterSets.map(set => {
          if (isUserTaskComment) {
            // For user-task-comment endpoint, only taskId is needed
            set.data.taskId = taskId;
            delete set.data.userId; // Remove userId as it's taken from auth token
          } else {
            // For regular comment endpoint
            set.data.taskId = taskId;
            set.data.userId = currentUser.id;
          }
          return set;
        });
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        if (paramSetChoice === "all") {
          // Run tests for all parameter sets and compare results
          console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
          
          const allResults = [];
          const spinner = ora('Preparing comparison tests...').start();
          
          for (let i = 0; i < updatedParameterSets.length; i++) {
            const paramSet = updatedParameterSets[i];
            spinner.text = `Testing parameter set: ${paramSet.name}`;
            
            const result = await runStressTest(
              httpMethod, 
              endpoint, 
              intensity, 
              commentTests.POST.requiresAuth, 
              paramSet.data
            );
            
            allResults.push({
              name: paramSet.name,
              description: paramSet.description,
              results: result
            });
          }
          
          spinner.succeed('All parameter set tests completed');
          
          // Display comparison results
          console.log(chalk.green("\n✅ Comment Parameter Test Comparison Complete"));
          
          // Create comparison table
          const comparisonData = [
            ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
          ];
          
          allResults.forEach(result => {
            const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
            comparisonData.push([
              result.name,
              result.results.avgResponseTime.toFixed(2),
              `${successRate}%`,
              result.results.minResponseTime,
              result.results.maxResponseTime
            ]);
          });
          
          console.log(table(comparisonData));
          
          // Find the slowest parameter set
          const slowestSet = allResults.reduce((prev, current) => 
            prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
          );
          
          console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
          console.log(chalk.gray(`Description: ${slowestSet.description}`));
          console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
          
          // Save comparison results to file
          const resultsDir = path.join(__dirname, "results");
          fs.ensureDirSync(resultsDir);
          
          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
          const resultsFile = path.join(
            resultsDir, 
            `comment-comparison-${intensity.toLowerCase()}-${timestamp}.json`
          );
          
          fs.writeJsonSync(resultsFile, {
            timestamp: new Date().toISOString(),
            endpoint,
            method: httpMethod,
            intensity,
            parameterSets: updatedParameterSets.map(set => set.name),
            results: allResults
          }, { spaces: 2 });
          
          console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
        } else {
          // Run test for a single parameter set
          const paramSet = updatedParameterSets[paramSetChoice];
          console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
          console.log(chalk.gray(`Parameter set: ${paramSet.name}`));
          console.log(chalk.gray(`Task ID: ${taskId}`));
          
          const results = await runStressTest(
            httpMethod, 
            endpoint, 
            intensity, 
            commentTests.POST.requiresAuth, 
            paramSet.data
          );
          
          displayResults(results, httpMethod, endpoint, intensity);
        }
        
      } else if (httpMethod === "POST_ATTACHMENT") {
        // For POST_ATTACHMENT, we need to fetch existing comments first
        console.log(chalk.blue("\nFetching existing comments..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get tasks first
        console.log(chalk.blue("Fetching tasks..."));
        const taskIds = await getExistingTaskIds();
        
        if (taskIds.length === 0) {
          console.log(chalk.yellow("\nNo tasks found. Creating a fallback task ID..."));
          taskIds.push("67d2c7ed664c5cbba91de430"); // Use a fallback ID
        }
        
        // Select a task to get comments for
        const { taskId } = await inquirer.prompt([
          {
            type: "list",
            name: "taskId",
            message: "Select task to get comments from:",
            choices: taskIds.map((id, index) => ({
              name: `Task ${index + 1}: ${id}`,
              value: id
            }))
          }
        ]);
        
        // Get comments for the selected task
        let comments = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Comment/task/${taskId}`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            comments = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              comments = response.data.data;
            } else if (response.data.comments && Array.isArray(response.data.comments)) {
              comments = response.data.comments;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              comments = response.data.items;
            }
          }
          
          // Debug the response structure
          console.log(chalk.gray(`Comments response type: ${typeof response.data}`));
          if (typeof response.data === 'object') {
            console.log(chalk.gray(`Comments response structure: ${Array.isArray(response.data) ? 'Array' : 'Object with keys: ' + Object.keys(response.data).join(', ')}`));
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching comments: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // If no comments found, create a new comment
        if (!Array.isArray(comments) || comments.length === 0) {
          console.log(chalk.yellow("\nNo comments found. Creating a new comment..."));
          
          try {
            const createCommentResponse = await axios({
              method: 'POST',
              url: `${process.env.BASE_URL}/api/Comment`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              },
              data: {
                taskId: taskId,
                userId: currentUser.id,
                content: "This is a test comment created for attachment testing"
              }
            });
            
            if (createCommentResponse.data && createCommentResponse.data.id) {
              comments = [createCommentResponse.data];
              console.log(chalk.green(`Created new comment with ID: ${createCommentResponse.data.id}`));
            } else {
              console.log(chalk.yellow("Could not create a new comment. Using fallback comment."));
              comments = [{
                id: "67d2c7ed664c5cbba91de440",
                content: "Fallback comment"
              }];
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError creating comment: ${error.message}`));
            console.log(chalk.yellow("Using fallback comment."));
            comments = [{
              id: "67d2c7ed664c5cbba91de440",
              content: "Fallback comment"
            }];
          }
        }
        
        // Select a comment to add attachment to
        const { commentId } = await inquirer.prompt([
          {
            type: "list",
            name: "commentId",
            message: "Select comment to add attachment to:",
            choices: comments.map(comment => ({
              name: `${comment.content.substring(0, 30)}... (ID: ${comment.id})`,
              value: comment.id
            }))
          }
        ]);
        
        // Get the endpoint and update it with the comment ID
        const endpoint = commentTests.POST_ATTACHMENT.endpoints[0].replace("{commentId}", commentId);
        
        // Get parameter sets
        const parameterSets = commentTests.POST_ATTACHMENT.parameterSets;
        
        // Select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select attachment type to add:",
            choices: parameterSets.map((set, index) => ({
              name: `${set.name} - ${set.description}`,
              value: index
            }))
          }
        ]);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning POST test on ${endpoint}...`));
        console.log(chalk.gray(`Adding attachment to comment with ID: ${commentId}`));
        
        const results = await runStressTest(
          "POST", 
          endpoint, 
          intensity, 
          commentTests.POST_ATTACHMENT.requiresAuth, 
          parameterSets[paramSetChoice].data
        );
        
        displayResults(results, "POST", endpoint, intensity);
        
      } else if (httpMethod === "DELETE") {
        // For DELETE, we need to fetch existing comments to delete
        console.log(chalk.blue("\nFetching existing comments..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get tasks first
        console.log(chalk.blue("Fetching tasks..."));
        const taskIds = await getExistingTaskIds();
        
        if (taskIds.length === 0) {
          console.log(chalk.yellow("\nNo tasks found. Creating a fallback task ID..."));
          taskIds.push("67d2c7ed664c5cbba91de430"); // Use a fallback ID
        }
        
        // Select a task to get comments for
        const { taskId } = await inquirer.prompt([
          {
            type: "list",
            name: "taskId",
            message: "Select task to get comments from:",
            choices: taskIds.map((id, index) => ({
              name: `Task ${index + 1}: ${id}`,
              value: id
            }))
          }
        ]);
        
        // Get comments for the selected task
        let comments = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Comment/task/${taskId}`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            comments = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              comments = response.data.data;
            } else if (response.data.comments && Array.isArray(response.data.comments)) {
              comments = response.data.comments;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              comments = response.data.items;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching comments: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // If no comments found, create a new comment
        if (!Array.isArray(comments) || comments.length === 0) {
          console.log(chalk.yellow("\nNo comments found. Creating a new comment..."));
          
          try {
            const createCommentResponse = await axios({
              method: 'POST',
              url: `${process.env.BASE_URL}/api/Comment`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              },
              data: {
                taskId: taskId,
                userId: currentUser.id,
                content: "This is a test comment created for deletion testing"
              }
            });
            
            if (createCommentResponse.data && createCommentResponse.data.id) {
              comments = [createCommentResponse.data];
              console.log(chalk.green(`Created new comment with ID: ${createCommentResponse.data.id}`));
            } else {
              console.log(chalk.yellow("Could not create a new comment. Using fallback comment."));
              comments = [{
                id: "67d2c7ed664c5cbba91de440",
                content: "Fallback comment"
              }];
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError creating comment: ${error.message}`));
            console.log(chalk.yellow("Using fallback comment."));
            comments = [{
              id: "67d2c7ed664c5cbba91de440",
              content: "Fallback comment"
            }];
          }
        }
        
        // Select a comment to delete
        const { commentId } = await inquirer.prompt([
          {
            type: "list",
            name: "commentId",
            message: "Select comment to delete:",
            choices: comments.map(comment => ({
              name: `${comment.content.substring(0, 30)}... (ID: ${comment.id})`,
              value: comment.id
            }))
          }
        ]);
        
        // Update the endpoint with the selected comment ID
        const endpoint = commentTests.DELETE.endpoints[0].replace("{id}", commentId);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Deleting comment with ID: ${commentId}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          commentTests.DELETE.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
      }
    } else if (apiCategory === "Feedback") {
      // Handle Feedback API testing
      const feedbackTests = categoryTests;
      
      if (httpMethod === "GET") {
        // For GET, we need to select which endpoint to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select GET endpoint to test:",
            choices: [
              ...feedbackTests.GET.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        let endpoint = feedbackTests.GET.endpoints[endpointChoice];
        
        // Handle different GET endpoints
        if (endpoint.includes("status")) {
          // For getting feedbacks with a specific status
          const { status } = await inquirer.prompt([
            {
              type: "list",
              name: "status",
              message: "Select feedback status to filter by:",
              choices: ["New", "Read", "Responded", "Archived", "All"]
            }
          ]);
          
          if (status !== "All") {
            endpoint = `${endpoint}?status=${status}`;
          }
        }
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          feedbackTests.GET.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "POST") {
        // For POST, we need to select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select parameter set to test:",
            choices: [
              ...feedbackTests.POST.parameterSets.map((set, index) => ({
                name: `${set.name} - ${set.description}`,
                value: index
              })),
              {
                name: "Compare All Parameter Sets",
                value: "all"
              },
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (paramSetChoice === "back") {
          continue;
        }
        
        if (paramSetChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Update parameter sets with the current user information
        let updatedParameterSets = JSON.parse(JSON.stringify(feedbackTests.POST.parameterSets));
        updatedParameterSets = updatedParameterSets.map(set => {
          set.data.userId = currentUser.id;
          set.data.userName = currentUser.username || currentUser.name || "Test User";
          set.data.userRole = currentUser.role || "User";
          return set;
        });
        
        // Get endpoint
        const endpoint = feedbackTests.POST.endpoints[0];
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        if (paramSetChoice === "all") {
          // Run tests for all parameter sets and compare results
          console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
          
          const allResults = [];
          const spinner = ora('Preparing comparison tests...').start();
          
          for (let i = 0; i < updatedParameterSets.length; i++) {
            const paramSet = updatedParameterSets[i];
            spinner.text = `Testing parameter set: ${paramSet.name}`;
            
            const result = await runStressTest(
              httpMethod, 
              endpoint, 
              intensity, 
              feedbackTests.POST.requiresAuth, 
              paramSet.data
            );
            
            allResults.push({
              name: paramSet.name,
              description: paramSet.description,
              results: result
            });
          }
          
          spinner.succeed('All parameter set tests completed');
          
          // Display comparison results
          console.log(chalk.green("\n✅ Feedback Parameter Test Comparison Complete"));
          
          // Create comparison table
          const comparisonData = [
            ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
          ];
          
          allResults.forEach(result => {
            const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
            comparisonData.push([
              result.name,
              result.results.avgResponseTime.toFixed(2),
              `${successRate}%`,
              result.results.minResponseTime,
              result.results.maxResponseTime
            ]);
          });
          
          console.log(table(comparisonData));
          
          // Find the slowest parameter set
          const slowestSet = allResults.reduce((prev, current) => 
            prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
          );
          
          console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
          console.log(chalk.gray(`Description: ${slowestSet.description}`));
          console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
          
          // Save comparison results to file
          const resultsDir = path.join(__dirname, "results");
          fs.ensureDirSync(resultsDir);
          
          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
          const resultsFile = path.join(
            resultsDir, 
            `feedback-comparison-${intensity.toLowerCase()}-${timestamp}.json`
          );
          
          fs.writeJsonSync(resultsFile, {
            timestamp: new Date().toISOString(),
            endpoint,
            method: httpMethod,
            intensity,
            parameterSets: updatedParameterSets.map(set => set.name),
            results: allResults
          }, { spaces: 2 });
          
          console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
        } else {
          // Run test for a single parameter set
          const paramSet = updatedParameterSets[paramSetChoice];
          console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
          console.log(chalk.gray(`Parameter set: ${paramSet.name}`));
          console.log(chalk.gray(`User: ${paramSet.data.userName} (${paramSet.data.userId})`));
          
          const results = await runStressTest(
            httpMethod, 
            endpoint, 
            intensity, 
            feedbackTests.POST.requiresAuth, 
            paramSet.data
          );
          
          displayResults(results, httpMethod, endpoint, intensity);
        }
        
      } else if (httpMethod === "PUT") {
        // For PUT, we need to fetch existing feedbacks to update
        console.log(chalk.blue("\nFetching existing feedbacks..."));
        
        // Get feedbacks
        let feedbacks = [];
        try {
          // Try to get all feedbacks (admin only)
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Feedback`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            feedbacks = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              feedbacks = response.data.data;
            } else if (response.data.feedbacks && Array.isArray(response.data.feedbacks)) {
              feedbacks = response.data.feedbacks;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              feedbacks = response.data.items;
            }
          }
          
          // Debug the response structure
          console.log(chalk.gray(`Feedbacks response type: ${typeof response.data}`));
          if (typeof response.data === 'object') {
            console.log(chalk.gray(`Feedbacks response structure: ${Array.isArray(response.data) ? 'Array' : 'Object with keys: ' + Object.keys(response.data).join(', ')}`));
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching feedbacks: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
          
          // Try to get public feedbacks as fallback
          try {
            console.log(chalk.yellow("\nTrying to fetch public feedbacks instead..."));
            const publicResponse = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/Feedback/public`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(publicResponse.data)) {
              feedbacks = publicResponse.data;
            } else if (publicResponse.data && typeof publicResponse.data === 'object') {
              if (Array.isArray(publicResponse.data.data)) {
                feedbacks = publicResponse.data.data;
              } else if (publicResponse.data.feedbacks && Array.isArray(publicResponse.data.feedbacks)) {
                feedbacks = publicResponse.data.feedbacks;
              } else if (publicResponse.data.items && Array.isArray(publicResponse.data.items)) {
                feedbacks = publicResponse.data.items;
              }
            }
          } catch (publicError) {
            console.log(chalk.red(`\nError fetching public feedbacks: ${publicError.message}`));
          }
        }
        
        // If no feedbacks found, create a fallback feedback
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
          console.log(chalk.yellow("\nNo feedbacks found. Creating a fallback feedback..."));
          feedbacks = [{
            id: "67d2c7ed664c5cbba91de450",
            content: "Fallback feedback for testing",
            userId: "67d2c7ed664c5cbba91de412",
            userName: "Test User",
            rating: 4,
            status: "New"
          }];
        }
        
        // Select a feedback to update
        const { feedbackId } = await inquirer.prompt([
          {
            type: "list",
            name: "feedbackId",
            message: "Select feedback to update:",
            choices: feedbacks.map(feedback => ({
              name: `${feedback.content.substring(0, 30)}... (Rating: ${feedback.rating}, Status: ${feedback.status})`,
              value: feedback.id
            }))
          }
        ]);
        
        // Select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select update type:",
            choices: feedbackTests.PUT.parameterSets.map((set, index) => ({
              name: `${set.name} - ${set.description}`,
              value: index
            }))
          }
        ]);
        
        // Update the endpoint with the selected feedback ID
        const endpoint = feedbackTests.PUT.endpoints[0].replace("{id}", feedbackId);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Updating feedback with ID: ${feedbackId}`));
        console.log(chalk.gray(`Update type: ${feedbackTests.PUT.parameterSets[paramSetChoice].name}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          feedbackTests.PUT.requiresAuth, 
          feedbackTests.PUT.parameterSets[paramSetChoice].data
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "DELETE") {
        // For DELETE, we need to fetch existing feedbacks to delete
        console.log(chalk.blue("\nFetching existing feedbacks..."));
        
        // Get feedbacks
        let feedbacks = [];
        try {
          // Try to get all feedbacks (admin only)
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/Feedback`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            feedbacks = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              feedbacks = response.data.data;
            } else if (response.data.feedbacks && Array.isArray(response.data.feedbacks)) {
              feedbacks = response.data.feedbacks;
            } else if (response.data.items && Array.isArray(response.data.items)) {
              feedbacks = response.data.items;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching feedbacks: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // If no feedbacks found, create a fallback feedback
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
          console.log(chalk.yellow("\nNo feedbacks found. Creating a fallback feedback..."));
          feedbacks = [{
            id: "67d2c7ed664c5cbba91de450",
            content: "Fallback feedback for testing",
            userId: "67d2c7ed664c5cbba91de412",
            userName: "Test User",
            rating: 4,
            status: "New"
          }];
        }
        
        // Select a feedback to delete
        const { feedbackId } = await inquirer.prompt([
          {
            type: "list",
            name: "feedbackId",
            message: "Select feedback to delete:",
            choices: feedbacks.map(feedback => ({
              name: `${feedback.content.substring(0, 30)}... (Rating: ${feedback.rating}, Status: ${feedback.status})`,
              value: feedback.id
            }))
          }
        ]);
        
        // Update the endpoint with the selected feedback ID
        const endpoint = feedbackTests.DELETE.endpoints[0].replace("{id}", feedbackId);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Deleting feedback with ID: ${feedbackId}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          feedbackTests.DELETE.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
      }
    } else if (apiCategory === "Team") {
      // Handle Team API testing
      const teamTests = categoryTests;
      
      if (httpMethod === "GET") {
        // For GET, we need to select which endpoint to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select GET endpoint to test:",
            choices: [
              ...teamTests.GET.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        let endpoint = teamTests.GET.endpoints[endpointChoice];
        
        // Handle different GET endpoints
        if (endpoint.includes("{id}")) {
          // For getting a specific team by ID
          console.log(chalk.blue("\nFetching existing teams..."));
          
          // Get current user
          const currentUser = await getCurrentUser();
          
          // Get teams
          let teams = [];
          try {
            const response = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/Team`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(response.data)) {
              teams = response.data;
            } else if (response.data && typeof response.data === 'object') {
              if (Array.isArray(response.data.data)) {
                teams = response.data.data;
              } else if (response.data.teams && Array.isArray(response.data.teams)) {
                teams = response.data.teams;
              } else if (response.data.items && Array.isArray(response.data.items)) {
                teams = response.data.items;
              }
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError fetching teams: ${error.message}`));
            if (error.response) {
              console.log(chalk.red(`Status: ${error.response.status}`));
              console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
            }
          }
          
          // If no teams found, create a fallback team
          if (!Array.isArray(teams) || teams.length === 0) {
            console.log(chalk.yellow("\nNo teams found. Creating a fallback team ID..."));
            teams = [{
              id: "67d2c7ed664c5cbba91de460",
              name: "Fallback Team"
            }];
          }
          
          // Select a team
          const { teamId } = await inquirer.prompt([
            {
              type: "list",
              name: "teamId",
              message: "Select team:",
              choices: teams.map(team => ({
                name: team.name || `Team ${team.id}`,
                value: team.id
              }))
            }
          ]);
          
          // Update the endpoint with the selected team ID
          endpoint = endpoint.replace("{id}", teamId);
          
        } else if (endpoint.includes("{teamId}")) {
          // For getting members of a specific team
          console.log(chalk.blue("\nFetching existing teams..."));
          
          // Get current user
          const currentUser = await getCurrentUser();
          
          // Get teams
          let teams = [];
          try {
            const response = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/Team`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(response.data)) {
              teams = response.data;
            } else if (response.data && typeof response.data === 'object') {
              if (Array.isArray(response.data.data)) {
                teams = response.data.data;
              } else if (response.data.teams && Array.isArray(response.data.teams)) {
                teams = response.data.teams;
              } else if (response.data.items && Array.isArray(response.data.items)) {
                teams = response.data.items;
              }
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError fetching teams: ${error.message}`));
            if (error.response) {
              console.log(chalk.red(`Status: ${error.response.status}`));
              console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
            }
          }
          
          // If no teams found, create a fallback team
          if (!Array.isArray(teams) || teams.length === 0) {
            console.log(chalk.yellow("\nNo teams found. Creating a fallback team ID..."));
            teams = [{
              id: "67d2c7ed664c5cbba91de460",
              name: "Fallback Team"
            }];
          }
          
          // Select a team
          const { teamId } = await inquirer.prompt([
            {
              type: "list",
              name: "teamId",
              message: "Select team to get members for:",
              choices: teams.map(team => ({
                name: team.name || `Team ${team.id}`,
                value: team.id
              }))
            }
          ]);
          
          // Update the endpoint with the selected team ID
          endpoint = endpoint.replace("{teamId}", teamId);
          
        } else if (endpoint.includes("{department}")) {
          // For getting members by department
          console.log(chalk.blue("\nFetching available departments..."));
          
          // Try to get departments
          let departments = [];
          try {
            const response = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/Team/departments`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(response.data)) {
              departments = response.data;
            } else if (response.data && typeof response.data === 'object') {
              if (Array.isArray(response.data.data)) {
                departments = response.data.data;
              } else if (response.data.departments && Array.isArray(response.data.departments)) {
                departments = response.data.departments;
              }
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError fetching departments: ${error.message}`));
          }
          
          // If no departments found, use fallback departments
          if (!Array.isArray(departments) || departments.length === 0) {
            console.log(chalk.yellow("\nNo departments found. Using fallback departments..."));
            departments = ["Engineering", "Marketing", "Sales", "HR", "Finance"];
          }
          
          // Select a department
          const { department } = await inquirer.prompt([
            {
              type: "list",
              name: "department",
              message: "Select department:",
              choices: departments
            }
          ]);
          
          // Update the endpoint with the selected department
          endpoint = endpoint.replace("{department}", department);
        }
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          teamTests.GET.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
      }
    } else if (apiCategory === "CalendarEvent") {
      // Handle CalendarEvent API testing
      const calendarEventTests = categoryTests;
      
      if (httpMethod === "GET") {
        // For GET, we need to select which endpoint to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select GET endpoint to test:",
            choices: [
              ...calendarEventTests.GET.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        let endpoint = calendarEventTests.GET.endpoints[endpointChoice];
        
        // Handle different GET endpoints
        if (endpoint.includes("{id}")) {
          // For getting a specific event by ID, we need to fetch existing events first
          console.log(chalk.blue("\nFetching existing calendar events..."));
          
          // Get current user
          const currentUser = await getCurrentUser();
          
          // Get calendar events
          let events = [];
          try {
            const response = await axios({
              method: 'GET',
              url: `${process.env.BASE_URL}/api/calendar/events?startDate=2025-01-01&endDate=2025-12-31`,
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            });
            
            if (Array.isArray(response.data)) {
              events = response.data;
            } else if (response.data && typeof response.data === 'object') {
              if (Array.isArray(response.data.data)) {
                events = response.data.data;
              } else if (response.data.events && Array.isArray(response.data.events)) {
                events = response.data.events;
              }
            }
            
          } catch (error) {
            console.log(chalk.red(`\nError fetching events: ${error.message}`));
            if (error.response) {
              console.log(chalk.red(`Status: ${error.response.status}`));
              console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
            }
          }
          
          // Ensure events is an array
          if (!Array.isArray(events)) {
            console.log(chalk.yellow("Could not extract events array from response. Creating a fallback array."));
            events = [];
          }
          
          // Filter valid event objects
          events = events.filter(event => 
            event && 
            typeof event === 'object' && 
            event.id
          );
          
          // If no events found, create fallback events
          if (events.length === 0) {
            console.log(chalk.yellow("\nNo events found. Creating fallback test events..."));
            events.push({
              id: "67d2c7ed664c5cbba91de415",
              title: "Test Meeting 1",
              description: "This is a test meeting",
              startDate: "2025-04-01",
              endDate: "2025-04-01",
              startTime: "10:00",
              endTime: "11:00",
              priority: "Medium",
              category: "meeting",
              createdBy: currentUser.id
            });
            
            events.push({
              id: "67d2c7ed664c5cbba91de416",
              title: "Test Meeting 2",
              description: "This is another test meeting",
              startDate: "2025-04-02",
              endDate: "2025-04-02",
              startTime: "14:00",
              endTime: "15:00",
              priority: "High",
              category: "meeting",
              createdBy: currentUser.id
            });
          }
          
          // Select an event
          const { eventId } = await inquirer.prompt([
            {
              type: "list",
              name: "eventId",
              message: "Select event to view:",
              choices: events.map(event => ({
                name: `${event.title} (${event.startDate} ${event.startTime})`,
                value: event.id
              }))
            }
          ]);
          
          // Update the endpoint with the selected event ID
          endpoint = endpoint.replace("{id}", eventId);
        }
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          calendarEventTests.GET.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "POST") {
        // For POST, we need to select which endpoint and parameter set to test
        const { endpointChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "endpointChoice",
            message: "Select POST endpoint to test:",
            choices: [
              ...calendarEventTests.POST.endpoints.map((endpoint, index) => ({
                name: endpoint,
                value: index
              })),
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (endpointChoice === "back") {
          continue;
        }
        
        if (endpointChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        const endpoint = calendarEventTests.POST.endpoints[endpointChoice];
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Select which parameter set to test
        const { paramSetChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "paramSetChoice",
            message: "Select parameter set to test:",
            choices: [
              ...calendarEventTests.POST.parameterSets.map((set, index) => ({
                name: `${set.name} - ${set.description}`,
                value: index
              })),
              {
                name: "Compare All Parameter Sets",
                value: "all"
              },
              {
                name: "Back",
                value: "back"
              },
              {
                name: "Exit",
                value: "exit"
              }
            ]
          }
        ]);
        
        if (paramSetChoice === "back") {
          continue;
        }
        
        if (paramSetChoice === "exit") {
          continueTestingFlag = false;
          break;
        }
        
        // Update parameter sets with the current user's ID
        let updatedParameterSets = JSON.parse(JSON.stringify(calendarEventTests.POST.parameterSets));
        updatedParameterSets = updatedParameterSets.map(set => {
          set.data.createdBy = currentUser.id;
          
          // If it's a team event, fetch a team ID
          if (endpoint.includes("team") && set.data.teamId === "") {
            // Fetch teams or use a fallback ID
            set.data.teamId = "67d2c7ed664c5cbba91de417"; // Fallback team ID
          }
          
          return set;
        });
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        if (paramSetChoice === "all") {
          // Run tests for all parameter sets and compare results
          console.log(chalk.blue("\nRunning comparison tests for all parameter sets..."));
          
          const allResults = [];
          const spinner = ora('Preparing comparison tests...').start();
          
          for (let i = 0; i < updatedParameterSets.length; i++) {
            const paramSet = updatedParameterSets[i];
            spinner.text = `Testing parameter set: ${paramSet.name}`;
            
            const result = await runStressTest(
              httpMethod, 
              endpoint, 
              intensity, 
              calendarEventTests.POST.requiresAuth, 
              paramSet.data
            );
            
            allResults.push({
              name: paramSet.name,
              description: paramSet.description,
              results: result
            });
          }
          
          spinner.succeed('All parameter set tests completed');
          
          // Display comparison results
          console.log(chalk.green("\n✅ Calendar Event Parameter Test Comparison Complete"));
          
          // Create comparison table
          const comparisonData = [
            ["Parameter Set", "Avg Response Time (ms)", "Success Rate", "Min Time (ms)", "Max Time (ms)"]
          ];
          
          allResults.forEach(result => {
            const successRate = ((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(2);
            comparisonData.push([
              result.name,
              result.results.avgResponseTime.toFixed(2),
              `${successRate}%`,
              result.results.minResponseTime,
              result.results.maxResponseTime
            ]);
          });
          
          console.log(table(comparisonData));
          
          // Find the slowest parameter set
          const slowestSet = allResults.reduce((prev, current) => 
            prev.results.avgResponseTime > current.results.avgResponseTime ? prev : current
          );
          
          console.log(chalk.yellow(`\nHighest API Load: ${slowestSet.name}`));
          console.log(chalk.gray(`Description: ${slowestSet.description}`));
          console.log(chalk.gray(`Average Response Time: ${slowestSet.results.avgResponseTime.toFixed(2)} ms`));
          
          // Save comparison results to file
          const resultsDir = path.join(__dirname, "results");
          fs.ensureDirSync(resultsDir);
          
          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
          const resultsFile = path.join(
            resultsDir, 
            `calendar-event-comparison-${intensity.toLowerCase()}-${timestamp}.json`
          );
          
          fs.writeJsonSync(resultsFile, {
            timestamp: new Date().toISOString(),
            endpoint,
            method: httpMethod,
            intensity,
            parameterSets: updatedParameterSets.map(set => set.name),
            results: allResults
          }, { spaces: 2 });
          
          console.log(chalk.gray(`\nComparison results saved to: ${resultsFile}`));
        } else {
          // Run test for a single parameter set
          const paramSet = updatedParameterSets[paramSetChoice];
          console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
          console.log(chalk.gray(`Parameter set: ${paramSet.name}`));
          
          const results = await runStressTest(
            httpMethod, 
            endpoint, 
            intensity, 
            calendarEventTests.POST.requiresAuth, 
            paramSet.data
          );
          
          displayResults(results, httpMethod, endpoint, intensity);
        }
        
      } else if (httpMethod === "PUT") {
        // For PUT, we need to fetch existing events to update
        console.log(chalk.blue("\nFetching existing calendar events..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get calendar events
        let events = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/calendar/events?startDate=2025-01-01&endDate=2025-12-31`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            events = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              events = response.data.data;
            } else if (response.data.events && Array.isArray(response.data.events)) {
              events = response.data.events;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching events: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // Ensure events is an array
        if (!Array.isArray(events)) {
          console.log(chalk.yellow("Could not extract events array from response. Creating a fallback array."));
          events = [];
        }
        
        // Filter events created by the current user
        events = events.filter(event => 
          event && 
          typeof event === 'object' && 
          event.id && 
          event.createdBy === currentUser.id
        );
        
        // If no events found, create fallback events
        if (events.length === 0) {
          console.log(chalk.yellow("\nNo events found that you can update. Creating fallback test events..."));
          events.push({
            id: "67d2c7ed664c5cbba91de415",
            title: "Test Meeting 1",
            description: "This is a test meeting",
            startDate: "2025-04-01",
            endDate: "2025-04-01",
            startTime: "10:00",
            endTime: "11:00",
            priority: "Medium",
            category: "meeting",
            createdBy: currentUser.id
          });
          
          events.push({
            id: "67d2c7ed664c5cbba91de416",
            title: "Test Meeting 2",
            description: "This is another test meeting",
            startDate: "2025-04-02",
            endDate: "2025-04-02",
            startTime: "14:00",
            endTime: "15:00",
            priority: "High",
            category: "meeting",
            createdBy: currentUser.id
          });
        }
        
        // Select an event to update
        const { eventId } = await inquirer.prompt([
          {
            type: "list",
            name: "eventId",
            message: "Select event to update:",
            choices: events.map(event => ({
              name: `${event.title} (${event.startDate} ${event.startTime})`,
              value: event.id
            }))
          }
        ]);
        
        // Update the endpoint with the selected event ID
        const endpoint = calendarEventTests.PUT.endpoints[0].replace("{id}", eventId);
        
        // Get the selected event
        const selectedEvent = events.find(event => event.id === eventId);
        
        // Update the parameter set with the selected event's data
        let paramSet = JSON.parse(JSON.stringify(calendarEventTests.PUT.parameterSets[0]));
        paramSet.data = {
          ...selectedEvent,
          title: `Updated: ${selectedEvent.title}`,
          description: `Updated: ${selectedEvent.description}`
        };
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Updating event: ${paramSet.data.title}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          calendarEventTests.PUT.requiresAuth, 
          paramSet.data
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
        
      } else if (httpMethod === "DELETE") {
        // For DELETE, we need to fetch existing events to delete
        console.log(chalk.blue("\nFetching existing calendar events..."));
        
        // Get current user
        const currentUser = await getCurrentUser();
        
        // Get calendar events
        let events = [];
        try {
          const response = await axios({
            method: 'GET',
            url: `${process.env.BASE_URL}/api/calendar/events?startDate=2025-01-01&endDate=2025-12-31`,
            headers: {
              'Authorization': `Bearer ${jwtToken}`
            }
          });
          
          if (Array.isArray(response.data)) {
            events = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if (Array.isArray(response.data.data)) {
              events = response.data.data;
            } else if (response.data.events && Array.isArray(response.data.events)) {
              events = response.data.events;
            }
          }
          
        } catch (error) {
          console.log(chalk.red(`\nError fetching events: ${error.message}`));
          if (error.response) {
            console.log(chalk.red(`Status: ${error.response.status}`));
            console.log(chalk.gray(`Response data: ${JSON.stringify(error.response.data || {})}`));
          }
        }
        
        // Ensure events is an array
        if (!Array.isArray(events)) {
          console.log(chalk.yellow("Could not extract events array from response. Creating a fallback array."));
          events = [];
        }
        
        // Filter events created by the current user
        events = events.filter(event => 
          event && 
          typeof event === 'object' && 
          event.id && 
          event.createdBy === currentUser.id
        );
        
        // If no events found, create fallback events
        if (events.length === 0) {
          console.log(chalk.yellow("\nNo events found that you can delete. Creating fallback test events..."));
          events.push({
            id: "67d2c7ed664c5cbba91de415",
            title: "Test Meeting 1",
            description: "This is a test meeting",
            startDate: "2025-04-01",
            endDate: "2025-04-01",
            startTime: "10:00",
            endTime: "11:00",
            priority: "Medium",
            category: "meeting",
            createdBy: currentUser.id
          });
          
          events.push({
            id: "67d2c7ed664c5cbba91de416",
            title: "Test Meeting 2",
            description: "This is another test meeting",
            startDate: "2025-04-02",
            endDate: "2025-04-02",
            startTime: "14:00",
            endTime: "15:00",
            priority: "High",
            category: "meeting",
            createdBy: currentUser.id
          });
        }
        
        // Select an event to delete
        const { eventId } = await inquirer.prompt([
          {
            type: "list",
            name: "eventId",
            message: "Select event to delete:",
            choices: events.map(event => ({
              name: `${event.title} (${event.startDate} ${event.startTime})`,
              value: event.id
            }))
          }
        ]);
        
        // Update the endpoint with the selected event ID
        const endpoint = calendarEventTests.DELETE.endpoints[0].replace("{id}", eventId);
        
        // Select test intensity
        const { intensity } = await inquirer.prompt([{
          type: "list",
          name: "intensity",
          message: "Select test intensity:",
          choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
        }]);
        
        if (intensity === "Back") {
          continue;
        }
        
        if (intensity === "Exit") {
          continueTestingFlag = false;
          break;
        }
        
        console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
        console.log(chalk.gray(`Deleting event with ID: ${eventId}`));
        
        const results = await runStressTest(
          httpMethod, 
          endpoint, 
          intensity, 
          calendarEventTests.DELETE.requiresAuth, 
          null
        );
        
        displayResults(results, httpMethod, endpoint, intensity);
      }
    } else {
      // For other methods, implement basic stress testing
      const endpoint = `/api/${apiCategory}s`;
      
      // Select test intensity
      const { intensity } = await inquirer.prompt([{
        type: "list",
        name: "intensity",
        message: "Select test intensity:",
        choices: [...Object.keys(TEST_INTENSITIES), "Back", "Exit"]
      }]);
      
      if (intensity === "Back") {
        continue;
      }
      
      if (intensity === "Exit") {
        continueTestingFlag = false;
        break;
      }
      
      console.log(chalk.blue(`\nRunning ${httpMethod} test on ${endpoint}...`));
      
      // For GET and DELETE, we don't need request body data
      const results = await runStressTest(
        httpMethod, 
        endpoint, 
        intensity, 
        true, // requiresAuth
        httpMethod === "GET" || httpMethod === "DELETE" ? null : { /* Default data for PUT */ }
      );
      
      displayResults(results, httpMethod, endpoint, intensity);
      
      // Ask if user wants to continue or go back
      const { action } = await inquirer.prompt([{
        type: "list",
        name: "action",
        message: "What would you like to do next?",
        choices: ["Test Another Intensity", "Back to Method Selection", "Back to Main Menu", "Exit"]
      }]);
      
      if (action === "Test Another Intensity") {
        continue;
      } else if (action === "Back to Method Selection") {
        continue;
      } else if (action === "Back to Main Menu") {
        continue;
      } else {
        continueTestingFlag = false;
        break;
      }
    }
  }

  console.log(chalk.green("\nThank you for using Dynamic Task Test!"));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  process.exit(1);
});
