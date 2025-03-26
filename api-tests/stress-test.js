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
        console.log(chalk.gray(`[${makeRequest.counter}] Data: ${JSON.stringify(data).substring(0, 50)}...`));
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
      // Eğer 415 hatası alındıysa, Content-Type ile ilgili bilgilendirme ekle
      if (error.response.status === 415) {
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

// Main function
async function main() {
  // Print app banner
  console.log("\n");
  console.log(chalk.cyan(figlet.textSync("API Stress Tester", { font: "Standard" })));
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
  
  // Add a helper function to ensure arrays
  const ensureArray = (value) => Array.isArray(value) ? value : [];

  while (continueTestingFlag) {
    // Filter out special sections from API type choices
    const apiTypeChoices = Object.keys(API_TYPES).filter(type => 
      type !== "Auth" || API_TYPES[type].endpoints // Only show Auth if it has endpoints
    );

    // Stack to keep track of previous menus
    let menuStack = [];

    // Select API type
    const { apiType } = await inquirer.prompt([
      {
        type: "list",
        name: "apiType",
        message: "Select API type to test:",
        choices: [
          ...apiTypeChoices, 
          new inquirer.Separator(),
          "🚪 Çıkış"
        ]
      }
    ]);

    if (apiType === "🚪 Çıkış") {
      if (await confirmExit()) {
        console.log(chalk.green("\nAPI Stress Tester'ı kullandığınız için teşekkürler!"));
        process.exit(0);
      } else {
        continue;
      }
    }


    // Add current menu to stack
    menuStack.push("main");
    
    let selectedEndpoints = [];
    let selectedMethods = [];

    // Special handling for Auth category from Custom Categories
    if (apiType === "Auth" && API_TYPES["Custom Categories"]?.Auth) {
      selectedEndpoints = API_TYPES["Custom Categories"].Auth.endpoints;
      selectedMethods = API_TYPES["Custom Categories"].Auth.methods;
    } else if (apiType === "Custom API") {
      // If Custom API, prompt for endpoint and method
      const { endpoint, method } = await inquirer.prompt([
        {
          type: "input",
          name: "endpoint",
          message: "Enter API endpoint (e.g., /api/users):",
          validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
        },
        {
          type: "list",
          name: "method",
          message: "Select HTTP method:",
          choices: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        }
      ]);

      // Save the new custom API to the JSON file
      const apiName = `Custom_${endpoint.replace(/\//g, '_')}_${method}`;
      if (!API_TYPES["Custom APIs"][apiName]) {
        API_TYPES["Custom APIs"][apiName] = {
          endpoints: [endpoint],
          methods: [method]
        };
        
        // Write back to the JSON file
        fs.writeFileSync(
          path.join(__dirname, 'api-definitions.json'),
          JSON.stringify(API_TYPES, null, 2),
          'utf8'
        );
        console.log(chalk.green(`\nNew API endpoint saved: ${apiName}`));
      }
      
      selectedEndpoints = [endpoint];
      selectedMethods = [method];
    } else if (apiType === "Custom APIs") {
      // Show available custom APIs
      const customApis = Object.keys(API_TYPES["Custom APIs"]);
      if (customApis.length === 0) {
        console.log(chalk.yellow("\nNo custom APIs saved yet."));
        continue;
      }

      const { selectedApi } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedApi",
          message: "Select a custom API:",
          choices: customApis
        }
      ]);

      selectedEndpoints = ensureArray(API_TYPES["Custom APIs"][selectedApi]?.endpoints);
      selectedMethods = ensureArray(API_TYPES["Custom APIs"][selectedApi]?.methods);
    } else if (apiType === "Custom Categories") {
      // Show category management options
      menuStack.push("category_menu");
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Ne yapmak istersiniz?",
          choices: [
            "Add New Category",
            "Add Endpoint to Existing Category",
            "View Category Endpoints",
            new inquirer.Separator(),
            "⬅️ Geri Git"
          ]
        }
      ]);

      if (action === "⬅️ Geri Git") {
        menuStack.pop();
        continue;
      }

      if (action === "Add New Category") {
        const { categoryName } = await inquirer.prompt([
          {
            type: "input",
            name: "categoryName",
            message: "Enter category name (e.g., ADMIN):",
            validate: input => {
              if (input.trim() === "") return "Category name is required";
              if (API_TYPES["Custom Categories"][input]) return "Category already exists";
              return true;
            }
          }
        ]);

        // Initialize new category
        API_TYPES["Custom Categories"][categoryName] = {
          endpoints: [],
          methods: [],
          requiresAuth: false
        };

        // Add first endpoint to the category
        const { endpoint, method, requiresAuth } = await inquirer.prompt([
          {
            type: "input",
            name: "endpoint",
            message: "Enter API endpoint (e.g., /api/admin/users):",
            validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
          },
          {
            type: "list",
            name: "method",
            message: "Select HTTP method:",
            choices: ["GET", "POST", "PUT", "DELETE", "PATCH"]
          },
          {
            type: "confirm",
            name: "requiresAuth",
            message: "Does this endpoint require authentication?",
            default: false
          }
        ]);

        API_TYPES["Custom Categories"][categoryName].endpoints.push(endpoint);
        API_TYPES["Custom Categories"][categoryName].methods.push(method);
        API_TYPES["Custom Categories"][categoryName].requiresAuth = requiresAuth;

        // Save changes to file
        fs.writeFileSync(
          path.join(__dirname, 'api-definitions.json'),
          JSON.stringify(API_TYPES, null, 2),
          'utf8'
        );

        console.log(chalk.green(`\nNew category "${categoryName}" created with endpoint ${method} ${endpoint}`));
        selectedEndpoints = [endpoint];
        selectedMethods = [method];

      } else if (action === "Add Endpoint to Existing Category") {
        const categories = Object.keys(API_TYPES["Custom Categories"]);
        
        if (categories.length === 0) {
          console.log(chalk.yellow("\nNo custom categories exist yet. Please create a category first."));
          continue;
        }

        menuStack.push("add_endpoint");
        const { categoryName } = await inquirer.prompt([
          {
            type: "list",
            name: "categoryName",
            message: "Select category to add endpoint:",
            choices: [
              ...categories,
              new inquirer.Separator(),
              "⬅️ Geri Git"
            ]
          }
        ]);

        if (categoryName === "⬅️ Geri Git") {
          menuStack.pop();
          continue;
        }

        const { endpoint, method, requiresAuth } = await inquirer.prompt([
          {
            type: "input",
            name: "endpoint",
            message: "Enter API endpoint:",
            validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
          },
          {
            type: "list",
            name: "method",
            message: "Select HTTP method:",
            choices: ["GET", "POST", "PUT", "DELETE", "PATCH"]
          },
          {
            type: "confirm",
            name: "requiresAuth",
            message: "Does this endpoint require authentication?",
            default: false
          }
        ]);

        API_TYPES["Custom Categories"][categoryName].endpoints.push(endpoint);
        API_TYPES["Custom Categories"][categoryName].methods.push(method);
        API_TYPES["Custom Categories"][categoryName].requiresAuth = requiresAuth;

        // Save changes to file
        fs.writeFileSync(
          path.join(__dirname, 'api-definitions.json'),
          JSON.stringify(API_TYPES, null, 2),
          'utf8'
        );

        console.log(chalk.green(`\nNew endpoint ${method} ${endpoint} added to category "${categoryName}"`));
        selectedEndpoints = [endpoint];
        selectedMethods = [method];

      } else if (action === "View Category Endpoints") {
        const categories = Object.keys(API_TYPES["Custom Categories"]);
        
        if (categories.length === 0) {
          console.log(chalk.yellow("\nNo custom categories exist yet."));
          continue;
        }

        menuStack.push("view_category");
        const { categoryName } = await inquirer.prompt([
          {
            type: "list",
            name: "categoryName",
            message: "Select category to view:",
            choices: [
              ...categories,
              new inquirer.Separator(),
              "⬅️ Geri Git"
            ]
          }
        ]);

        if (categoryName === "⬅️ Geri Git") {
          menuStack.pop();
          continue;
        }

      const category = API_TYPES["Custom Categories"][categoryName];
      
      if (category.endpoints.length === 0) {
        console.log(chalk.yellow(`\nNo endpoints in category "${categoryName}"`));
        continue;
      }

      menuStack.push("endpoint_selection");
      const { endpoint } = await inquirer.prompt([{
        type: "list",
        name: "endpoint",
        message: "Test edilecek endpoint'i seçin:",
        choices: [
          ...category.endpoints.map((endpoint, index) => ({
            name: `${category.methods[index]} ${endpoint}`,
            value: index
          })),
          new inquirer.Separator(),
          { name: "⬅️ Geri Git", value: "back" }
        ]
      }]);

      if (endpoint === "back") {
        menuStack.pop();
        continue;
      }

      selectedEndpoints = [category.endpoints[endpoint]];
      selectedMethods = [category.methods[endpoint]];
    }
  } else {
    // Get endpoints and methods from the selected category
    const category = API_TYPES["Custom Categories"][apiType];
    if (category && category.endpoints && category.methods) {
      const { endpoint } = await inquirer.prompt([{
        type: "list",
        name: "endpoint",
        message: `Select ${apiType} endpoint to test:`,
        choices: category.endpoints.map((endpoint, index) => ({
          name: `${category.methods[index]} ${endpoint}`,
          value: index
        }))
      }]);
      
      selectedEndpoints = [category.endpoints[endpoint]];
      selectedMethods = [category.methods[endpoint]];
    } else {
      console.log(chalk.yellow(`\nNo endpoints found for ${apiType}`));
      continue;
    }
  }
  
  // If endpoint contains param placeholder, prompt for value
  for (let i = 0; i < selectedEndpoints.length; i++) {
    if (selectedEndpoints[i].includes("{")) {
      const paramMatch = selectedEndpoints[i].match(/{([^}]+)}/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        const { paramValue } = await inquirer.prompt([{
          type: "input",
          name: "paramValue",
          message: `Enter value for ${paramName}:`,
          validate: input => input.trim() !== "" ? true : `${paramName} is required`
        }]);
        
        selectedEndpoints[i] = selectedEndpoints[i].replace(`{${paramName}}`, paramValue);
      }
    }
  }
  
  // Select test intensity
  menuStack.push("intensity_selection");
  const { intensity } = await inquirer.prompt([{
    type: "list",
    name: "intensity",
    message: "Test yoğunluğunu seçin:",
    choices: [
      ...Object.keys(TEST_INTENSITIES),
      new inquirer.Separator(),
      "⬅️ Geri Git"
    ]
  }]);

  if (intensity === "⬅️ Geri Git") {
    menuStack.pop();
    continue;
  }
  
  // Run the tests
  for (let i = 0; i < selectedEndpoints.length; i++) {
    if (!selectedEndpoints[i] || !selectedMethods[i]) {
      console.log(chalk.yellow(`Skipping invalid endpoint or method at index ${i}`));
      continue;
    }

    const spinner = ora(`Preparing stress test for ${selectedMethods[i]} ${selectedEndpoints[i]}...`).start();
    await delay(1000);  // Just for dramatic effect
    spinner.succeed(`Prepared stress test for ${selectedMethods[i]} ${selectedEndpoints[i]}`);
    
    // Daha doğru requiresAuth tespiti için güncellendi
    // Önce CustomCategories içinde bu kategori var mı kontrol et
    let requiresAuth = false;
    let isCustomCategory = false;
    
    // Debug için kategori bilgilerini göster
    console.log(chalk.gray(`Debug - ApiType: ${apiType}`));
    
    // Custom Categories içinde bu kategori var mı kontrol et
    if (API_TYPES["Custom Categories"]?.[apiType]) {
      console.log(chalk.gray(`Debug - Bu bir Custom Category: ${apiType}`));
      isCustomCategory = true;
      requiresAuth = API_TYPES["Custom Categories"][apiType].requiresAuth === true;
      console.log(chalk.blue(`Authentication required (from Custom Categories): ${requiresAuth ? 'Yes' : 'No'}`));
    } else {
      // Normal API kategorisi
      requiresAuth = API_TYPES[apiType]?.requiresAuth === true;
      console.log(chalk.blue(`Authentication required (from regular category): ${requiresAuth ? 'Yes' : 'No'}`));
    }

    // View Category Endpoints seçeneğinden gelen kategori endpoint seçimi için
    if (!isCustomCategory && selectedEndpoints.length === 1) {
      // Seçilen endpoint'in hangi kategori altında olduğunu bul
      const customCategories = API_TYPES["Custom Categories"];
      for (const categoryName in customCategories) {
        const category = customCategories[categoryName];
        const endpointIndex = category.endpoints.findIndex(ep => ep === selectedEndpoints[0]);
        
        if (endpointIndex !== -1 && category.methods[endpointIndex] === selectedMethods[0]) {
          console.log(chalk.gray(`Debug - Endpoint ${selectedEndpoints[0]} kategorisi bulundu: ${categoryName}`));
          requiresAuth = category.requiresAuth === true;
          console.log(chalk.blue(`Authentication required (from endpoint match): ${requiresAuth ? 'Yes' : 'No'}`));
          break;
        }
      }
    }
    
    if (requiresAuth) {
      try {
        // Pre-authenticate before the test starts
        await authenticate();
        console.log(chalk.green('Successfully authenticated and obtained JWT token'));
      } catch (error) {
        console.error(chalk.red('Pre-authentication failed:'), error.message);
        console.log(chalk.yellow('Continuing with test, but expect authentication failures...'));
      }
    }

    // Kategori için seçilen endpoint'e göre sampleData'yı al
    let sampleData = null;
    if (selectedMethods[i] === "POST" || selectedMethods[i] === "PUT" || selectedMethods[i] === "PATCH") {
      // Custom Categories kategorilerindeki örnek verileri kontrol et
      let foundSampleData = false;
      
      // 1. Doğrudan kategori içinde örnek veri var mı?
      if (API_TYPES["Custom Categories"]?.[apiType]?.sampleData) {
        const endpointIndex = API_TYPES["Custom Categories"][apiType].endpoints.findIndex(ep => 
          ep.replace(/{[^}]+}/g, '.*') === selectedEndpoints[i].replace(/\/\d+$/, '')
        );
        
        if (endpointIndex !== -1 && API_TYPES["Custom Categories"][apiType].sampleData?.[endpointIndex]) {
          sampleData = API_TYPES["Custom Categories"][apiType].sampleData[endpointIndex];
          foundSampleData = true;
          console.log(chalk.gray(`Önceden tanımlanmış örnek veri bulundu.`));
        }
      }
      
      // 2. View Category Endpoints ile seçilen bir endpoint için kontrol et
      if (!foundSampleData && !isCustomCategory && selectedEndpoints.length === 1) {
        const customCategories = API_TYPES["Custom Categories"];
        for (const categoryName in customCategories) {
          const category = customCategories[categoryName];
          const endpointIndex = category.endpoints.findIndex(ep => 
            ep.replace(/{[^}]+}/g, '.*') === selectedEndpoints[0].replace(/\/\d+$/, '')
          );
          
          if (endpointIndex !== -1 && category.methods[endpointIndex] === selectedMethods[0] && 
              category.sampleData && category.sampleData[endpointIndex]) {
            sampleData = category.sampleData[endpointIndex];
            foundSampleData = true;
            console.log(chalk.gray(`${categoryName} kategorisinde örnek veri bulundu.`));
            break;
          }
        }
      }
      
      // 3. Örnek veri bulunamadıysa, kullanıcıya sor
      if (!foundSampleData) {
        const { useCustomData } = await inquirer.prompt([{
          type: "confirm",
          name: "useCustomData",
          message: `${selectedMethods[i]} ${selectedEndpoints[i]} için örnek veri girmek ister misiniz?`,
          default: true
        }]);
        
        if (useCustomData) {
          const { dataInput } = await inquirer.prompt([{
            type: "editor",
            name: "dataInput",
            message: "JSON formatında örnek veriyi girin:",
            validate: (input) => {
              try {
                JSON.parse(input);
                return true;
              } catch (e) {
                return "Geçerli bir JSON girilmelidir.";
              }
            }
          }]);
          
          sampleData = JSON.parse(dataInput);
          
          // Veriyi kaydetmek ister misiniz?
          const { saveData } = await inquirer.prompt([{
            type: "confirm",
            name: "saveData",
            message: "Bu örnek veriyi gelecek testler için kaydetmek ister misiniz?",
            default: true
          }]);
          
          if (saveData) {
            // Hangi kategoriye ekleyelim?
            let targetCategory = apiType;
            
            if (!API_TYPES["Custom Categories"][targetCategory]) {
              const categories = Object.keys(API_TYPES["Custom Categories"]);
              const { category } = await inquirer.prompt([{
                type: "list",
                name: "category",
                message: "Örnek veriyi hangi kategoriye eklemek istersiniz?",
                choices: [...categories, "Yeni Kategori"]
              }]);
              
              if (category === "Yeni Kategori") {
                const { newCategory } = await inquirer.prompt([{
                  type: "input",
                  name: "newCategory",
                  message: "Yeni kategori adı girin:",
                  validate: input => input.trim() !== "" ? true : "Kategori adı gereklidir"
                }]);
                
                API_TYPES["Custom Categories"][newCategory] = {
                  endpoints: [selectedEndpoints[i]],
                  methods: [selectedMethods[i]],
                  requiresAuth: requiresAuth,
                  sampleData: [sampleData]
                };
              } else {
                targetCategory = category;
                
                // Yeni endpoint ekle
                const categoryData = API_TYPES["Custom Categories"][targetCategory];
                categoryData.endpoints.push(selectedEndpoints[i]);
                categoryData.methods.push(selectedMethods[i]);
                
                // sampleData dizisini oluştur veya güncelle
                if (!categoryData.sampleData) {
                  categoryData.sampleData = Array(categoryData.endpoints.length).fill(null);
                } else {
                  categoryData.sampleData.push(null);
                }
                
                // Yeni eklenen endpoint'in indexini bul ve sampleData'yı ekle
                const newIndex = categoryData.endpoints.length - 1;
                categoryData.sampleData[newIndex] = sampleData;
              }
            } else {
              // Kategori zaten var, endpoint'in var olup olmadığını kontrol et
              const categoryData = API_TYPES["Custom Categories"][targetCategory];
              const endpointIndex = categoryData.endpoints.findIndex(ep => 
                ep.replace(/{[^}]+}/g, '.*') === selectedEndpoints[i].replace(/\/\d+$/, '')
              );
              
              if (endpointIndex !== -1) {
                // Endpoint zaten mevcut, sampleData'yı güncelle
                if (!categoryData.sampleData) {
                  categoryData.sampleData = Array(categoryData.endpoints.length).fill(null);
                }
                
                categoryData.sampleData[endpointIndex] = sampleData;
              } else {
                // Yeni endpoint ekle
                categoryData.endpoints.push(selectedEndpoints[i]);
                categoryData.methods.push(selectedMethods[i]);
                
                if (!categoryData.sampleData) {
                  categoryData.sampleData = Array(categoryData.endpoints.length).fill(null);
                } else {
                  categoryData.sampleData.push(sampleData);
                }
              }
            }
            
            // api-definitions.json dosyasını güncelle
            fs.writeFileSync(
              path.join(__dirname, 'api-definitions.json'),
              JSON.stringify(API_TYPES, null, 2),
              'utf8'
            );
            
            console.log(chalk.green(`Örnek veri başarıyla kaydedildi.`));
          }
        }
      }
    }

    const results = await runStressTest(selectedMethods[i], selectedEndpoints[i], intensity, requiresAuth, sampleData);
    displayResults(results, selectedMethods[i], selectedEndpoints[i], intensity);
  }
  
  // Ask if user wants to run another test
  const { nextAction } = await inquirer.prompt([{
    type: "list",
    name: "nextAction",
    message: "Ne yapmak istersiniz?",
    choices: [
      "🔄 Yeni Test Başlat",
      "🚪 Çıkış"
    ]
  }]);

  if (nextAction === "🔄 Yeni Test Başlat") {
    menuStack = []; // Reset menu stack for new test
    continue;
  } else if (nextAction === "🚪 Çıkış") {
    if (await confirmExit()) {
      console.log(chalk.green("\nAPI Stress Tester'ı kullandığınız için teşekkürler!"));
      process.exit(0);
    }
    continue;
  }
}

console.log(chalk.green("\nThank you for using API Stress Tester!"));
}

// Helper function to confirm exit
async function confirmExit() {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Uygulamadan çıkmak istediğinize emin misiniz?",
      default: false
    }
  ]);
  return confirm;
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  if (error.message !== "User initiated exit") {
    process.exit(1);
  }
});
