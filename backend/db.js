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

    // 🛡️ DATA LOSS PREVENTION GUARD:
    // কখনোই কোনো খালি বা অসম্পূর্ণ লোকাল ডাটা দিয়ে ক্লাউডের আসল মেম্বারদের অ্যাকাউন্ট মোছা যাবে না!
    if (!hasSyncedFromCloud) {
      const existing = await mdb.collection('app_state').findOne({ _id: 'earnpulse_store' });
      if (existing && existing.data && (existing.data.users?.length || 0) > (currentState.users?.length || 0)) {
        console.warn('🛡️ [Data Protection Guard] Blocked overwrite to protect member data! Restoring cloud state.');
        db.setState(existing.data);
        hasSyncedFromCloud = true;
        return;
      }
    }

    await mdb.collection('app_state').updateOne(
      { _id: 'earnpulse_store' },
      { $set: { data: currentState, updated_at: new Date() } },
      { upsert: true }
    );
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
