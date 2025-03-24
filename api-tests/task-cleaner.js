#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM için __dirname ve __filename yerine kullanılacak değişkenler
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Load API definitions from JSON file
const API_TYPES = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-definitions.json'), 'utf8'));

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
    return token;
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

// Function to delete tasks
async function deleteLastNTasks(count) {
  if (!jwtToken) {
    await authenticate();
  }

  const spinner = ora(`Son ${count} görevi silme işlemi başlatılıyor...`).start();
  
  try {
    // 1. Önce son eklenen N görevin ID'lerini alın
    const getResponse = await axios({
      method: 'GET',
      url: `${process.env.BASE_URL}/api/Tasks/recent/${count}`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (!getResponse.data || !Array.isArray(getResponse.data)) {
      spinner.fail(`Görevleri alma başarısız. API yanıtı: ${JSON.stringify(getResponse.data)}`);
      return;
    }
    
    const tasks = getResponse.data;
    spinner.text = `${tasks.length} görev bulundu, silme işlemi başlıyor...`;
    
    // 2. Her görevi sil
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      spinner.text = `Görev siliniyor (${i+1}/${tasks.length}): ${task.title}...`;
      
      try {
        await axios({
          method: 'DELETE',
          url: `${process.env.BASE_URL}/api/Tasks/${task.id}`,
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });
        successCount++;
      } catch (error) {
        console.error(chalk.red(`Görev silinirken hata oluştu (ID: ${task.id}): ${error.message}`));
        errorCount++;
      }
    }
    
    spinner.succeed(`Görev silme işlemi tamamlandı. Başarılı: ${successCount}, Başarısız: ${errorCount}`);
  } catch (error) {
    spinner.fail(`Görev silme işlemi başarısız oldu: ${error.message}`);
    if (error.response) {
      console.error(chalk.red(`Status: ${error.response.status}`));
      console.error(chalk.red(`Response data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
  }
}

// Function to delete tasks method 2 - using custom MongoDB query via API
async function deleteLastNTasksByDate(count) {
  if (!jwtToken) {
    await authenticate();
  }

  const spinner = ora(`Son ${count} görevi tarihlerine göre silme işlemi başlatılıyor...`).start();
  
  try {
    // Bu endpoint oluşturulması gerekecek! Şu anda mevcut değil.
    const response = await axios({
      method: 'DELETE',
      url: `${process.env.BASE_URL}/api/Tasks/bulk-delete`,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        count: count,
        orderBy: "createdAt",
        direction: "desc"
      }
    });
    
    spinner.succeed(`Toplu görev silme başarılı: ${response.data.deletedCount} görev silindi.`);
  } catch (error) {
    spinner.fail(`Toplu görev silme başarısız oldu: ${error.message}`);
    if (error.response) {
      console.error(chalk.red(`Status: ${error.response.status}`));
      console.error(chalk.red(`Response data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
  }
}

// Main function
async function main() {
  console.log("\n");
  console.log(chalk.cyan(figlet.textSync("Task Cleaner", { font: "Standard" })));
  console.log(chalk.gray(" Created for MIA Job Management System\n"));

  // Validate BASE_URL
  if (!process.env.BASE_URL) {
    console.log(chalk.yellow("No BASE_URL found in environment variables."));
    
    const { baseUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message: "Enter the base URL for your API (e.g., http://localhost:5193):",
        validate: input => input.trim() !== "" ? true : "Base URL is required"
      }
    ]);
    
    process.env.BASE_URL = baseUrl;
  }

  // Ask how many tasks to delete
  const { taskCount, method } = await inquirer.prompt([
    {
      type: "number",
      name: "taskCount",
      message: "Kaç adet son eklenen görevi silmek istiyorsunuz?",
      default: 200,
      validate: input => {
        const num = parseInt(input);
        return num > 0 ? true : "Pozitif bir sayı girmelisiniz";
      }
    },
    {
      type: "list",
      name: "method",
      message: "Silme yöntemini seçin:",
      choices: [
        { name: "Her görevi tek tek sil (daha yavaş ama güvenli)", value: "individual" },
        { name: "Toplu silme API'sini kullan (daha hızlı, API desteği gerektirir)", value: "bulk" }
      ]
    }
  ]);

  // Execute selected delete method
  if (method === "individual") {
    await deleteLastNTasks(taskCount);
  } else {
    await deleteLastNTasksByDate(taskCount);
  }

  console.log(chalk.green("\nİşlem tamamlandı!"));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red("\nError:"), error.message);
  process.exit(1);
});