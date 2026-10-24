const axios = require('axios');
const db = require('./db');

function getConfig(key) {
  const configs = db.get('system_config').value();
  return configs ? configs[key] : null;
}

function setConfig(key, value) {
  db.set(`system_config.${key}`, value).write();
}

function getEarnBondhuClient() {
  const baseURL = getConfig('target_base_url') || 'https://earnbondhu.com';
  const clientId = getConfig('target_client_id') || '209ef407810e3856f40870a9f0e769d7';
  const masterToken = getConfig('master_target_token') || '';

  const headers = {
    'Content-Type': 'application/json;charset=utf-8',
    'clientid': clientId,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
 * Request Pairing Code from EarnBondhu
 */
async function fetchPairingCode(countryCode, phoneNumber) {
  const client = getEarnBondhuClient();
  const token = getConfig('master_target_token');
  
  if (!token) {
    console.warn('[Proxy Bridge] Master token not configured yet. Generating test pairing code.');
    // Simulated realistic 8-digit WhatsApp pairing code (e.g. 4321-9876)
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return {
      success: true,
      pairingCode: `${part1}-${part2}`,
      simulated: true,
      msg: 'Master token pending. Test Pairing Code generated.'
    };
  }

  try {
    const res = await client.post('/bulk/account/getPairingCode', {
      countryCode,
      phoneNumber
    });

    if (res.data && res.data.code === 200) {
      const code = res.data.data?.pairingCode || res.data.data?.code || res.data.data;
      return {
        success: true,
        pairingCode: code,
        raw: res.data
      };
    } else {
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
    }
  } catch (err) {
    console.error('[Proxy Bridge Error] fetchPairingCode:', err.response?.data || err.message);
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

/**
 * In-memory cache for EarnBondhu Account List (Super-Fast 10s TTL)
 */
let cachedAccountList = null;
let lastAccountFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache for ultra-fast instant responses

/**
 * Fetch Account Status or Account List from EarnBondhu
 */
async function fetchAccountList(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedAccountList && (now - lastAccountFetchTime < CACHE_TTL_MS)) {
    return cachedAccountList;
  }

  const client = getEarnBondhuClient();
  const token = getConfig('master_target_token');

  if (!token) {
    return cachedAccountList || { rows: [] };
  }

  try {
    const res = await client.get('/bulk/account/list?pageNum=1&pageSize=100');
    if (res.data && res.data.code === 200) {
      cachedAccountList = res.data;
      lastAccountFetchTime = now;
      return res.data;
    }
    return cachedAccountList || { rows: [] };
  } catch (err) {
    console.error('[Proxy Bridge Error] fetchAccountList:', err.response?.data || err.message);
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
  getEarnBondhuClient
};
