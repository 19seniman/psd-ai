const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  magenta: "\x1b[33m",
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  countdown: (msg) => process.stdout.write(`\r${colors.yellow}[⏰] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`    Poseidon Auto Bot - Airdrop Insiders    `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const CAMPAIGNS = [
  { "campaign_id": "d45dc5b0-cc5d-4daa-a7a2-2866f5ba51f8", "campaign_name": "English Voice Data Campaign", "language_code": "en" },
  { "campaign_id": "85fa33ca-02a6-4ee3-8a27-4b5ff8793a4e", "campaign_name": "Marathi Voice Data Campaign", "language_code": "mr" },
  { "campaign_id": "c7e38d54-7b69-4e16-9719-147c56ab9a2a", "campaign_name": "Urdu Voice Data Campaign", "language_code": "ur" },
  { "campaign_id": "c295d0be-4e4b-4cb2-843d-060651810a7b", "campaign_name": "Arabic Voice Data Campaign", "language_code": "ar" },
  { "campaign_id": "23995d6e-4de3-40d5-92a5-47808be58e7d", "campaign_name": "Mandarin Chinese Voice Data Campaign", "language_code": "zh" },
  { "campaign_id": "6cadbdf5-b7fc-49bc-896d-f5807e52cb23", "campaign_name": "Indonesian Voice Data Campaign", "language_code": "id" },
  { "campaign_id": "6fd9c4a5-62f7-4ea6-944a-00127744be06", "campaign_name": "Vietnamese Voice Data Campaign", "language_code": "vi" },
  { "campaign_id": "bd8bba61-9656-4a3e-9cc3-8d003a74829a", "campaign_name": "Turkish Voice Data Campaign", "language_code": "tr" },
  { "campaign_id": "d76ebfe1-6667-4014-a386-1bd7273b9758", "campaign_name": "Russian Voice Data Campaign", "language_code": "ru" },
  { "campaign_id": "89389bd5-7c53-4ccd-8a21-44361a65d0a6", "campaign_name": "Portuguese Voice Data Campaign", "language_code": "pt" },
  { "campaign_id": "a523bf85-d5b6-4614-963f-0a50c398bc2d", "campaign_name": "German Voice Data Campaign", "language_code": "de" },
  { "campaign_id": "40601c24-4ec9-49a2-a9a1-3c8f75f47c6e", "campaign_name": "French Voice Data Campaign", "language_code": "fr" },
  { "campaign_id": "89c3528d-aa60-4e90-a55e-c4f6163fb7fc", "campaign_name": "Spanish Voice Data Campaign", "language_code": "es" },
  { "campaign_id": "3fae6080-4a35-48f7-948c-721dc1aae2e6", "campaign_name": "Korean Voice Data Campaign", "language_code": "ko" },
  { "campaign_id": "0d800fe2-d8b8-4078-99f0-311cf365c649", "campaign_name": "Japanese Voice Data Campaign", "language_code": "ja" },
  { "campaign_id": "da9842c2-39cc-4e96-9e0e-07a6a52687e6", "campaign_name": "Hindi Voice Data Campaign", "language_code": "hi" }
];

let SELECTED_CAMPAIGN = CAMPAIGNS[5];
const BASE_URL = 'https://poseidon-depin-server.storyapis.com';
const STORAGE_URL = 'https://9d9dba3b986741349ea5e642d8f15bc4.r2.cloudflarestorage.com';

function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function loadProxies() {
  try {
    const proxiesPath = path.join(__dirname, 'proxies.txt');
    if (!fs.existsSync(proxiesPath)) {
      logger.warn('proxies.txt file not found, running without proxy');
      return [];
    }
    
    const proxies = fs.readFileSync(proxiesPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    logger.info(`Loaded ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    logger.error(`Error loading proxies: ${error.message}`);
    return [];
  }
}

function createProxyAgent(proxyString) {
  if (!proxyString) return null;
  
  try {
    let proxyUrl;
    
    if (proxyString.includes('@')) {
      if (!proxyString.startsWith('http')) {
        proxyUrl = `http://${proxyString}`;
      } else {
        proxyUrl = proxyString;
      }
    } else if (proxyString.includes(':')) {
      const parts = proxyString.split(':');
      if (parts.length >= 2) {
        proxyUrl = `http://${proxyString}`;
      }
    } else {
      throw new Error('Invalid proxy format');
    }
    
    return new HttpsProxyAgent(proxyUrl);
  } catch (error) {
    logger.error(`Error creating proxy agent for ${proxyString}: ${error.message}`);
    return null;
  }
}

function loadTokens() {
  const tokens = [];
  let i = 1;
  
  while (process.env[`TOKEN_${i}`]) {
    const token = process.env[`TOKEN_${i}`].trim();
    if (token) {
      tokens.push(token);
    }
    i++;
  }
  
  logger.info(`Loaded ${tokens.length} tokens`);
  return tokens;
}

function createAxiosConfig(token, proxy = null) {
  const config = {
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.6',
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': getRandomUserAgent(),
      'sec-ch-ua': '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-gpc': '1',
      'Referer': 'https://app.psdn.ai/'
    },
    timeout: 30000
  };
  
  if (proxy) {
    config.httpsAgent = proxy;
    config.httpAgent = proxy;
  }
  
  return config;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAudioBufferFromTTS(text, languageCode) {
  const MAX_TEXT_LENGTH = 150;
  const sentenceDelimiters = ['.', '?', '!', '\n'];
  let chunks = [];
  let currentChunk = '';
  
  for (const char of text) {
    currentChunk += char;
    if (sentenceDelimiters.includes(char) && currentChunk.length > 20) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    } else if (currentChunk.length >= MAX_TEXT_LENGTH) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  const audioBuffers = [];
  const supportedLanguages = CAMPAIGNS.map(c => c.language_code);
  if (!supportedLanguages.includes(languageCode)) {
    logger.warn(`Language code '${languageCode}' might not be fully supported by the public TTS endpoint. Proceeding with caution.`);
  }

  try {
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${languageCode}&client=tw-ob`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      if (response.data) {
        audioBuffers.push(Buffer.from(response.data));
      }
      await sleep(1000);
    }
    return Buffer.concat(audioBuffers);
  } catch (error) {
    throw new Error(`TTS failed: ${error.message}`);
  }
}

function calculateSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function getNextResetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

async function countdown(targetTime, message = 'Next daily reset') {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = targetTime - now;
      
      if (timeLeft <= 0) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        clearInterval(interval);
        resolve();
        return;
      }
      
      const timeStr = formatTime(timeLeft);
      logger.countdown(`${message} in: ${timeStr}`);
    }, 1000);
  });
}

function displayCampaignMenu() {
  console.log(`\n${colors.cyan}${colors.bold}--- SELECT CAMPAIGN ---${colors.reset}`);
  CAMPAIGNS.forEach((campaign, index) => {
    const isSelected = campaign.campaign_id === SELECTED_CAMPAIGN.campaign_id ? 
      `${colors.green} ✓${colors.reset}` : '  ';
    console.log(`${colors.white}${index + 1}.${isSelected} ${campaign.campaign_name}${colors.reset}`);
  });
  console.log(`${colors.yellow}0. Exit${colors.reset}\n`);
}

async function selectCampaign() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      displayCampaignMenu();
      rl.question(`${colors.cyan}Select campaign (1-${CAMPAIGNS.length}, 0 to exit): ${colors.reset}`, (answer) => {
        const choice = parseInt(answer.trim());
        
        if (choice === 0) {
          logger.info('Exiting...');
          rl.close();
          process.exit(0);
        } else if (choice >= 1 && choice <= CAMPAIGNS.length) {
          SELECTED_CAMPAIGN = CAMPAIGNS[choice - 1];
          logger.success(`Selected: ${SELECTED_CAMPAIGN.campaign_name}`);
          rl.close();
          resolve(SELECTED_CAMPAIGN);
        } else {
          logger.error('Invalid choice. Please try again.');
          askQuestion();
        }
      });
    };
    
    askQuestion();
  });
}

class PoseidonBot {
  constructor(token, proxy = null) {
    this.token = token;
    this.proxy = proxy;
    this.axiosConfig = createAxiosConfig(token, proxy);
    this.userInfo = null;
  }

  async getUserInfo() {
    try {
      const response = await axios.get(`${BASE_URL}/users/me`, this.axiosConfig);
      this.userInfo = response.data;
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.response?.data?.message || error.message}`);
    }
  }

  async getCampaignAccess() {
    try {
      const response = await axios.get(`${BASE_URL}/campaigns/${SELECTED_CAMPAIGN.campaign_id}/access`, this.axiosConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get campaign access: ${error.response?.data?.message || error.message}`);
    }
  }

  async getNextScript() {
    try {
      const response = await axios.get(`${BASE_URL}/scripts/next?language_code=${SELECTED_CAMPAIGN.language_code}&campaign_id=${SELECTED_CAMPAIGN.campaign_id}`, this.axiosConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get script: ${error.response?.data?.message || error.message}`);
    }
  }

  async requestUploadUrl(scriptAssignmentId) {
    try {
      const fileName = `audio_recording_${Date.now()}.webm`;
      const payload = {
        content_type: 'audio/webm',
        file_name: fileName,
        script_assignment_id: scriptAssignmentId
      };

      const response = await axios.post(`${BASE_URL}/files/uploads/${SELECTED_CAMPAIGN.campaign_id}`, payload, this.axiosConfig);
      return { ...response.data, fileName };
    } catch (error) {
      throw new Error(`Failed to request upload URL: ${error.response?.data?.message || error.message}`);
    }
  }

  async uploadAudioFile(presignedUrl, audioBuffer) {
    try {
      const uploadConfig = {
        headers: {
          'content-type': 'audio/webm',
          'user-agent': getRandomUserAgent()
        },
        timeout: 60000
      };

      if (this.proxy) {
        uploadConfig.httpsAgent = this.proxy;
        uploadConfig.httpAgent = this.proxy;
      }

      await axios.put(presignedUrl, audioBuffer, uploadConfig);
    } catch (error) {
      throw new Error(`Failed to upload audio: ${error.response?.data?.message || error.message}`);
    }
  }

  async submitFile(uploadData, audioBuffer) {
    try {
      const fileHash = calculateSHA256(audioBuffer);
      const payload = {
        content_type: 'audio/webm',
        object_key: uploadData.object_key,
        sha256_hash: fileHash,
        filesize: audioBuffer.length,
        file_name: uploadData.fileName,
        virtual_id: uploadData.file_id,
        campaign_id: SELECTED_CAMPAIGN.campaign_id
      };

      const response = await axios.post(`${BASE_URL}/files`, payload, this.axiosConfig);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to submit file: ${error.response?.data?.message || error.message}`);
    }
  }

  async processOneSubmission() {
    try {
      logger.loading('Getting next script...');
      const scriptData = await this.getNextScript();
      const scriptContent = scriptData.script.content;
      const assignmentId = scriptData.assignment_id;
      
      logger.info(`Script: "${scriptContent.substring(0, 50)}..."`);
      logger.loading('Requesting upload URL...');
      
      const uploadData = await this.requestUploadUrl(assignmentId);
      
      logger.loading('Generating audio file via TTS...');
      const audioBuffer = await generateAudioBufferFromTTS(scriptContent, SELECTED_CAMPAIGN.language_code);
      
      logger.loading('Uploading audio file...');
      await this.uploadAudioFile(uploadData.presigned_url, audioBuffer);
      
      logger.loading('Submitting file...');
      const submitResult = await this.submitFile(uploadData, audioBuffer);
      
      logger.success(`File submitted successfully! Points awarded: ${submitResult.points_awarded}`);
      return submitResult;
      
    } catch (error) {
      logger.error(`Submission failed: ${error.message}`);
      throw error;
    }
  }

  async runDailyTasks() {
    try {
      logger.step(`Starting daily tasks for token: ${this.token.substring(0, 20)}...`);
      
      const userInfo = await this.getUserInfo();
      logger.info(`User: ${userInfo.email || 'Unknown'} | Points: ${userInfo.points} | Rank: ${userInfo.current_rank}`);
      
      const access = await this.getCampaignAccess();
      if (!access.allowed) {
        if (access.reason === 'cap_reached') {
          logger.error('Campaign access denied: cap_reached');
          return { success: true, remaining: 0, capReached: true };
        } else {
          logger.error(`Campaign access denied: ${access.reason}`);
          return { success: false, remaining: 0, capReached: false };
        }
      }
      
      const remaining = access.remaining;
      logger.info(`Campaign access: ${access.used_today}/${access.cap} used | ${remaining} remaining`);
      
      if (remaining <= 0) {
        logger.warn('No remaining submissions available');
        return { success: true, remaining: 0, capReached: true };
      }
      
      let successCount = 0;
      for (let i = 0; i < remaining; i++) {
        try {
          logger.step(`Processing submission ${i + 1}/${remaining}`);
          await this.processOneSubmission();
          successCount++;
          
          if (i < remaining - 1) {
            const waitTime = Math.floor(Math.random() * 5000) + 3000;
            logger.loading(`Waiting ${waitTime/1000}s before next submission...`);
            await sleep(waitTime);
          }
        } catch (error) {
          logger.error(`Submission ${i + 1} failed: ${error.message}`);
          await sleep(2000);
        }
      }
      
      logger.success(`Daily tasks completed! ${successCount}/${remaining} submissions successful`);
      return { success: true, remaining: successCount, capReached: successCount > 0 };
      
    } catch (error) {
      logger.error(`Daily tasks failed: ${error.message}`);
      return { success: false, remaining: 0, capReached: false };
    }
  }
}

async function runAllAccounts(tokens, proxies) {
  let totalSubmissions = 0;
  let totalAccounts = tokens.length;
  let successfulAccounts = 0;
  let allCapReached = true;

  logger.step(`Starting daily tasks for ${totalAccounts} accounts on ${SELECTED_CAMPAIGN.campaign_name}...`);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const proxy = proxies.length > 0 ? createProxyAgent(proxies[i % proxies.length]) : null;
    
    if (proxies.length > 0) {
      logger.info(`Using proxy: ${proxies[i % proxies.length]} for account ${i + 1}`);
    }
    
    console.log(`\n${colors.magenta}--- Account ${i + 1}/${totalAccounts} ---${colors.reset}`);
    
    const bot = new PoseidonBot(token, proxy);
    const result = await bot.runDailyTasks();
    
    if (result.success) {
      successfulAccounts++;
      totalSubmissions += result.remaining;
      if (!result.capReached) {
        allCapReached = false;
      }
    } else {
      allCapReached = false;
    }
    
    if (i < tokens.length - 1) {
      const waitTime = Math.floor(Math.random() * 10000) + 5000;
      logger.loading(`Waiting ${waitTime/1000}s before next account...`);
      await sleep(waitTime);
    }
  }
  
  return { totalSubmissions, successfulAccounts, totalAccounts, allCapReached };
}

async function runSingleCampaign() {
  const tokens = loadTokens();
  if (tokens.length === 0) {
    logger.error('No tokens found in .env file');
    process.exit(1);
  }
  const proxies = loadProxies();
  await runAllAccounts(tokens, proxies);
}

async function runAllCampaigns() {
  const tokens = loadTokens();
  if (tokens.length === 0) {
    logger.error('No tokens found in .env file');
    process.exit(1);
  }
  const proxies = loadProxies();

  for (const campaign of CAMPAIGNS) {
    SELECTED_CAMPAIGN = campaign;
    console.log(`${colors.bold}${colors.cyan}--- Starting Campaign: ${campaign.campaign_name} ---${colors.reset}`);
    await runAllAccounts(tokens, proxies);
    console.log(`${colors.bold}${colors.cyan}--- Campaign Complete: ${campaign.campaign_name} ---${colors.reset}\n`);
    await sleep(5000);
  }
}

async function showMainMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      console.log(`${colors.cyan}${colors.bold}---  MAIN MENU --- ${colors.reset}`);
      console.log(`${colors.white}1. Run all campaigns one by one`);
      console.log(`2. Select a specific campaign`);
      console.log(`${colors.yellow}0. Exit${colors.reset}\n`);
      rl.question(`${colors.cyan}Enter your choice: ${colors.reset}`, async (answer) => {
        const choice = parseInt(answer.trim());
        rl.close();
        if (choice === 1) {
          await runAllCampaigns();
        } else if (choice === 2) {
          await selectCampaign();
          await runSingleCampaign();
        } else if (choice === 0) {
          logger.info('Exiting...');
          process.exit(0);
        } else {
          logger.error('Invalid choice. Please try again.');
          await showMainMenu();
        }
        resolve();
      });
    };
    askQuestion();
  });
}

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Bot stopped by user${colors.reset}`);
  process.exit(0);
});

async function startBot() {
  logger.banner();
  await showMainMenu();
  const nextReset = getNextResetTime();
  const waitTime = nextReset.getTime() - Date.now();
  if (waitTime > 0) {
    console.log(`\n${colors.yellow}${colors.bold}--- WAITING FOR DAILY RESET --- ${colors.reset}`);
    logger.info(`Next cycle starts at midnight (00:00)`);
    await countdown(nextReset.getTime(), 'Daily reset countdown');
    console.log(`\n${colors.green}Daily reset occurred! You can run the bot again.${colors.reset}\n`);
  }
}

if (require.main === module) {
  startBot().catch(error => {
    logger.error(`Bot execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { PoseidonBot, runAllAccounts, runSingleCampaign, runAllCampaigns };
