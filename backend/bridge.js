const crypto = require('crypto');
const axios = require('axios');
const db = require('./db');

const RNE_PUBLIC_KEY = "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdHnzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==";
const CLIENT_ID = "209ef407810e3856f40870a9f0e769d7";
const MASTER_USERNAME = "8801729261421";
const MASTER_PASSWORD = "Khalid@86";

function getConfig(key) {
  const configs = db.get('system_config').value();
  return configs ? configs[key] : null;
}

function setConfig(key, value) {
  db.set(`system_config.${key}`, value).write();
}

function generateAesKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function encryptAesKeyWithRsa(aesKeyStr) {
  const aesKeyB64 = Buffer.from(aesKeyStr, 'utf8').toString('base64');
  const pubPem = `-----BEGIN PUBLIC KEY-----\n${RNE_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  const encryptedBuf = crypto.publicEncrypt(
    {
      key: pubPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(aesKeyB64, 'utf8')
  );
  return encryptedBuf.toString('base64');
}

function encryptPayloadAes(jsonStr, aesKeyStr) {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(aesKeyStr, 'utf8'), null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(jsonStr, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * Automatically authenticates with EarnBondhu and saves fresh token
 */
let isLoggingIn = false;
async function autoLoginEarnBondhu() {
  if (isLoggingIn) return null;
  isLoggingIn = true;
  try {
    console.log('[EarnBondhu Bridge] Auto-logging in to get fresh master token...');
    const aesKeyStr = generateAesKey();
    const encryptedKeyHeader = encryptAesKeyWithRsa(aesKeyStr);
    
    const payloadObj = {
      tenantId: "000000",
      username: MASTER_USERNAME,
      password: MASTER_PASSWORD,
      grantType: "password",
      clientId: CLIENT_ID
    };
    const encryptedData = encryptPayloadAes(JSON.stringify(payloadObj), aesKeyStr);

    const headers = {
      'Content-Type': 'application/json;charset=utf-8',
      'clientid': CLIENT_ID,
      'encrypt-key': encryptedKeyHeader,
      'isToken': 'false',
      'repeatSubmit': 'false',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://earnbondhu.com/login',
      'Origin': 'https://earnbondhu.com'
    };

    const res = await axios.post('https://earnbondhu.com/prod-api/auth/login', encryptedData, { headers, timeout: 15000 });
    if (res.data && res.data.code === 200 && res.data.data?.access_token) {
      const newToken = res.data.data.access_token;
      setConfig('master_target_token', newToken);
      console.log('[EarnBondhu Bridge] Successfully refreshed master token!');
      await db.syncToCloud();
      return newToken;
    } else {
      console.error('[EarnBondhu Bridge] Login response error:', res.data);
      return null;
    }
  } catch (err) {
    console.error('[EarnBondhu Bridge] Login exception:', err.response?.data || err.message);
    return null;
  } finally {
    isLoggingIn = false;
  }
}

function getEarnBondhuClient() {
  const baseURL = getConfig('target_base_url') || 'https://earnbondhu.com';
  const clientId = getConfig('target_client_id') || CLIENT_ID;
  const masterToken = getConfig('master_target_token') || '';

  const headers = {
    'Content-Type': 'application/json;charset=utf-8',
    'clientid': clientId,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://earnbondhu.com/',
    'Origin': 'https://earnbondhu.com'
  };

  if (masterToken) {
    headers['Authorization'] = 'Bearer ' + masterToken;
  }

  return axios.create({
    baseURL: `${baseURL}/prod-api`,
    headers,
    timeout: 30000
  });
}

/**
 * Request Pairing Code from EarnBondhu (with automatic token retry)
 */
async function fetchPairingCode(countryCode, phoneNumber, isRetry = false) {
  let token = getConfig('master_target_token');
  if (!token) {
    token = await autoLoginEarnBondhu();
  }

  const client = getEarnBondhuClient();
  const cleanPhone = String(phoneNumber).replace(/^[0+]/, '').trim();

  try {
    const res = await client.post('/bulk/account/getPairingCode', {
      countryCode: countryCode || '880',
      phoneNumber: cleanPhone
    });

    if (res.data && res.data.code === 200) {
      const code = res.data.data?.pairingCode || res.data.data?.code || res.data.data;
      return {
        success: true,
        pairingCode: code,
        raw: res.data
      };
    } else if (res.data?.code === 401 && !isRetry) {
      console.warn('[EarnBondhu Bridge] 401 received during getPairingCode. Refreshing token...');
      const newToken = await autoLoginEarnBondhu();
      if (newToken) {
        return fetchPairingCode(countryCode, phoneNumber, true);
      }
    }

    let errorMsg = res.data?.msg || 'পেয়ারিং কোড আনতে সমস্যা হয়েছে।';
    if (errorMsg.includes('frequente') || errorMsg.includes('tarde')) {
      errorMsg = 'খুব ঘন ঘন কোডের অনুরোধ করা হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।';
    } else if (errorMsg.includes('vinculado') || errorMsg.includes('troque')) {
      errorMsg = 'এই হোয়াটসঅ্যাপ নম্বরটি ইতোমধ্যে সফলভাবে সংযুক্ত (Online) আছে! অনুগ্রহ করে নতুন নম্বর দিয়ে চেষ্টা করুন।';
    }
    return {
      success: false,
      msg: errorMsg
    };
  } catch (err) {
    console.error('[Proxy Bridge Error] fetchPairingCode:', err.response?.data || err.message);
    if (err.response?.status === 401 && !isRetry) {
      console.warn('[EarnBondhu Bridge] 401 exception. Refreshing token...');
      const newToken = await autoLoginEarnBondhu();
      if (newToken) {
        return fetchPairingCode(countryCode, phoneNumber, true);
      }
    }
    let errMsg = err.response?.data?.msg || err.message;
    if (errMsg && (errMsg.includes('frequente') || errMsg.includes('tarde'))) {
      errMsg = 'খুব ঘন ঘন কোডের অনুরোধ করা হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।';
    } else if (errMsg && (errMsg.includes('vinculado') || errMsg.includes('troque'))) {
      errMsg = 'এই হোয়াটসঅ্যাপ নম্বরটি ইতোমধ্যে সফলভাবে সংযুক্ত (Online) আছে! অনুগ্রহ করে নতুন নম্বর দিয়ে চেষ্টা করুন।';
    }
    return {
      success: false,
      msg: errMsg
    };
  }
}

let cachedAccountList = null;
let lastAccountFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds cache for fast fresh updates

/**
 * Fetch Account Status or Account List from EarnBondhu
 */
async function fetchAccountList(forceRefresh = false, isRetry = false) {
  const now = Date.now();
  if (!forceRefresh && cachedAccountList && (now - lastAccountFetchTime < CACHE_TTL_MS)) {
    return cachedAccountList;
  }

  let token = getConfig('master_target_token');
  if (!token) {
    token = await autoLoginEarnBondhu();
  }

  const client = getEarnBondhuClient();

  try {
    const res = await client.get('/bulk/account/list?pageNum=1&pageSize=100');
    if (res.data && res.data.code === 200) {
      cachedAccountList = res.data;
      lastAccountFetchTime = now;
      return res.data;
    } else if (res.data?.code === 401 && !isRetry) {
      console.warn('[EarnBondhu Bridge] 401 received during fetchAccountList. Refreshing token...');
      const newToken = await autoLoginEarnBondhu();
      if (newToken) {
        return fetchAccountList(true, true);
      }
    }
    return cachedAccountList || { rows: [] };
  } catch (err) {
    console.error('[Proxy Bridge Error] fetchAccountList:', err.response?.data || err.message);
    if (err.response?.status === 401 && !isRetry) {
      console.warn('[EarnBondhu Bridge] 401 exception. Refreshing token...');
      const newToken = await autoLoginEarnBondhu();
      if (newToken) {
        return fetchAccountList(true, true);
      }
    }
    return cachedAccountList || { rows: [] };
  }
}

async function fetchAccountStatus(phoneNumber) {
  const cleanPhone = String(phoneNumber).replace(/^[0+]/, '').trim();
  const listData = await fetchAccountList();
  const accounts = listData.rows || [];
  
  const found = accounts.find(a => 
    String(a.phoneNumber).trim() === cleanPhone || 
    String(a.pn).includes(cleanPhone)
  );

  return found || null;
}

module.exports = {
  getConfig,
  setConfig,
  fetchPairingCode,
  fetchAccountStatus,
  fetchAccountList,
  autoLoginEarnBondhu,
  getEarnBondhuClient
};
