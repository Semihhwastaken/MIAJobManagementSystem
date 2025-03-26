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
        choices: ["Task", "Exit"]
      }
    ]);
    
    if (apiCategory === "Exit") {
      continueTestingFlag = false;
      break;
    }

    // Then select the HTTP method
    const { httpMethod } = await inquirer.prompt([
      {
        type: "list",
        name: "httpMethod",
        message: `Select ${apiCategory} API method to test:`,
        choices: ["GET", "POST", "PUT", "DELETE", "Back", "Exit"]
      }
    ]);
    
    if (httpMethod === "Back") {
      continue;
    }
    
    if (httpMethod === "Exit") {
      continueTestingFlag = false;
      break;
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
          endpoint: endpoint,
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
