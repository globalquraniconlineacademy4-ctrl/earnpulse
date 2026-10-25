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
    if (!fs.existsSync(tmpFile) && fs.existsSync(file)) {
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
// -------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://globalquraniconlineacademy4_db_user:v80y3zKN3GM2GcuH@cluster0.1fsdmme.mongodb.net/earnpulse?retryWrites=true&w=majority';
let mongoDb = null;

async function getMongoDb() {
  if (!MONGODB_URI) return null;
  if (mongoDb) return mongoDb;
  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });
      global._mongoClientPromise = client.connect();
    }
    const client = await global._mongoClientPromise;
    mongoDb = client.db('earnpulse');
    console.log('✅ [Database] Connected to 24/7 Persistent MongoDB Atlas successfully!');
    return mongoDb;
  } catch (err) {
    console.error('❌ [Database Error] MongoDB connection failed:', err.message);
    return null;
  }
}

let hasSyncedFromCloud = false;

// Sync from MongoDB Atlas into lowdb on startup/request
async function syncFromCloud() {
  if (!MONGODB_URI) return;
  try {
    const mdb = await getMongoDb();
    if (!mdb) return;

    const doc = await mdb.collection('app_state').findOne({ _id: 'earnpulse_store' });
    if (doc && doc.data) {
      db.setState(doc.data);
      hasSyncedFromCloud = true;
      console.log(`☁️ [Database] Synced ${doc.data.users?.length || 0} users from MongoDB Atlas!`);
    } else {
      hasSyncedFromCloud = true;
      await syncToCloud();
    }
  } catch (err) {
    console.error('❌ [Database Sync Error]:', err.message);
  }
}

// Persist lowdb state to MongoDB Atlas (Protected Against Accidental Data Loss)
async function syncToCloud() {
  if (!MONGODB_URI) return;
  try {
    const mdb = await getMongoDb();
    if (!mdb) return;

    const currentState = db.getState();

    // 🛡️ UNBREAKABLE PERMANENT DATA PRESERVATION GUARD:
    // কোনো মেম্বার অ্যাকাউন্ট, ব্যালেন্স, বা দৈনিক চেক-ইন কখনো মোছা বা কমে যাওয়া যাবে না!
    const existing = await mdb.collection('app_state').findOne({ _id: 'earnpulse_store' });
    if (existing && existing.data) {
      // ১. মেম্বার অ্যাকাউন্ট শতভাগ সুরক্ষা ও ব্যালেন্স/চেকইন আপগ্রেড মার্জ
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
            // ব্যালেন্স বা মোট আয় কখনোই ভুলবশত কমে যাবে না (সর্বোচ্চটি থাকবে)
            const mergedBalance = Math.max(Number(existingU.balance || 0), Number(u.balance || 0));
            const mergedTotal = Math.max(Number(existingU.total_earned || 0), Number(u.total_earned || 0));

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

      // ২. লিঙ্কড হোয়াটসঅ্যাপ নম্বর সুরক্ষা ও ইউনিয়ন
      const cloudNumbers = existing.data.linked_numbers || [];
      const currentNumbers = currentState.linked_numbers || [];
      const numMap = new Map();

      cloudNumbers.forEach(n => {
        if (n && n.phone_number) {
          numMap.set(String(n.phone_number).trim(), n);
        }
      });

      currentNumbers.forEach(n => {
        if (n && n.phone_number) {
          const key = String(n.phone_number).trim();
          const existingN = numMap.get(key);
          if (existingN) {
            numMap.set(key, { ...existingN, ...n });
          } else {
            numMap.set(key, n);
          }
        }
      });

      currentState.linked_numbers = Array.from(numMap.values());

      // ৩. ট্রানজ্যাকশন ও আয়ের হিসাব (earnings_log) পার্মানেন্ট ইউনিয়ন
      const cloudLogs = existing.data.earnings_log || [];
      const currentLogs = currentState.earnings_log || [];
      const logMap = new Map();
      cloudLogs.forEach(l => { if (l && l.id) logMap.set(String(l.id), l); });
      currentLogs.forEach(l => { if (l && l.id) logMap.set(String(l.id), l); });
      currentState.earnings_log = Array.from(logMap.values()).sort((a, b) => b.id - a.id);

      // ৪. উত্তোলন হিস্ট্রি (withdrawals) পার্মানেন্ট ইউনিয়ন
      const cloudW = existing.data.withdrawals || [];
      const currentW = currentState.withdrawals || [];
      const wMap = new Map();
      cloudW.forEach(w => { if (w && w.id) wMap.set(String(w.id), w); });
      currentW.forEach(w => { if (w && w.id) wMap.set(String(w.id), w); });
      currentState.withdrawals = Array.from(wMap.values()).sort((a, b) => b.id - a.id);
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
  }
}

// Wrap adapter.write and db.write to automatically trigger background cloud sync
db.lastCloudSyncPromise = null;

const originalAdapterWrite = adapter.write.bind(adapter);
adapter.write = function(data) {
  const res = originalAdapterWrite(data);
  if (MONGODB_URI) {
    db.lastCloudSyncPromise = syncToCloud();
  }
  return res;
};

const originalWrite = db.write.bind(db);
db.write = function() {
  const result = originalWrite();
  if (MONGODB_URI) {
    db.lastCloudSyncPromise = syncToCloud();
  }
  return result;
};

// Initial sync
if (MONGODB_URI) {
  syncFromCloud();
}

db.syncFromCloud = syncFromCloud;
db.syncToCloud = syncToCloud;

module.exports = db;
