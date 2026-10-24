const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// Support Vercel /tmp writable directory or local directory
let file = path.resolve(__dirname, 'database.json');
if (process.env.VERCEL) {
  const tmpFile = path.resolve('/tmp', 'database.json');
  if (!fs.existsSync(tmpFile)) {
    try {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, tmpFile);
      }
    } catch (e) {}
  }
  file = tmpFile;
}

const adapter = new FileSync(file);
const db = low(adapter);

// Set default collections
db.defaults({
  system_config: {
    target_base_url: 'https://earnbondhu.com',
    target_client_id: '209ef407810e3856f40870a9f0e769d7',
    master_target_token: '', // Admin token from EarnBondhu
    user_reward_ratio: 0.80,  // 80% to user, 20% to platform owner
    referral_reward_ratio: 0.70, // 70% to user
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

module.exports = db;
