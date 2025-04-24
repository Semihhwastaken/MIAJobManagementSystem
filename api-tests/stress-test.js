import fs from 'fs-extra'; //Dosya sistemi işlemleri için gelişmiş bir modül 
import path from 'path'; //Dosya yollarını işlemek için Node.js modülü.
import { fileURLToPath } from 'url'; //SM (ECMAScript Modules) ortamında __dirname ve __filename benzeri işlev sağlar.
import inquirer from 'inquirer'; //Kullanıcıdan CLI üzerinden girdi almak için.
import dotenv from 'dotenv';
import chalk from 'chalk'; //Terminal çıktılarını renklendirmek için.
import axios from 'axios';
import cliProgress from 'cli-progress'; //Terminalde ilerleme çubuğu göstermek için.
import { table } from 'table'; //Terminalde tablo oluşturmak için.
import ora from 'ora'; //Terminalde yükleme animasyonu göstermek için.
import figlet from 'figlet'; //Terminalde ASCII sanatı oluşturmak için.

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
//path.join: Platform bağımsız bir şekilde dosya yolu oluşturur.
const API_TYPES = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-definitions_2.json'), 'utf8'));

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

// Function to generate random data based on templates
function generateRandomData(templateData) {
  if (!templateData) return null;

  // Deep clone the template to avoid modifying original
  const template = JSON.parse(JSON.stringify(templateData));

  // Helper function to process all template values recursively
  function processTemplateValues(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // Arrays need special handling
    if (Array.isArray(obj)) {
      //Eğer obj bir dizi ise, her elemanı rekürsif olarak işler (map).
      return obj.map(item => processTemplateValues(item));
    }

    // Process each property in the object
    const result = {};
    for (const key in obj) {
      const value = obj[key];

      // Handle string template patterns
      if (typeof value === 'string') {
        if (value === '{{guid}}') {
          // Generate a simple uuid-like string
          result[key] = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        } else if (value === '{{name}}') {
          // Generate a random name
          const names = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah',
            'Ali', 'Ayşe', 'Mehmet', 'Fatma', 'Ahmet', 'Zeynep'];
          const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller',
            'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Öztürk'];
          result[key] = `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;
        } else if (value === '{{email}}') {
          // Generate a random email
          const domains = ['example.com', 'test.com', 'demo.org', 'mail.co', 'company.io'];
          const username = Math.random().toString(36).substring(2, 10);
          result[key] = `${username}@${domains[Math.floor(Math.random() * domains.length)]}`;
        } else if (value === '{{date}}') {
          // Generate a random future date (within next 30 days) in ISO format
          const date = new Date();
          date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
          result[key] = date.toISOString();
        } else if (value === '{{date_short}}') {
          // Generate a random future date (within next 30 days) in YYYY-MM-DD format
          const date = new Date();
          date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          result[key] = `${year}-${month}-${day}`;
        } else if (value === '{{time}}') {
          // Generate random time in HH:MM format between 08:00-17:00 (to allow for minimum 1 hour duration)
          const hours = String(8 + Math.floor(Math.random() * 9)).padStart(2, '0');
          const mins = String(Math.floor(Math.random() * 60)).padStart(2, '0');
          result[key] = `${hours}:${mins}`;
        } else if (value === '{{time_after_start}}') {
          // Generate end time that's 1-3 hours after start time
          const startTime = result.startTime || '08:00'; // Fallback to 8 AM
          const [startHour, startMin] = startTime.split(':').map(Number);
          let endHour = startHour + 1 + Math.floor(Math.random() * 3); // 1-3 hours after start
          if (endHour > 18) endHour = 18; // Cap at 6 PM
          const mins = String(Math.floor(Math.random() * 60)).padStart(2, '0');
          result[key] = `${String(endHour).padStart(2, '0')}:${mins}`;
        } else if (value === '{{datetime}}') {
          // Generate random datetime within next 30 days
          const date = new Date();
          date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
          result[key] = date.toISOString();
        } else if (value === '{{bool}}' || value === '{{boolean}}') {
          // Generate a random boolean
          result[key] = Math.random() > 0.5;
        } else if (value === '{{number}}') {
          // Generate a random number between 1-1000
          result[key] = Math.floor(Math.random() * 1000) + 1;
        } else if (value === '{{id}}') {
          // Generate MongoDB-like ID
          result[key] = Math.random().toString(36).substring(2, 15) +
            Date.now().toString(36);
        } else if (value.startsWith('{{enum:')) {
          // Handle enum values like {{enum:option1,option2,option3}}
          const options = value.replace('{{enum:', '').replace('}}', '').split(',');
          result[key] = options[Math.floor(Math.random() * options.length)];
        } else {
          // Keep the original value if not a template pattern
          result[key] = value;
        }
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        result[key] = processTemplateValues(value);
      } else {
        // Keep the original value for non-objects/non-strings
        result[key] = value;
      }
    } // Closing brace for the 'for...in' loop
    return result; // Return the processed object
  } // Closing brace for processTemplateValues helper function

  return processTemplateValues(template); // Call the helper and return its result
} // Closing brace for generateRandomData function

// Fisher-Yates (aka Knuth) Shuffle function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

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

    //Time Calculation
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

// Helper function to find GET endpoint in same category
function findGETEndpointInCategory(endpoint, method) {
  // Find the category based on the provided endpoint and method
  const categoryName = Object.keys(API_TYPES["Custom Categories"]).find(cat =>
    API_TYPES["Custom Categories"][cat].endpoints.some((ep, index) =>
      ep === endpoint && API_TYPES["Custom Categories"][cat].methods[index] === method
    )
  );

  if (!categoryName) {
    console.log(chalk.yellow(`Uyarı: ${method} ${endpoint} için kategori bulunamadı.`));
    return null; // Kategori bulunamazsa null dön
  }

  const categoryData = API_TYPES["Custom Categories"][categoryName];

  // Kategoride herhangi bir GET endpoint'i ara
  const getEndpointIndex = categoryData.methods.findIndex(m => m === "GET");

  if (getEndpointIndex === -1) {
    console.log(chalk.yellow(`Uyarı: '${categoryName}' kategorisinde GET endpoint'i bulunamadı.`));
    return null; // GET endpoint'i yoksa null dön
  }

  // Bulunan ilk GET endpoint'ini döndür
  const foundGetEndpoint = categoryData.endpoints[getEndpointIndex];
  console.log(chalk.gray(`Debug - '${categoryName}' kategorisinde GET endpoint bulundu: ${foundGetEndpoint}`));
  return foundGetEndpoint;
}

// Helper function to extract IDs from response data
function extractIds(data) {
  if (!Array.isArray(data)) return [];
  return data.map(item => item.id).filter(id => id);
}

// Function to run stress test on a specific endpoint
// Removed randomIds parameter from the function definition
async function runStressTest(method, endpoint, intensity, requiresAuth = false, sampleData = null) {
  const baseUrl = process.env.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`; // Original endpoint with {id} placeholder if present

  console.log(chalk.blue(`\nRunning ${chalk.bold(intensity)} stress test on ${method} ${fullUrl}`));

  let allIds = []; // Array to store IDs fetched from GET endpoint
  let canProceedWithDelete = true; // Flag to control if DELETE test should run

  // --- Enhanced DELETE endpoint handling --- 
  if (method === "DELETE" && endpoint.includes("{id}")) {
    // Find category data for this endpoint to get fetchUrl
    let fetchUrl = null;

    // Look through all categories to find this endpoint
    for (const categoryName in API_TYPES["Custom Categories"]) {
      const category = API_TYPES["Custom Categories"][categoryName];

      // Check if this endpoint (with patterns) exists in this category
      const endpointPatterns = category.endpoints.map(ep =>
        new RegExp(`^${ep.replace(/\{[^}]+\}/g, '[^/]+').replace(/\//g, '\\/')}$`)
      );

      const endpointIndex = category.endpoints.findIndex((ep, idx) => {
        // Create a pattern that ignores the specific {id} value
        const pattern = ep.replace(/\{[^}]+\}/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);

        // Check if the pattern matches AND the method matches
        const urlWithoutId = endpoint.replace(/\/[^\/]+$/, '/{id}');
        const isMatch = regex.test(urlWithoutId) || regex.test(endpoint);
        return isMatch && category.methods[idx] === method;
      });

      if (endpointIndex !== -1) {
        // Found the category containing this endpoint
        if (category.fetchUrl) {
          fetchUrl = category.fetchUrl;
          console.log(chalk.gray(`Category '${categoryName}' has fetchUrl: ${fetchUrl}`));
          break;
        }
      }
    }

    // If no fetchUrl found in the category data, use a default approach - find a GET endpoint in the same category
    if (!fetchUrl) {
      console.log(chalk.yellow(`Uyarı: Bu DELETE endpoint için tanımlanmış fetchUrl bulunamadı.`));
      const getEndpointPath = findGETEndpointInCategory(endpoint, method); // Find the path like /api/Tasks

      if (getEndpointPath) {
        fetchUrl = getEndpointPath;
        console.log(chalk.gray(`İlgili GET endpoint bulundu: ${fetchUrl}`));
      }
    }

    if (fetchUrl) {
      const getUrl = `${baseUrl}${fetchUrl}`;
      const spinner = ora(`ID'leri almak için GET isteği yapılıyor: ${getUrl}`).start();

      try {
        // Make a GET request to fetch all data
        const response = await axios({
          method: "GET",
          url: getUrl,
          headers: requiresAuth ? { 'Authorization': `Bearer ${jwtToken}` } : {},
          timeout: 10000
        });

        // Check if the response data exists and is an array
        if (response.data && Array.isArray(response.data)) {
          // Use the extractIds function instead of duplicating its logic
          allIds = extractIds(response.data);
          spinner.succeed(`${allIds.length} adet ID başarıyla alındı.`);
          console.log(chalk.gray(`Alınan ID'lerden bazıları: ${allIds.slice(0, 3).join(', ')}${allIds.length > 3 ? '...' : ''}`));

          if (allIds.length === 0) {
            spinner.warn(`${getUrl} adresine GET isteği başarılı oldu ancak hiç ID bulunamadı. DELETE istekleri başarısız olabilir.`);
            canProceedWithDelete = false;
          }
        } else if (response.data) {
          spinner.warn(`GET isteği başarılı oldu ancak gelen veri bir dizi değil. Yanıt: ${JSON.stringify(response.data).substring(0, 100)}...`);
          canProceedWithDelete = false;
        } else {
          spinner.warn(`GET isteği başarılı oldu ancak veri dönmedi.`);
          canProceedWithDelete = false;
        }
      } catch (error) {
        spinner.fail(`${getUrl} adresinden veri alınamadı. Hata: ${error.message}`);
        if (error.response) {
          console.log(chalk.red(`Status: ${error.response.status}`));
        }
        canProceedWithDelete = false;
      }
    } else {
      console.log(chalk.red(`❌ Uyarı: Bu DELETE endpoint için fetchUrl bulunamadı ve GET endpoint'i otomatik olarak belirlenemedi.`));
      canProceedWithDelete = false;
    }
  }

  // Check if we should proceed with the test, especially for DELETE
  if (method === "DELETE" && !canProceedWithDelete) {
    console.log(chalk.yellow(`\nDELETE testi atlanıyor çünkü gerekli koşullar (geçerli GET endpoint'i veya alınabilir ID'ler) sağlanamadı.`));
    return { // Return an empty or specific result indicating the test was skipped
      totalRequests: 0, successfulRequests: 0, failedRequests: 0,
      minResponseTime: 0, maxResponseTime: 0, avgResponseTime: 0,
      totalResponseTime: 0, statusCodes: {}, skipped: true
    };
  }

  console.log(chalk.gray(`Concurrent Users: ${TEST_INTENSITIES[intensity].concurrentUsers}`));
  console.log(chalk.gray(`Requests Per User: ${TEST_INTENSITIES[intensity].requestsPerUser}`));
  console.log(chalk.gray(`Delay Between Requests: ${TEST_INTENSITIES[intensity].delayBetweenRequests}ms`));

  if (sampleData) {
    // Check if sample data has template placeholders
    const hasTemplates = JSON.stringify(sampleData).includes('{{');

    if (hasTemplates) {
      console.log(chalk.blue(`Using template data with random values for each request`));
      // Show sample of what the data might look like
      const sampleRandomData = generateRandomData(sampleData);
      console.log(chalk.gray(`Sample generated data: ${JSON.stringify(sampleRandomData, null, 2)}`));
    } else {
      console.log(chalk.blue(`Using fixed request body data: ${JSON.stringify(sampleData, null, 2)}`));
    }
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

  // --- Shuffle IDs if DELETE test ---
  // Shuffle the main list ONCE before starting user loops for unique global attempts
  if (method === "DELETE" && canProceedWithDelete && allIds.length > 0) {
    console.log(chalk.blue(`Shuffling ${allIds.length} IDs for unique deletion attempts...`));
    shuffleArray(allIds);
  }
  // --- End Shuffle ---

  // Start concurrent user simulations
  const userPromises = [];
  // No need for userSpecificIds anymore, we'll pop from the shared shuffled list

  for (let user = 0; user < TEST_INTENSITIES[intensity].concurrentUsers; user++) {

    userPromises.push((async () => {
      for (let req = 0; req < TEST_INTENSITIES[intensity].requestsPerUser; req++) {
        // Check if we need to generate random data for this request
        let requestData = null;
        let requestUrl = fullUrl; // Başlangıçta tam URL'yi alalım

        // --- Her istek için URL ve Veri Belirleme ---
        // endpoint değişkeni {id} içeriyorsa ve method DELETE ise ID'leri kullan
        const originalEndpointHasIdPlaceholder = endpoint.includes("{id}");

        if (method === "DELETE" && originalEndpointHasIdPlaceholder) {
          // Pop an ID from the end of the *shared*, shuffled list
          // This provides a unique ID for each attempt across all users until the list is empty
          const randomId = allIds.pop(); // Get and remove the last ID

          if (randomId) { // Check if an ID was successfully popped
            // Construct the URL using the *original endpoint template*
            requestUrl = `${baseUrl}${endpoint.replace("{id}", randomId)}`;
            requestData = null;
            if (req < 5 || req % 50 === 0) { // Log occasionally
              console.log(chalk.gray(`[User ${user + 1}/Req ${req + 1}] DELETE isteği için benzersiz ID alındı: ${randomId}, URL: ${requestUrl} (Listede Kalan: ${allIds.length})`));
            }
          } else {
            // No more unique IDs left in the shared list
            if (req < 5 || req % 50 === 0) { // Log occasionally
              console.log(chalk.yellow(`[User ${user + 1}/Req ${req + 1}] Uyarı: Silinecek benzersiz ID kalmadı. İstek atlanıyor.`));
            }
            // Skip this request as there are no more unique IDs
            progressBar.increment(); // Still increment progress bar
            await delay(TEST_INTENSITIES[intensity].delayBetweenRequests); // Apply delay
            continue; // Skip to the next request in the inner loop
          }
        } else if (method === "POST" || method === "PUT" || method === "PATCH") {
          // POST/PUT/PATCH verisi oluşturma
          if (sampleData && JSON.stringify(sampleData).includes('{{') && method === "POST") {
            requestData = generateRandomData(sampleData); // Generate random data if template
          } else if (sampleData && JSON.stringify(sampleData).includes('{{') && method === "PUT") {
            requestData = generateRandomData(sampleData); // Generate random data if template
            // URL'den ID'yi çıkar ve requestData'ya ata
            try {
              const urlParts = requestUrl.split('/');
              const idFromUrl = urlParts[urlParts.length - 1];

              if (idFromUrl && idFromUrl.trim() !== "") {
                requestData.id = idFromUrl;
                console.log(chalk.green(`[User ${user + 1}/Req ${req + 1}] PUT isteği için URL'den ID (${idFromUrl}) alındı ve requestData'ya atandı`));
              } else {
                console.log(chalk.yellow(`[User ${user + 1}/Req ${req + 1}] Uyarı: URL'den geçerli ID çıkarılamadı`));
              }
            } catch (error) {
              console.log(chalk.red(`[User ${user + 1}/Req ${req + 1}] Hata: URL'den ID çıkarılırken hata: ${error.message}`));
            }
            console.log(chalk.gray(`[User ${user + 1}/Req ${req + 1}] PUT isteği için rastgele veri oluşturuldu: ${JSON.stringify(requestData).substring(0, 50)}...`));
          }
          else {
            requestData = sampleData; // Use fixed sample data
          }
          // For PUT/PATCH, the URL might still contain {id} if not handled earlier (e.g., user didn't provide value)
          // This part assumes {id} was replaced during the setup phase for PUT/PATCH
          requestUrl = fullUrl;
        } else {
          // For GET requests (or others not explicitly handled)
          requestUrl = fullUrl;
          requestData = null;
        }
        // --- End of Request URL and Data Determination ---

        // --- Inject ID into PUT request body ---
        if (method === "PUT" && requestData && originalEndpointHasIdPlaceholder) {
          let idToUse = null; // Variable to hold the final ID
          try {
            const urlParts = requestUrl.split('/');
            const potentialIdFromUrl = urlParts.filter(part => part.trim() !== "").pop();

            // Validate if potentialIdFromUrl looks like a valid ID (non-empty)
            // Add more specific validation if needed (e.g., length, regex for hex)
            if (potentialIdFromUrl && potentialIdFromUrl.trim() !== "") {
              idToUse = potentialIdFromUrl.trim(); // Use ID from URL
              if (req < 5 || req % 100 === 0) {
                console.log(chalk.magenta(`[User ${user + 1}/Req ${req + 1}] PUT isteği için URL'den ID (${idToUse}) alındı.`));
              }
            } else {
              if (req < 5 || req % 100 === 0) {
                console.log(chalk.yellow(`[User ${user + 1}/Req ${req + 1}] Uyarı: PUT URL'den geçerli ID çıkarılamadı: ${requestUrl}.`));
              }
            }
          } catch (e) {
            if (req < 5 || req % 100 === 0) {
              console.log(chalk.red(`[User ${user + 1}/Req ${req + 1}] Hata: PUT URL'den ID çıkarılırken hata: ${e.message}`));
            }
          }

          // Now, decide what to do with requestData.id
          if (idToUse) {
            // If we got a valid ID from the URL, always use it, overwriting any template value.
            requestData.id = idToUse;
            if (req < 5 || req % 100 === 0) {
              console.log(chalk.cyan(`[User ${user + 1}/Req ${req + 1}] requestData.id, URL'den alınan ID (${idToUse}) ile güncellendi.`));
            }
          } else {
            // If no valid ID from URL, log a warning but keep the original requestData.id (if any) from the template.
            // The API should handle the case where the ID might be missing or invalid in the body if it relies on the URL ID.
            if (req < 5 || req % 100 === 0) {
              console.log(chalk.yellow(`[User ${user + 1}/Req ${req + 1}] URL'den ID alınamadı. Şablondaki requestData.id ('${requestData.id}') kullanılıyor (varsa). PUT isteği başarısız olabilir.`));
            }
          }
        }
        // --- End Inject ID ---

        const result = await makeRequest(method, requestUrl, requestData, requiresAuth);

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

  let continueTestingFlag = true; // Sonsuz döngü kontrolü için bayrak

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
            default: true
          }
        ]);

        // For DELETE endpoints, ask for fetchUrl to collect IDs
        let fetchUrl = null;
        let fetchMethod = "GET";

        if (method === "DELETE" && endpoint.includes("{")) {
          const { provideFetchUrl } = await inquirer.prompt([
            {
              type: "confirm",
              name: "provideFetchUrl",
              message: "Bu DELETE endpoint'i için ID'leri alacak bir 'fetchUrl' belirtmek ister misiniz?",
              default: true
            }
          ]);

          if (provideFetchUrl) {
            const { url } = await inquirer.prompt([
              {
                type: "input",
                name: "url",
                message: "ID'leri alacak GET endpoint'ini girin (örn: /api/Tasks):",
                validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
              }
            ]);
            fetchUrl = url;
          }
        }

        API_TYPES["Custom Categories"][categoryName].endpoints.push(endpoint);
        API_TYPES["Custom Categories"][categoryName].methods.push(method);
        API_TYPES["Custom Categories"][categoryName].requiresAuth = requiresAuth;

        // Add fetchUrl and fetchMethod if provided
        if (fetchUrl) {
          if (!API_TYPES["Custom Categories"][categoryName].fetchUrl) {
            API_TYPES["Custom Categories"][categoryName].fetchUrl = fetchUrl;
          }
          if (!API_TYPES["Custom Categories"][categoryName].fetchMethod) {
            API_TYPES["Custom Categories"][categoryName].fetchMethod = fetchMethod;
          }
        }

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
            default: true
          }
        ]);

        // For DELETE endpoints, ask for fetchUrl to collect IDs
        let fetchUrl = null;
        let fetchMethod = "GET";

        if (method === "DELETE" && endpoint.includes("{")) {
          const { provideFetchUrl } = await inquirer.prompt([
            {
              type: "confirm",
              name: "provideFetchUrl",
              message: "Bu DELETE endpoint'i için ID'leri alacak bir 'fetchUrl' belirtmek ister misiniz?",
              default: true
            }
          ]);

          if (provideFetchUrl) {
            const { url } = await inquirer.prompt([
              {
                type: "input",
                name: "url",
                message: "ID'leri alacak GET endpoint'ini girin (örn: /api/Tasks):",
                validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
              }
            ]);
            fetchUrl = url;
          }
        }

        API_TYPES["Custom Categories"][categoryName].endpoints.push(endpoint);
        API_TYPES["Custom Categories"][categoryName].methods.push(method);
        API_TYPES["Custom Categories"][categoryName].requiresAuth = requiresAuth;

        // Add fetchUrl and fetchMethod if provided
        if (fetchUrl) {
          if (!API_TYPES["Custom Categories"][categoryName].fetchUrl) {
            API_TYPES["Custom Categories"][categoryName].fetchUrl = fetchUrl;
          }
          if (!API_TYPES["Custom Categories"][categoryName].fetchMethod) {
            API_TYPES["Custom Categories"][categoryName].fetchMethod = fetchMethod;
          }
        }

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

        // Handle DELETE endpoints - Implement JWT authentication and ID fetching
        if (category.methods[endpoint] === "DELETE" && category.endpoints[endpoint].includes("{id}")) {
          console.log(chalk.blue(`Selected a DELETE endpoint that requires IDs: ${category.endpoints[endpoint]}`));

          // Step 1: First authenticate to get JWT token if needed
          if (category.requiresAuth) {
            try {
              await authenticate();
              console.log(chalk.green('Successfully authenticated and obtained JWT token'));
            } catch (error) {
              console.error(chalk.red('Authentication failed:'), error.message);
              console.log(chalk.yellow('You need authentication to proceed with DELETE. Please try again.'));
              continue;
            }
          }

          // Step 2: Determine fetchUrl for getting IDs
          let fetchUrl = null;

          // Try to get fetchUrl from category configuration
          if (category.fetchUrl) {
            fetchUrl = category.fetchUrl;
            console.log(chalk.gray(`Using configured fetchUrl: ${fetchUrl} to get IDs`));
          } else {
            // Try to find a matching GET endpoint in the same category
            const getEndpointIndex = category.methods.findIndex(m => m === "GET" && !category.endpoints[m].includes("{id}"));
            if (getEndpointIndex !== -1) {
              fetchUrl = category.endpoints[getEndpointIndex];
              console.log(chalk.gray(`Using GET endpoint from the same category: ${fetchUrl}`));
            } else {
              // Ask user for a fetchUrl
              const { url } = await inquirer.prompt([{
                type: "input",
                name: "url",
                message: "Enter the GET endpoint to fetch IDs from (e.g., /api/Tasks):",
                validate: input => input.trim().startsWith("/") ? true : "Endpoint must start with /"
              }]);
              fetchUrl = url;

              // Save this fetchUrl for future use
              category.fetchUrl = fetchUrl;
              category.fetchMethod = "GET";

              fs.writeFileSync(
                path.join(__dirname, 'api-definitions.json'),
                JSON.stringify(API_TYPES, null, 2),
                'utf8'
              );
              console.log(chalk.green(`Saved fetchUrl: ${fetchUrl} for future use with this category`));
            }
          }

          // Step 3: Fetch data to get IDs
          if (fetchUrl) {
            const baseUrl = process.env.BASE_URL;
            const getUrl = `${baseUrl}${fetchUrl}`;
            const spinner = ora(`Fetching IDs from ${getUrl}...`).start();

            try {
              // Make GET request to fetch the data
              const response = await axios({
                method: "GET",
                url: getUrl,
                headers: category.requiresAuth ? { 'Authorization': `Bearer ${jwtToken}` } : {},
                timeout: 10000
              });

              // Check if we got array data
              if (response.data && Array.isArray(response.data)) {
                // Extract IDs using the extractIds function
                const ids = extractIds(response.data);
                spinner.succeed(`Successfully fetched ${ids.length} items with IDs`);

                if (ids.length > 0) {
                  console.log(chalk.green(`Available IDs for deletion: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''}`));

                  // Ask if the user wants to proceed with random deletion from these IDs
                  const { proceed } = await inquirer.prompt([{
                    type: "confirm",
                    name: "proceed",
                    message: `Do you want to proceed with the stress test that will randomly delete from these ${ids.length} items?`,
                    default: true
                  }]);

                  if (!proceed) {
                    console.log(chalk.yellow('DELETE test cancelled by user.'));
                    continue; // Go back to the main menu loop
                  }
                  // If user proceeded, we simply continue. The test will be run later in the main loop.
                  // No need to select random IDs or run the test here.
                } else {
                  spinner.warn('No IDs found in the response data. DELETE operations may fail.');
                  // Ask if user wants to proceed anyway, even if IDs weren't found initially
                  const { proceedWithoutIds } = await inquirer.prompt([{
                    type: "confirm",
                    name: "proceedWithoutIds",
                    message: "No IDs found via fetchUrl. Proceed with the test anyway? (DELETE operations will likely fail)",
                    default: false
                  }]);
                  if (!proceedWithoutIds) {
                    console.log(chalk.yellow('DELETE test cancelled due to missing IDs.'));
                    continue; // Go back to the main menu loop
                  }
                  // If user proceeded, the main loop will handle the test run.
                }
              } else {
                spinner.warn(`The response is not an array. Cannot extract IDs for DELETE operations.`);
                // Ask if user wants to proceed anyway
                const { proceedWithoutIds } = await inquirer.prompt([{
                  type: "confirm",
                  name: "proceedWithoutIds",
                  message: "Could not extract IDs from fetchUrl response. Proceed with the test anyway? (DELETE operations will likely fail)",
                  default: false
                }]);
                if (!proceedWithoutIds) {
                  console.log(chalk.yellow('DELETE test cancelled due to ID extraction failure.'));
                  continue; // Go back to the main menu loop
                }
                // If user proceeded, the main loop will handle the test run.
              }
            } catch (error) {
              spinner.fail(`Failed to fetch IDs: ${error.message}`);
              if (error.response) {
                console.log(chalk.red(`Status: ${error.response.status}`));
              }

              // Ask if user wants to proceed anyway after fetch failure
              const { proceed } = await inquirer.prompt([{
                type: "confirm",
                name: "proceed",
                message: "Failed to fetch IDs. Proceed with the test anyway? (DELETE operations will likely fail)",
                default: false
              }]);

              if (!proceed) {
                console.log(chalk.yellow('DELETE test cancelled after fetch failure.'));
                continue; // Go back to the main menu loop
              }
              // If user proceeded, the main loop will handle the test run.
            }
          }
        }
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

    // If endpoint contains param placeholder, prompt for value or use param history
    for (let i = 0; i < selectedEndpoints.length; i++) {
      // --- Find Category Data First ---
      let foundCategoryData = null;
      let actualCategoryName = null; // Store the name too if needed
      for (const categoryNameLoop in API_TYPES["Custom Categories"]) { // Use different var name to avoid conflict
        const category = API_TYPES["Custom Categories"][categoryNameLoop];
        // Find the index of the endpoint/method pair within this category
        const endpointIndex = category.endpoints.findIndex((ep, idx) => {
          // Use regex for robust matching of parameterized endpoints
          const endpointPattern = ep.replace(/{[^}]+}/g, '[^/]+');
          const regex = new RegExp(`^${endpointPattern}$`);
          // Check if the current selected endpoint matches the pattern AND the method matches
          return regex.test(selectedEndpoints[i]) && category.methods[idx] === selectedMethods[i];
        });

        // If found in this category
        if (endpointIndex !== -1) {
          foundCategoryData = category;
          actualCategoryName = categoryNameLoop; // Store the name
          break; // Stop searching once found
        }
      }
      // --- End Find Category Data ---

      // --- Determine if it's a DELETE with fetched IDs ---
      const isDELETEWithRandomIds =
        selectedMethods[i] === "DELETE" &&
        selectedEndpoints[i].includes("{id}") &&
        foundCategoryData?.fetchUrl && // Use the found category data
        // Check if we came through the flow where IDs were fetched
        menuStack.includes("endpoint_selection") &&
        menuStack.includes("view_category");

      // --- Parameter Prompting Logic ---
      // Only prompt if it's NOT a DELETE with random IDs AND the endpoint has a placeholder
      if (!isDELETEWithRandomIds && selectedEndpoints[i].includes("{")) {
        const paramMatch = selectedEndpoints[i].match(/{([^}]+)}/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          const paramPlaceholder = `{${paramName}}`;

          // Use foundCategoryData and actualCategoryName (determined earlier) for history lookup
          let categoryForHistory = foundCategoryData;
          let categoryNameForHistory = actualCategoryName;

          // If category not found via loop (e.g., maybe it's not in Custom Categories?), fallback
          if (!categoryForHistory) {
            categoryNameForHistory = apiType; // Fallback to original apiType
            if (API_TYPES["Custom Categories"]?.[categoryNameForHistory]) {
              categoryForHistory = API_TYPES["Custom Categories"][categoryNameForHistory];
            }
          }

          // Now use categoryForHistory and categoryNameForHistory for the prompt logic
          if (categoryForHistory) {
            // Ensure paramHistory exists
            if (!categoryForHistory.paramHistory) {
              categoryForHistory.paramHistory = {};
            }
            if (!categoryForHistory.paramHistory[paramPlaceholder]) {
              categoryForHistory.paramHistory[paramPlaceholder] = [];
            }

            const paramHistory = categoryForHistory.paramHistory[paramPlaceholder];
            let paramValue;

            // If we have history entries, let the user choose
            if (paramHistory.length > 0) {
              const choices = [
                ...paramHistory.map(value => ({ name: value, value })),
                { name: 'Yeni değer gir', value: 'NEW' }
              ];

              const { selectedValue } = await inquirer.prompt([{
                type: "list",
                name: "selectedValue",
                message: `${paramName} için değer seçin:`,
                choices: choices
              }]);

              if (selectedValue === 'NEW') {
                // User wants to enter a new value
                const { newValue } = await inquirer.prompt([{
                  type: "input",
                  name: "newValue",
                  message: `${paramName} için yeni değer girin:`,
                  validate: input => input.trim() !== "" ? true : `${paramName} is required`
                }]);

                paramValue = newValue;

                // Add to history if not already present
                if (!paramHistory.includes(newValue)) {
                  paramHistory.push(newValue);

                  // Save to file
                  fs.writeFileSync(
                    path.join(__dirname, 'api-definitions.json'),
                    JSON.stringify(API_TYPES, null, 2),
                    'utf8'
                  );
                }
              } else {
                // User selected an existing value
                paramValue = selectedValue;
              }
            } else {
              // No history, prompt for value
              const { newValue } = await inquirer.prompt([{
                type: "input",
                name: "newValue",
                message: `${paramName} için değer girin:`,
                validate: input => input.trim() !== "" ? true : `${paramName} is required`
              }]);

              paramValue = newValue;

              // Add to history
              paramHistory.push(newValue);

              // Save to file
              fs.writeFileSync(
                path.join(__dirname, 'api-definitions.json'),
                JSON.stringify(API_TYPES, null, 2),
                'utf8'
              );
            }

            // Replace the parameter in the URL with the value
            selectedEndpoints[i] = selectedEndpoints[i].replace(paramPlaceholder, paramValue);
          } else {
            // Fallback to simple prompt if no category context
            const { paramValue } = await inquirer.prompt([{
              type: "input",
              name: "paramValue",
              message: `Enter value for ${paramName}:`,
              validate: input => input.trim() !== "" ? true : `${paramName} is required`
            }]);
            selectedEndpoints[i] = selectedEndpoints[i].replace(paramPlaceholder, paramValue);
          }
        }
      } else if (isDELETEWithRandomIds) {
        // Log message if skipping prompt for DELETE with random IDs
        console.log(chalk.blue(`DELETE endpoint ${selectedEndpoints[i]}: Kullanıcıdan ID isteme adımı atlanıyor, çekilen ID'ler kullanılacak.`));
        // Keep the {id} placeholder as is - it will be replaced during the stress test run
      }
      // --- End Parameter Prompting Logic ---
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

      // --- Determine requiresAuth and sampleData for THIS specific test run ---
      let requiresAuth = false;
      let sampleData = null;
      let foundCategoryDataTestRun = null; // Store the found category object
      let actualCategoryNameTestRun = null; // Store the name of the found category
      let endpointIndexInCategory = -1; // Store the index within the category

      for (const categoryNameLoop in API_TYPES["Custom Categories"]) {
        const category = API_TYPES["Custom Categories"][categoryNameLoop];
        const endpointIndex = category.endpoints.findIndex((ep, idx) => {
          const endpointPattern = ep.replace(/{[^}]+}/g, '[^/]+');
          const regex = new RegExp(`^${endpointPattern}$`);
          return selectedEndpoints[i] && regex.test(selectedEndpoints[i]) && category.methods[idx] === selectedMethods[i];
        });

        if (endpointIndex !== -1) {
          foundCategoryDataTestRun = category;
          actualCategoryNameTestRun = categoryNameLoop;
          endpointIndexInCategory = endpointIndex; // Store the index
          requiresAuth = category.requiresAuth === true;
          if ((selectedMethods[i] === "POST" || selectedMethods[i] === "PUT" || selectedMethods[i] === "PATCH") && category.sampleData?.[endpointIndex]) {
            sampleData = category.sampleData[endpointIndex];
            console.log(chalk.gray(`Örnek veri ${actualCategoryNameTestRun} kategorisinden bulundu.`));
          }
          break;
        }
      }

      const spinner = ora(`Preparing stress test for ${selectedMethods[i]} ${selectedEndpoints[i]}...`).start();
      await delay(1000); // Just for dramatic effect

      if (foundCategoryDataTestRun) {
        spinner.succeed(`Prepared stress test for ${selectedMethods[i]} ${selectedEndpoints[i]} (Category: ${actualCategoryNameTestRun})`);
        console.log(chalk.blue(`Authentication required: ${requiresAuth ? 'Yes' : 'No'}`));
      } else {
        spinner.warn(`Prepared stress test for ${selectedMethods[i]} ${selectedEndpoints[i]} (Category not found, assuming requiresAuth=false)`);
        requiresAuth = false; // Default if category not found
      }
      // --- End of Determination ---

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

      // --- Handle sampleData if not found in category ---
      // sampleData might have been found during the category search above.
      // Only prompt if it's still null for relevant methods.
      if (sampleData === null && (selectedMethods[i] === "POST" || selectedMethods[i] === "PUT" || selectedMethods[i] === "PATCH")) {
        // Check if it's a custom category context to avoid confusion
        const isCustomCategory = apiType === "Custom Categories"; // Or check menuStack

        // Ask user for sample data
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
            // Use the category data found earlier (foundCategoryDataTestRun) if available
            let targetCategoryData = foundCategoryDataTestRun;
            let targetCategoryName = actualCategoryNameTestRun;

            // If no category was found earlier, ask where to save it
            if (!targetCategoryData) {
              const categories = Object.keys(API_TYPES["Custom Categories"]);
              const { categoryChoice } = await inquirer.prompt([{
                type: "list",
                name: "categoryChoice",
                message: "Örnek veriyi hangi kategoriye eklemek istersiniz?",
                choices: [...categories, "Yeni Kategori Oluştur"]
              }]);

              if (categoryChoice === "Yeni Kategori Oluştur") {
                const { newCategoryName } = await inquirer.prompt([{
                  type: "input",
                  name: "newCategoryName",
                  message: "Yeni kategori adı girin:",
                  validate: input => {
                    if (input.trim() === "") return "Kategori adı gereklidir";
                    if (API_TYPES["Custom Categories"][input.trim()]) return "Bu kategori zaten var";
                    return true;
                  }
                }]);
                targetCategoryName = newCategoryName.trim();
                API_TYPES["Custom Categories"][targetCategoryName] = {
                  endpoints: [],
                  methods: [],
                  requiresAuth: requiresAuth, // Use the determined requiresAuth
                  sampleData: []
                };
                targetCategoryData = API_TYPES["Custom Categories"][targetCategoryName];
              } else {
                targetCategoryName = categoryChoice;
                targetCategoryData = API_TYPES["Custom Categories"][targetCategoryName];
              }
            }

            // Now add/update the endpoint and sample data in the targetCategoryData
            const endpointIndex = targetCategoryData.endpoints.findIndex((ep, idx) =>
              ep === selectedEndpoints[i] && targetCategoryData.methods[idx] === selectedMethods[i]
            );

            if (endpointIndex !== -1) {
              // Endpoint already exists, update sampleData
              if (!targetCategoryData.sampleData) {
                targetCategoryData.sampleData = Array(targetCategoryData.endpoints.length).fill(null);
              }
              // Ensure sampleData array is long enough
              while (targetCategoryData.sampleData.length <= endpointIndex) {
                targetCategoryData.sampleData.push(null);
              }
              targetCategoryData.sampleData[endpointIndex] = sampleData;
              console.log(chalk.gray(`Mevcut endpoint için örnek veri güncellendi: ${targetCategoryName}`));

            } else {
              // Add new endpoint and sampleData
              targetCategoryData.endpoints.push(selectedEndpoints[i]);
              targetCategoryData.methods.push(selectedMethods[i]);
              if (!targetCategoryData.sampleData) {
                targetCategoryData.sampleData = [];
              }
              // Ensure sampleData array is long enough before pushing
              while (targetCategoryData.sampleData.length < targetCategoryData.endpoints.length - 1) {
                targetCategoryData.sampleData.push(null);
              }
              targetCategoryData.sampleData.push(sampleData); // Add sample data at the new index
              console.log(chalk.gray(`Yeni endpoint ve örnek veri eklendi: ${targetCategoryName}`));
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
      // Closing brace for if (sampleData === null ...) - Removed the extra brace here

      // --- Run the actual test ---
      // Removed randomIds argument from the function call
      const results = await runStressTest(selectedMethods[i], selectedEndpoints[i], intensity, requiresAuth, sampleData);
      displayResults(results, selectedMethods[i], selectedEndpoints[i], intensity);
      // --- End Run the actual test ---

    } // Closing brace for the main test execution loop: for (let i = 0; ... )

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
      default: true
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
