const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

// File paths for local development or Vercel /tmp fallback
let file = path.resolve(__dirname, 'database.json');
if (process.env.VERCEL) {
  const tmpFile = path.resolve('/tmp', 'database.json');
  try {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, tmpFile);
    }
  } catch (e) {}
  file = tmpFile;
}

const adapter = new FileSync(file);
const db = low(adapter);

// Set default collections
db.defaults({
  system_config: {
    target_base_url: 'https://earnbondhu.com',
    target_client_id: '209ef407810e3856f40870a9f0e769d7',
    master_target_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiJ3ZWJfdXNlcjoyMTEzNjU1Nzc5MTA4MjQxNDA5Iiwicm5TdHIiOiJ6dGxpdmtvSjNJY1pUODBSY1p3UUVRSXEwbXhQazh5ZiIsImNsaWVudGlkIjoiMjA5ZWY0MDc4MTBlMzg1NmY0MDg3MGE5ZjBlNzY5ZDciLCJ0ZW5hbnRJZCI6IjAwMDAwMCIsInVzZXJJZCI6MjExMzY1NTc3OTEwODI0MTQwOSwidXNlck5hbWUiOiI4ODAxNzI5MjYxNDIxIiwidXNlclR5cGUiOiJ3ZWJfdXNlciJ9.JU12rqWmOQGThzt3icmevp7qczEGX0bscHibiKLM2lg',
    user_reward_ratio: 0.80,
    referral_reward_ratio: 0.70,
    site_name: 'EarnPulse',
    min_withdraw_amount: 100,
    currency: '৳',
    notice_message: 'স্বাগতম! আপনার হোয়াটসঅ্যাপ অ্যাকাউন্ট যুক্ত করে প্রতিদিন ঘরে বসে নিশ্চিত আয় করুন।'
  },
  users: [],
  linked_numbers: [],
  earnings_log: [],
  withdrawals: []
}).write();

// -------------------------------------------------------------
// CLOUD DATABASE INTEGRATION (MongoDB Atlas 24/7 Persistent Storage)
// Serverless-Optimized Connection Pool (Strictly Capped to Protect Free Tier M0)
// -------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://globalquraniconlineacademy4_db_user:v80y3zKN3GM2GcuH@cluster0.1fsdmme.mongodb.net/earnpulse?retryWrites=true&w=majority';

async function getMongoDb() {
  if (!MONGODB_URI) return null;
  if (global._cachedMongoDb) return global._cachedMongoDb;
  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 2,           // Maximum 2 connections per lambda container (prevents connection exhaustion)
        minPoolSize: 0,           // Release idle connections back to Atlas
        maxIdleTimeMS: 5000,      // Close idle sockets after 5s
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000
      });
      global._mongoClientPromise = client.connect();
    }
    const client = await global._mongoClientPromise;
    global._cachedMongoDb = client.db('earnpulse');
    console.log('✅ [Database] Connected to 24/7 Persistent MongoDB Atlas successfully!');
    return global._cachedMongoDb;
  } catch (err) {
    global._mongoClientPromise = null;
    global._cachedMongoDb = null;
    console.error('❌ [Database Error] MongoDB connection failed:', err.message);
    return null;
  }
}

const INVALID_DUPLICATE_LOG_IDS = new Set([
  1793085000001,
  1793085000002,
  1793085000003,
  1793085000004,
  1793085000005,
  1793085000006,
  1793170211330,
  1793172861121,
  1793173093705,
  1793173133934,
  1793173387936,
  1793173387951,
  1793173388522,
  1793173388740,
  1793173389062,
  1793173389178,
  1793173390196,
  1793174193690,
  1793174194373,
  1793174194396,
  1793174212471,
  1793174212494,
  1793174216352,
  1793174216372,
  1793174294300,
  1793174294321,
  1793174395338,
  1793174395358,
  1793174399867,
  1793174399890,
  1793174698398,
  1793174698418,
  1793175072567,
  1793175072591,
  1793175102643,
  1793175102662,
  1793175126306,
  1793175126330
]);

let hasSyncedFromCloud = false;
let lastCloudSyncTime = 0;
let isSyncingFromCloud = false;

// Sync from MongoDB Atlas into lowdb on startup/request
async function syncFromCloud(force = false) {
  if (!MONGODB_URI) return;
  const now = Date.now();
  if (!force && hasSyncedFromCloud && (now - lastCloudSyncTime < 8000)) {
    return;
  }
  if (isSyncingFromCloud) return;
  isSyncingFromCloud = true;
  try {
    const mdb = await getMongoDb();
    if (!mdb) return;

    const doc = await mdb.collection('app_state').findOne({ _id: 'earnpulse_store' });
    if (doc && doc.data) {
      if (Array.isArray(doc.data.earnings_log)) {
        doc.data.earnings_log = doc.data.earnings_log.filter(l => !INVALID_DUPLICATE_LOG_IDS.has(Number(l.id)));
      }
      if (Array.isArray(doc.data.withdrawals)) {
        // টার্মিনাল স্ট্যাটাস সুরক্ষা: লোকাল মেমোরিতে যদি ইতিমধ্যে 'approved' বা 'rejected' থাকে, তবে ক্লাউডের স্টেল 'pending' দ্বারা যেন তা ওভাররাইট না হয়
        const currentW = db.getState().withdrawals || [];
        const wMap = new Map();
        doc.data.withdrawals.forEach(w => { if (w && w.id) wMap.set(String(w.id), w); });
        currentW.forEach(w => {
          if (w && w.id && (w.status === 'approved' || w.status === 'rejected')) {
            wMap.set(String(w.id), w);
          }
        });
        doc.data.withdrawals = Array.from(wMap.values()).sort((a, b) => b.id - a.id);
      }
      if (Array.isArray(doc.data.users)) {
        const u = doc.data.users.find(x => x.username === '01356690484');
        if (u) {
          u.balance = 148.0;
          u.total_earned = 148.0;
          u.total_withdrawn = 0;
        }

        // প্রতিটি ইউজারের লাইভ ব্যালেন্স ও মোট উত্তোলন (অনুমোদিত + পেন্ডিং) হিস্ট্রি থেকে নির্ভুল সিনক্রোনাইজেশন
        if (Array.isArray(doc.data.withdrawals)) {
          doc.data.users.forEach(userItem => {
            if (userItem && userItem.username !== '01356690484') {
              const uClean = String(userItem.username || '').replace(/^\+?880/, '').replace(/^0+/, '').trim();
              const userWList = doc.data.withdrawals.filter(w => 
                w && (
                  w.user_id === userItem.id || 
                  String(w.username || '').replace(/^\+?880/, '').replace(/^0+/, '').trim() === uClean
                )
              );
              if (userWList.length > 0) {
                const appAmt = userWList.filter(w => w.status === 'approved').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
                const pendAmt = userWList.filter(w => w.status === 'pending').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
                const lockedTotal = parseFloat((appAmt + pendAmt).toFixed(2));
                const trueEarned = Math.max(Number(userItem.total_earned || 0), Number(userItem.balance || 0) + lockedTotal);
                userItem.total_earned = trueEarned;
                userItem.balance = parseFloat(Math.max(0, trueEarned - lockedTotal).toFixed(2));
                userItem.total_withdrawn = lockedTotal;
              }
            }
          });
        }
      }
      db.setState(doc.data);
      hasSyncedFromCloud = true;
      lastCloudSyncTime = Date.now();
      try { originalAdapterWrite(doc.data); } catch (e) {}
      console.log(`☁️ [Database] Synced ${doc.data.users?.length || 0} users from MongoDB Atlas!`);
    } else {
      hasSyncedFromCloud = true;
      lastCloudSyncTime = Date.now();
      await syncToCloud(true);
    }
  } catch (err) {
    console.error('❌ [Database Sync Error]:', err.message);
  } finally {
    isSyncingFromCloud = false;
  }
}

function hasSyncedFromCloudOnce() {
  return hasSyncedFromCloud;
}

// Persist lowdb state to MongoDB Atlas (Debounced & Protected Against Accidental Data Loss)
let syncToCloudDebounceTimer = null;
let isSyncingToCloud = false;
let pendingSyncToCloud = false;

async function syncToCloud(immediate = false) {
  if (!MONGODB_URI) return;

  if (!immediate) {
    if (syncToCloudDebounceTimer) {
      clearTimeout(syncToCloudDebounceTimer);
    }
    return new Promise((resolve) => {
      syncToCloudDebounceTimer = setTimeout(async () => {
        syncToCloudDebounceTimer = null;
        await _performSyncToCloud();
        resolve();
      }, 300);
    });
  }

  if (syncToCloudDebounceTimer) {
    clearTimeout(syncToCloudDebounceTimer);
    syncToCloudDebounceTimer = null;
  }
  return _performSyncToCloud();
}

async function _performSyncToCloud() {
  if (isSyncingToCloud) {
    pendingSyncToCloud = true;
    return;
  }
  isSyncingToCloud = true;
  try {
    const mdb = await getMongoDb();
    if (!mdb) return;

    if (!hasSyncedFromCloud) {
      try { await syncFromCloud(true); } catch (e) {}
    }

    const currentState = db.getState();

    // 🛡️ UNBREAKABLE PERMANENT DATA PRESERVATION GUARD:
    // কোনো মেম্বার অ্যাকাউন্ট, ব্যালেন্স, বা দৈনিক চেক-ইন কখনো মোছা বা কমে যাওয়া যাবে না!
    const existing = await mdb.collection('app_state').findOne({ _id: 'earnpulse_store' });
    if (existing && existing.data) {
      // ১. উত্তোলন হিস্ট্রি (withdrawals) পার্মানেন্ট ইউনিয়ন (টার্মিনাল স্ট্যাটাস একমুখী সুরক্ষা)
      // আগে উইথড্রয়াল স্ট্যাটাস চূড়ান্ত করা হবে, যাতে প্রতিটি মেম্বারের ব্যালেন্স সঠিকভাবে গাণিতিকভাবে নির্ধারণ করা যায়
      const cloudW = existing.data.withdrawals || [];
      const currentW = currentState.withdrawals || [];
      const wMap = new Map();
      cloudW.forEach(w => { if (w && w.id) wMap.set(String(w.id), w); });
      currentW.forEach(w => {
        if (w && w.id) {
          const key = String(w.id);
          const existingW = wMap.get(key);
          if (existingW) {
            // টার্মিনাল স্ট্যাটাস ('approved' বা 'rejected') কখনোই স্টেল ইনস্ট্যান্সের 'pending' দ্বারা রিভার্ট হবে না
            const isCloudTerminal = existingW.status === 'approved' || existingW.status === 'rejected';
            const isCurrentTerminal = w.status === 'approved' || w.status === 'rejected';
            if (isCloudTerminal && !isCurrentTerminal) {
              wMap.set(key, existingW);
            } else {
              wMap.set(key, { ...existingW, ...w });
            }
          } else {
            wMap.set(key, w);
          }
        }
      });
      currentState.withdrawals = Array.from(wMap.values()).sort((a, b) => b.id - a.id);

      // ২. মেম্বার অ্যাকাউন্ট শতভাগ সুরক্ষা ও ব্যালেন্স/চেকইন আপগ্রেড মার্জ
      const cloudUsers = existing.data.users || [];
      const currentUsers = currentState.users || [];
      const userMap = new Map();

      // ক্লাউডের প্রতিটি সক্রিয় মেম্বার রাখা হবে
      cloudUsers.forEach(u => {
        if (u && (u.id || u.username)) {
          const key = String(u.username || u.id);
          userMap.set(key, u);
        }
      });

      // লোকালের নতুন নিবন্ধিত মেম্বার ও আপডেট মার্জ (কখনোই ব্যালেন্স বা হিস্ট্রি ডাউনগ্রেড হবে না)
      currentUsers.forEach(u => {
        if (u && (u.id || u.username)) {
          const key = String(u.username || u.id);
          const existingU = userMap.get(key);
          if (existingU) {
            // মোট অর্জিত আয় সুরক্ষা
            let mergedTotal = Math.max(Number(existingU.total_earned || existingU.balance || 0), Number(u.total_earned || u.balance || 0));

            // এই মেম্বারের আসল উইথড্রয়াল হিসাব (অনুমোদিত ও পেন্ডিং থেকে সরাসরি গাণিতিক ব্যালেন্স নিশ্চিতকরণ)
            const uPhoneClean = String(u.username || key).replace(/^\+?880/, '').replace(/^0+/, '').trim();
            const memberWList = currentState.withdrawals.filter(w => 
              w && (
                w.user_id === u.id || 
                (existingU && w.user_id === existingU.id) || 
                String(w.username || '').replace(/^\+?880/, '').replace(/^0+/, '').trim() === uPhoneClean
              )
            );

            const approvedAmount = memberWList.filter(w => w.status === 'approved').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
            const pendingAmount = memberWList.filter(w => w.status === 'pending').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
            const totalLockedOrPaid = parseFloat((approvedAmount + pendingAmount).toFixed(2));

            let mergedWithdrawn = parseFloat((approvedAmount + pendingAmount).toFixed(2));
            let mergedBalance = parseFloat(Math.max(0, mergedTotal - totalLockedOrPaid).toFixed(2));

            // 🛡️ Correction for duplicate-inflated account 01356690484:
            if (key === '01356690484' || String(u.username) === '01356690484' || String(existingU.username) === '01356690484') {
              mergedTotal = 148.0;
              mergedWithdrawn = 0;
              mergedBalance = 148.0;
            }

            // চেক-ইন হিস্ট্রি ইউনিয়ন - একবার ক্লেইম হলে তা চিরস্থায়ী থাকবে
            const historySet = new Set([
              ...(Array.isArray(existingU.checkin_history) ? existingU.checkin_history : []),
              ...(Array.isArray(u.checkin_history) ? u.checkin_history : [])
            ]);
            const mergedHistory = Array.from(historySet);
            const mergedCount = Math.max(Number(existingU.checkin_count || 0), Number(u.checkin_count || 0), mergedHistory.length);

            // সর্বশেষ চেক-ইন তারিখ সংরক্ষণ
            const lastDate = (existingU.last_checkin_date && u.last_checkin_date)
              ? (existingU.last_checkin_date > u.last_checkin_date ? existingU.last_checkin_date : u.last_checkin_date)
              : (existingU.last_checkin_date || u.last_checkin_date || null);

            userMap.set(key, {
              ...existingU,
              ...u,
              balance: mergedBalance,
              total_earned: mergedTotal,
              total_withdrawn: mergedWithdrawn,
              checkin_history: mergedHistory,
              checkin_count: mergedCount,
              last_checkin_date: lastDate
            });
          } else {
            userMap.set(key, u);
          }
        }
      });

      currentState.users = Array.from(userMap.values());

      // ২. পেন্ডিং পেয়ারিং কোড পার্মানেন্ট ইউনিয়ন (সবার আগে মার্জ করা যাতে নম্বরের আসল মালিক নিশ্চিত হওয়া যায়)
      const cloudP = existing.data.pending_pairings || [];
      const currentP = currentState.pending_pairings || [];
      const pMap = new Map();
      cloudP.forEach(p => { if (p && p.phone_number) pMap.set(String(p.phone_number).replace(/^\+?880/, '').replace(/^0+/, '').trim(), p); });
      currentP.forEach(p => { if (p && p.phone_number) pMap.set(String(p.phone_number).replace(/^\+?880/, '').replace(/^0+/, '').trim(), p); });
      currentState.pending_pairings = Array.from(pMap.values());

      const pendingList = currentState.pending_pairings;
      const userList = currentState.users;

      const getTrueOwnerId = (phone, fallbackId) => {
        const clean = String(phone).replace(/^\+?880/, '').replace(/^0+/, '').trim();
        const p = pendingList.find(x => String(x.phone_number).replace(/^\+?880/, '').replace(/^0+/, '').trim() === clean);
        if (p && p.user_id) return p.user_id;

        const u = userList.find(x => String(x.username).replace(/^\+?880/, '').replace(/^0+/, '').trim() === clean);
        if (u && u.id) return u.id;

        return fallbackId;
      };

      // ৩. লিঙ্কড হোয়াটসঅ্যাপ নম্বর সুরক্ষা ও ইউনিয়ন
      const cloudNumbers = existing.data.linked_numbers || [];
      const currentNumbers = currentState.linked_numbers || [];
      const numMap = new Map();

      cloudNumbers.forEach(n => {
        if (n && n.phone_number) {
          const key = String(n.phone_number).replace(/^\+?880/, '').replace(/^0+/, '').trim();
          const trueUid = getTrueOwnerId(n.phone_number, n.user_id);
          numMap.set(key, { ...n, user_id: trueUid });
        }
      });

      currentNumbers.forEach(n => {
        if (n && n.phone_number) {
          const key = String(n.phone_number).replace(/^\+?880/, '').replace(/^0+/, '').trim();
          const existingN = numMap.get(key);
          const trueUid = getTrueOwnerId(n.phone_number, existingN ? existingN.user_id : n.user_id);
          if (existingN) {
            numMap.set(key, { ...existingN, ...n, user_id: trueUid });
          } else {
            numMap.set(key, { ...n, user_id: trueUid });
          }
        }
      });

      currentState.linked_numbers = Array.from(numMap.values());

      // ৪. ট্রানজ্যাকশন ও আয়ের হিসাব (earnings_log) - ডুপ্লিকেট চিরতরে ফিল্টার
      const cloudLogs = existing.data.earnings_log || [];
      const currentLogs = currentState.earnings_log || [];
      const logMap = new Map();
      cloudLogs.forEach(l => { if (l && l.id) logMap.set(String(l.id), l); });
      currentLogs.forEach(l => { if (l && l.id) logMap.set(String(l.id), l); });
      currentState.earnings_log = Array.from(logMap.values())
        .filter(l => !INVALID_DUPLICATE_LOG_IDS.has(Number(l.id)))
        .sort((a, b) => b.id - a.id);

      // ৫. সিস্টেম কনফিগারেশন (system_config) মার্জ ও স্থায়ী সুরক্ষা:
      // অ্যাডমিন প্যানেল থেকে কনফিগারেশন পরিবর্তন ক্লাউডে অগ্রাধিকার পাবে এবং
      // কোনো স্টেল বা কোল্ড-স্টার্ট ইনস্ট্যান্স যেন অ্যাডমিনের সেভ করা মান মুছে না ফেলে!
      const cloudConfig = existing.data.system_config || {};
      const currentConfig = currentState.system_config || {};
      const cloudTime = Number(cloudConfig.config_updated_at || 0);
      const currentTime = Number(currentConfig.config_updated_at || 0);

      if (currentTime > cloudTime) {
        // এই ইনস্ট্যান্সে অ্যাডমিন নতুন কনফিগারেশন সেভ করেছে (উচ্চতর টাইমস্ট্যাম্প)
        currentState.system_config = {
          ...cloudConfig,
          ...currentConfig,
          config_updated_at: currentTime
        };
      } else {
        // অন্যথায় ক্লাউড অ্যাটলাসই আসল সত্য (নতুন অ্যাডমিন সেটিংস সংরক্ষণ হবে)
        currentState.system_config = {
          ...currentConfig,
          ...cloudConfig,
          master_target_token: currentConfig.master_target_token || cloudConfig.master_target_token,
          min_withdraw_amount: cloudConfig.min_withdraw_amount !== undefined ? cloudConfig.min_withdraw_amount : (currentConfig.min_withdraw_amount || 100),
          user_reward_ratio: cloudConfig.user_reward_ratio !== undefined ? cloudConfig.user_reward_ratio : (currentConfig.user_reward_ratio || 80),
          app_download_url: cloudConfig.app_download_url || currentConfig.app_download_url || '/downloads/EarnPulse.apk',
          config_updated_at: cloudTime || currentTime || 1
        };
      }
    }

    await mdb.collection('app_state').updateOne(
      { _id: 'earnpulse_store' },
      { $set: { data: currentState, updated_at: new Date() } },
      { upsert: true }
    );

    // মেমোরি স্টেটকেও সাথে সাথে আপডেটেড করে নেওয়া যাতে একই রিকোয়েস্টে পুরোনো ডাটা না থাকে
    db.setState(currentState);
  } catch (err) {
    console.error('❌ [Database Write Error] Failed to persist to MongoDB:', err.message);
  } finally {
    isSyncingToCloud = false;
    if (pendingSyncToCloud) {
      pendingSyncToCloud = false;
      await _performSyncToCloud();
    }
  }
}

// Wrap adapter.write and db.write to automatically trigger background cloud sync
db.lastCloudSyncPromise = null;

const originalAdapterWrite = adapter.write.bind(adapter);
adapter.write = function(data) {
  const res = originalAdapterWrite(data);
  if (MONGODB_URI && hasSyncedFromCloud) {
    db.lastCloudSyncPromise = syncToCloud();
  }
  return res;
};

const originalWrite = db.write.bind(db);
db.write = function() {
  const result = originalWrite();
  if (MONGODB_URI && hasSyncedFromCloud) {
    db.lastCloudSyncPromise = syncToCloud();
  }
  return result;
};

// Wrap db.read so that cloud-synced runtime state is never wiped out by static disk files
const originalRead = db.read.bind(db);
db.read = function() {
  if (hasSyncedFromCloud) {
    return db;
  }
  return originalRead();
};

// Initial sync
if (MONGODB_URI) {
  syncFromCloud();
}

db.syncFromCloud = syncFromCloud;
db.hasSyncedFromCloudOnce = hasSyncedFromCloudOnce;
db.syncToCloud = syncToCloud;
db.getMongoDb = getMongoDb;

module.exports = db;
