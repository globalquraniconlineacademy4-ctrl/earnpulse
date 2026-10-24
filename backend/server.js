const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const bridge = require('./bridge');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'earnpulse_ultra_secure_secret_key_2026';

app.use(cors());
app.use(express.json());

// Normalize routes: support both /api/... and direct calls on Vercel
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/admin') && req.url !== '/' && !req.url.startsWith('/assets')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Cloud Database Sync Middleware (MongoDB Atlas 24/7 Persistent Storage)
let isCloudSyncedOnce = false;
app.use(async (req, res, next) => {
  if (db.syncFromCloud && (!isCloudSyncedOnce || Math.random() < 0.15)) {
    try {
      await db.syncFromCloud();
      isCloudSyncedOnce = true;
    } catch (e) {}
  }

  // Intercept res.json to ensure any pending MongoDB Atlas writes finish before responding
  const originalJson = res.json.bind(res);
  res.json = async function(data) {
    if (db.lastCloudSyncPromise) {
      try {
        await db.lastCloudSyncPromise;
      } catch (err) {}
    }
    return originalJson(data);
  };

  next();
});

// Serve Admin Panel Statically
const adminDir = fs.existsSync(path.join(__dirname, '../admin')) 
  ? path.join(__dirname, '../admin') 
  : path.join(__dirname, 'admin');

if (fs.existsSync(adminDir)) {
  app.use('/admin', express.static(adminDir));
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(adminDir, 'index.html'));
  });
}

// Helper: Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, msg: 'লগইন আবশ্যক' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, msg: 'টোকেন অকার্যকর বা মেয়াদোত্তীর্ণ' });
    req.user = user;
    next();
  });
}

// Helper: Admin Check
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, msg: 'অ্যাডমিন অধিকার প্রয়োজন' });
  }
  next();
}

// -------------------------------------------------------------
// CHECK-IN API (৭ দিন প্রতিদিন ১০ টাকা = ৭০ টাকা)
// -------------------------------------------------------------
app.get('/api/checkin/status', authenticateToken, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const linkedNumbers = db.get('linked_numbers').filter({ user_id: req.user.id }).value();

  // Calculate total online hours of all numbers
  const totalOnlineMinutes = linkedNumbers.reduce((sum, n) => sum + (n.online_time_minutes || 0), 0);
  const onlineHours = (totalOnlineMinutes / 60);

  const todayStr = new Date().toISOString().split('T')[0];
  const lastCheckIn = user.last_checkin_date || null;
  const isCheckedInToday = lastCheckIn === todayStr;

  return res.json({
    success: true,
    canCheckIn: onlineHours >= 6 && !isCheckedInToday,
    onlineHours: onlineHours.toFixed(2),
    requiredHours: 6,
    isCheckedInToday,
    checkInReward: 10.0
  });
});

app.post('/api/checkin/do', authenticateToken, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const linkedNumbers = db.get('linked_numbers').filter({ user_id: req.user.id }).value();

  const totalOnlineMinutes = linkedNumbers.reduce((sum, n) => sum + (n.online_time_minutes || 0), 0);
  const onlineHours = (totalOnlineMinutes / 60);

  const todayStr = new Date().toISOString().split('T')[0];
  if (user.last_checkin_date === todayStr) {
    return res.status(400).json({ success: false, msg: 'আজকের চেক-ইন ইতোমধ্যে সম্পন্ন হয়েছে!' });
  }

  // Check 6 hours online rule as per original policy
  if (onlineHours < 6) {
    return res.status(400).json({ 
      success: false, 
      msg: `চেক-ইন করতে WhatsApp কমপক্ষে ৬ ঘণ্টা অনলাইনে থাকতে হবে। আপনার অনলাইন সময়: ${onlineHours.toFixed(2)}/৬ ঘণ্টা` 
    });
  }

  const reward = 10.0;
  db.get('users')
    .find({ id: req.user.id })
    .assign({
      balance: (user.balance || 0) + reward,
      total_earned: (user.total_earned || 0) + reward,
      last_checkin_date: todayStr
    })
    .write();

  db.get('earnings_log').push({
    id: Date.now(),
    user_id: req.user.id,
    type: 'daily_checkin',
    amount: reward,
    description: 'দৈনিক চেক-ইন বোনাস',
    created_at: new Date().toISOString()
  }).write();

  return res.json({
    success: true,
    msg: 'অভিনন্দন! আপনার চেক-ইন সফল হয়েছে এবং ৳১০ ব্যালেন্সে যোগ হয়েছে।',
    reward
  });
});

// -------------------------------------------------------------
// 1. AUTHENTICATION & REGISTRATION
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { username, password, inviteCode } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, msg: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড আবশ্যক' });
  }

  // Check if user already exists
  const existing = db.get('users').find({ username }).value();
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      code: 'USER_ALREADY_EXISTS',
      msg: 'এই ফোন নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! দয়া করে পাসওয়ার্ড দিয়ে লগইন করুন।' 
    });
  }

  // Handle Referrer
  let referrerId = null;
  if (inviteCode) {
    const referrer = db.get('users').find({ invite_code: inviteCode }).value();
    if (referrer) {
      referrerId = referrer.id;
    }
  }

  // Generate unique 6-character invite code
  const userInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const passwordHash = bcrypt.hashSync(password, 10);

  // First registered user automatically becomes admin
  const userCount = db.get('users').size().value();
  const role = userCount === 0 ? 'admin' : 'user';

  const newUser = {
    id: Date.now(),
    username,
    password_hash: passwordHash,
    invite_code: userInviteCode,
    referred_by_id: referrerId,
    balance: 0.0,
    total_earned: 0.0,
    total_withdrawn: 0.0,
    role,
    created_at: new Date().toISOString()
  };

  db.get('users').push(newUser).write();
  const token = jwt.sign({ id: newUser.id, username, role }, JWT_SECRET, { expiresIn: '30d' });

  return res.json({
    success: true,
    msg: 'নিবন্ধন সফল হয়েছে',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      inviteCode: userInviteCode,
      role: newUser.role,
      balance: 0.0
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, msg: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করুন' });
  }

  username = String(username).trim();
  const cleanPhone = username.replace(/^0/, '');
  
  // Find user by exact username, or with/without leading 0
  let user = db.get('users').find({ username }).value();
  if (!user) {
    user = db.get('users').find(u => u.username === cleanPhone || u.username === '0' + cleanPhone).value();
  }

  if (!user) {
    return res.status(400).json({ success: false, msg: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(400).json({ success: false, msg: 'ভুল পাসওয়ার্ড' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

  return res.json({
    success: true,
    msg: 'লগইন সফল হয়েছে',
    token,
    user: {
      id: user.id,
      username: user.username,
      inviteCode: user.invite_code,
      role: user.role,
      balance: user.balance,
      totalEarned: user.total_earned,
      totalWithdrawn: user.total_withdrawn
    }
  });
});

// -------------------------------------------------------------
// 2. USER PROFILE & STATS
// -------------------------------------------------------------
app.get('/api/user/me', authenticateToken, async (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

  // Sync real WhatsApp account status from EarnBondhu
  let linkedNumbers = db.get('linked_numbers').filter({ user_id: req.user.id }).value() || [];
  
  // Real check with target server
  try {
    const ebAccounts = await bridge.fetchAccountList();
    const rows = ebAccounts.rows || [];

    // ONLY perform sync if EarnBondhu responded with active rows
    if (rows && rows.length > 0) {
      const toRemoveIds = [];
      for (const record of linkedNumbers) {
        const cleanPhone = String(record.phone_number).replace(/^[0+]/, '').trim();
        const match = rows.find(r => 
          (r.phoneNumber && String(r.phoneNumber).trim() === cleanPhone) ||
          (r.pn && String(r.pn).includes(cleanPhone))
        );

        if (match) {
          const isOnline = String(match.status).toLowerCase() === 'online';
          const hasEverConnected = Boolean(match.loginDate || record.login_date);

          if (isOnline) {
            db.get('linked_numbers')
              .find({ id: record.id })
              .assign({
                status: 'online',
                login_date: match.loginDate || record.login_date,
                create_time: match.createTime || record.create_time,
                raw_status: match.status,
                sent_count: match.bulkCount || 0,
                online_time_ms: match.onlineTime || 0,
                last_count_time: match.lastCountTime || null,
                frozen_elapsed_seconds: null,
                offline_at: null,
                updated_at: new Date().toISOString()
              })
              .write();
            record.status = 'online';
            record.login_date = match.loginDate || record.login_date;
            record.frozen_elapsed_seconds = null;
            record.offline_at = null;
          } else if (hasEverConnected) {
            // It was connected before but now Exit / Offline -> FREEZE elapsed timer!
            let frozenSec = record.frozen_elapsed_seconds;
            if (match.onlineTime && match.onlineTime > 0) {
              frozenSec = Math.floor(match.onlineTime / 1000);
            } else if (!frozenSec) {
              const dStr = match.loginDate || record.login_date;
              if (dStr) {
                const pDate = dStr.includes('T') ? new Date(dStr).getTime() : new Date(dStr.replace(' ', 'T') + '+06:00').getTime();
                const stopTime = match.lastCountTime 
                  ? (match.lastCountTime.includes('T') ? new Date(match.lastCountTime).getTime() : new Date(match.lastCountTime.replace(' ', 'T') + '+06:00').getTime())
                  : (record.offline_at ? new Date(record.offline_at).getTime() : Date.now());
                if (!isNaN(pDate) && !isNaN(stopTime) && stopTime > pDate) {
                  frozenSec = Math.min(24 * 3600, Math.floor((stopTime - pDate) / 1000));
                }
              }
            }

            db.get('linked_numbers')
              .find({ id: record.id })
              .assign({
                status: 'offline',
                login_date: match.loginDate || record.login_date,
                create_time: match.createTime || record.create_time,
                raw_status: match.status,
                sent_count: match.bulkCount || 0,
                online_time_ms: match.onlineTime || 0,
                last_count_time: match.lastCountTime || null,
                frozen_elapsed_seconds: frozenSec || record.frozen_elapsed_seconds || 0,
                offline_at: record.offline_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .write();
            record.status = 'offline';
            record.login_date = match.loginDate || record.login_date;
            record.frozen_elapsed_seconds = frozenSec || record.frozen_elapsed_seconds || 0;
          } else {
            // NEVER connected (PairError / null loginDate)! Purge from user's list!
            toRemoveIds.push(record.id);
          }
        }
      }

      if (toRemoveIds.length > 0) {
        for (const id of toRemoveIds) {
          db.get('linked_numbers').remove({ id }).write();
        }
      }

      // 2. Check pending pairings or EarnBondhu accounts that actually connected
      const pendingPairings = db.get('pending_pairings').value() || [];
      for (const ebAcc of rows) {
        if (!ebAcc.phoneNumber && !ebAcc.pn) continue;
        const cleanEb = String(ebAcc.phoneNumber || ebAcc.pn).replace(/^\+?880/, '').trim();
        if (!cleanEb) continue;

        const isOnline = String(ebAcc.status).toLowerCase() === 'online';
        const hasEverConnected = Boolean(ebAcc.loginDate);

        // ONLY process accounts that actually connected on WhatsApp!
        if (!isOnline && !hasEverConnected) continue;

        const alreadyExists = db.get('linked_numbers').find(l => 
          String(l.phone_number).trim() === cleanEb
        ).value();

        if (!alreadyExists) {
          // Check if this belongs to current user via pending_pairings or phone match
          const pending = pendingPairings.find(p => p.phone_number === cleanEb && p.user_id === user.id);
          const matchesUser = user.username.includes(cleanEb) || cleanEb.includes(user.username.replace(/^[0+]/, ''));
          const isAdmin = user.role === 'admin';

          if (pending || matchesUser || isAdmin) {
            const newRecord = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              user_id: user.id,
              phone_number: cleanEb,
              country_code: ebAcc.countryCode || '880',
              pairing_code: pending ? pending.pairing_code : 'AUTO-SYNC',
              status: isOnline ? 'online' : 'offline',
              login_date: ebAcc.loginDate || null,
              create_time: ebAcc.createTime || null,
              raw_status: ebAcc.status,
              sent_count: ebAcc.bulkCount || 0,
              online_time_ms: ebAcc.onlineTime || 0,
              last_count_time: ebAcc.lastCountTime || null,
              frozen_elapsed_seconds: isOnline ? null : (ebAcc.onlineTime ? Math.floor(ebAcc.onlineTime / 1000) : 0),
              offline_at: isOnline ? null : new Date().toISOString(),
              created_at: ebAcc.createTime ? new Date(ebAcc.createTime.replace(' ', 'T') + '+06:00').toISOString() : new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.get('linked_numbers').push(newRecord).write();
            if (pending) {
              db.get('pending_pairings').remove({ phone_number: cleanEb }).write();
            }
          }
        }
      }
    }

    // Re-read user's linked numbers after sync
    linkedNumbers = db.get('linked_numbers').filter({ user_id: req.user.id }).value() || [];
  } catch (syncErr) {
    console.error('EarnBondhu sync status error:', syncErr.message);
  }

  // Ensure any offline account has frozen_elapsed_seconds populated so timer remains frozen
  for (const n of linkedNumbers) {
    if (n.status === 'offline' && (!n.frozen_elapsed_seconds || n.frozen_elapsed_seconds <= 0)) {
      if (n.online_time_ms && n.online_time_ms > 0) {
        n.frozen_elapsed_seconds = Math.floor(n.online_time_ms / 1000);
      } else {
        const dStr = n.login_date || n.create_time;
        if (dStr) {
          const pDate = dStr.includes('T') ? new Date(dStr).getTime() : new Date(dStr.replace(' ', 'T') + '+06:00').getTime();
          const stopTime = n.offline_at ? new Date(n.offline_at).getTime() : (n.updated_at ? new Date(n.updated_at).getTime() : Date.now());
          if (!isNaN(pDate) && !isNaN(stopTime) && stopTime > pDate) {
            n.frozen_elapsed_seconds = Math.min(24 * 3600, Math.floor((stopTime - pDate) / 1000));
          }
        }
      }
      if (n.frozen_elapsed_seconds) {
        db.get('linked_numbers').find({ id: n.id }).assign({ frozen_elapsed_seconds: n.frozen_elapsed_seconds }).write();
      }
    }
  }

  // Display ONLY numbers that ACTUALLY connected (have valid login_date or are online)
  const displayNumbers = linkedNumbers.filter(n => 
    (n.status === 'online' || n.status === 'offline') && Boolean(n.login_date)
  );

  const referralCount = db.get('users').filter({ referred_by_id: req.user.id }).size().value();
  const config = db.get('system_config').value();

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      inviteCode: user.invite_code,
      balance: user.balance,
      totalEarned: user.total_earned,
      totalWithdrawn: user.total_withdrawn,
      role: user.role,
      created_at: user.created_at
    },
    linkedNumbers: displayNumbers,
    referralCount,
    config: {
      site_name: config.site_name,
      min_withdraw_amount: config.min_withdraw_amount,
      notice_message: config.notice_message
    }
  });
});

// -------------------------------------------------------------
// 3. WHATSAPP LINKING BRIDGE (PAIRING CODE)
// -------------------------------------------------------------
app.post('/api/whatsapp/get-pairing-code', authenticateToken, async (req, res) => {
  let { phoneNumber, countryCode } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, msg: 'হোয়াটসঅ্যাপ ফোন নম্বর প্রদান করুন' });
  }

  countryCode = countryCode || '880';
  phoneNumber = phoneNumber.replace(/^[0+]/, '').trim();

  // Call the proxy bridge
  const bridgeRes = await bridge.fetchPairingCode(countryCode, phoneNumber);

  if (bridgeRes.success) {
    if (!db.get('pending_pairings').value()) {
      db.set('pending_pairings', []).write();
    }
    // Remove previous pending attempts for this phone number
    db.get('pending_pairings').remove({ phone_number: phoneNumber }).write();
    db.get('pending_pairings').push({
      user_id: req.user.id,
      phone_number: phoneNumber,
      country_code: countryCode,
      pairing_code: bridgeRes.pairingCode,
      created_at: Date.now()
    }).write();

    return res.json({
      success: true,
      pairingCode: bridgeRes.pairingCode,
      phoneNumber,
      msg: 'পেয়ারিং কোড তৈরি হয়েছে! আপনার হোয়াটসঅ্যাপে লিংক করুন।'
    });
  } else {
    return res.status(500).json({
      success: false,
      msg: bridgeRes.msg || 'পেয়ারিং কোড আনতে সমস্যা হয়েছে।'
    });
  }
});

// -------------------------------------------------------------
// 4. REVENUE SHARING CALCULATION & SYNC (FIXED: 80% User, 20% Admin Profit)
// -------------------------------------------------------------
// কোনো মেম্বার যেখান থেকেই আয় করুক (টাস্ক, রেফার, বা হোয়াটসঅ্যাপ),
// মূল আয়ের ৮০% মেম্বার পাবে আর বাকি ২০% নিশ্চিত অ্যাডমিন প্রফিট হিসেবে থাকবে।
const USER_PROFIT_RATIO = 0.80; // ৮০% মেম্বার পেআউট (Fixed)
const ADMIN_PROFIT_MARGIN = 0.20; // ২০% অ্যাডমিন নেট লাভ (Fixed)

app.post('/api/whatsapp/sync-earnings', authenticateToken, async (req, res) => {
  const numbers = db.get('linked_numbers').filter({ user_id: req.user.id, status: 'online' }).value();

  let addedEarnings = 0;
  if (numbers && numbers.length > 0) {
    // আসল সাইট থেকে গ্রস আয়: প্রতি সক্রিয় নাম্বারে ৫ টাকা
    // মেম্বার পাবে: ৫ * ০.৮০ = ৪ টাকা (৮০%)
    // অ্যাডমিন প্রফিট: ৫ * ০.২০ = ১ টাকা (২০%)
    const count = numbers.length;
    const grossIncome = count * 5.0; // মূল আর্নিং
    addedEarnings = grossIncome * USER_PROFIT_RATIO; // মেম্বারের ৮০%

    // Update numbers
    numbers.forEach(n => {
      db.get('linked_numbers')
        .find({ id: n.id })
        .assign({
          sent_count: (n.sent_count || 0) + 1,
          online_time_minutes: (n.online_time_minutes || 0) + 30,
          updated_at: new Date().toISOString()
        })
        .write();
    });

    // Update user balance
    const user = db.get('users').find({ id: req.user.id }).value();
    const newBal = (user.balance || 0) + addedEarnings;
    const newTotal = (user.total_earned || 0) + addedEarnings;

    db.get('users')
      .find({ id: req.user.id })
      .assign({ balance: newBal, total_earned: newTotal })
      .write();

    // Log earning
    db.get('earnings_log').push({
      id: Date.now(),
      user_id: req.user.id,
      type: 'whatsapp_online',
      amount: addedEarnings,
      description: `হোয়াটসঅ্যাপ রানিং আয় (৮০% পে-আউট)`,
      created_at: new Date().toISOString()
    }).write();

    // যদি ব্যবহারকারী কারও রেফারে জয়েন করে থাকে, তবে রেফারকারীকেও কমিশন দেওয়া হবে মূল আয়ের ৮০% নীতিতে
    if (user.referred_by_id) {
      const parentUser = db.get('users').find({ id: user.referred_by_id }).value();
      if (parentUser) {
        // আসল সাইট রেফারেল কমিশন দেয় ১৫% -> এখানে ৮০% নীতিতে কার্যকর:
        const refBonus = addedEarnings * 0.15 * USER_PROFIT_RATIO;
        db.get('users')
          .find({ id: parentUser.id })
          .assign({
            balance: (parentUser.balance || 0) + refBonus,
            total_earned: (parentUser.total_earned || 0) + refBonus
          })
          .write();

        db.get('earnings_log').push({
          id: Date.now() + 1,
          user_id: parentUser.id,
          type: 'referral_bonus',
          amount: refBonus,
          description: `দলের সদস্য (${user.username}) থেকে রেফারেল কমিশন`,
          created_at: new Date().toISOString()
        }).write();
      }
    }
  }

  const updatedUser = db.get('users').find({ id: req.user.id }).value();
  return res.json({
    success: true,
    addedEarnings,
    newBalance: updatedUser.balance
  });
});

// -------------------------------------------------------------
// 5. REFERRAL SYSTEM & TEAM (আমার দল - সাব-অর্ডিনেট)
// -------------------------------------------------------------
app.get('/api/referrals', authenticateToken, (req, res) => {
  const referrals = db.get('users')
    .filter({ referred_by_id: req.user.id })
    .map(u => {
      // Calculate member's own team count
      const subTeamCount = db.get('users').filter({ referred_by_id: u.id }).size().value() || 0;
      return {
        id: u.id,
        username: u.username,
        subTeamCount,
        total_earned: u.total_earned || 0,
        created_at: u.created_at
      };
    })
    .value() || [];

  // Calculate total commission earned from team
  const teamLogs = db.get('earnings_log')
    .filter({ user_id: req.user.id, type: 'referral_bonus' })
    .value() || [];
  const totalTeamEarnings = teamLogs.reduce((sum, l) => sum + (l.amount || 0), 0);

  return res.json({
    success: true,
    totalCount: referrals.length,
    totalTeamEarnings: totalTeamEarnings || 0,
    referrals
  });
});

// -------------------------------------------------------------
// 6. WITHDRAWALS
// -------------------------------------------------------------
app.post('/api/withdraw', authenticateToken, (req, res) => {
  const { amount, method, accountNumber } = req.body;
  const withdrawAmount = parseFloat(amount);
  const minWithdraw = parseFloat(bridge.getConfig('min_withdraw_amount') || 100);

  if (isNaN(withdrawAmount) || withdrawAmount < minWithdraw) {
    return res.status(400).json({ success: false, msg: `সর্বনিম্ন উত্তোলনের পরিমাণ ৳${minWithdraw}` });
  }

  if (!accountNumber || !method) {
    return res.status(400).json({ success: false, msg: 'পেমেন্ট মেথড এবং অ্যাকাউন্ট নম্বর প্রদান করুন' });
  }

  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user || user.balance < withdrawAmount) {
    return res.status(400).json({ success: false, msg: 'আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই' });
  }

  // Deduct user balance
  db.get('users')
    .find({ id: req.user.id })
    .assign({
      balance: user.balance - withdrawAmount,
      total_withdrawn: (user.total_withdrawn || 0) + withdrawAmount
    })
    .write();

  // Create withdrawal record
  const newWithdraw = {
    id: Date.now(),
    user_id: req.user.id,
    username: user.username,
    amount: withdrawAmount,
    method, // 'bkash', 'nagad', 'rocket'
    account_number: accountNumber,
    status: 'pending',
    admin_note: '',
    created_at: new Date().toISOString()
  };

  db.get('withdrawals').push(newWithdraw).write();

  return res.json({
    success: true,
    msg: 'উত্তোলন আবেদনটি সফলভাবে জমা নেওয়া হয়েছে! অ্যাডমিন কিছুক্ষণের মধ্যে পর্যালোচনা করে পেমেন্ট করবে।'
  });
});

app.get('/api/withdraw/history', authenticateToken, (req, res) => {
  const history = db.get('withdrawals')
    .filter({ user_id: req.user.id })
    .orderBy(['id'], ['desc'])
    .value();

  return res.json({ success: true, history });
});

// -------------------------------------------------------------
// 6.1 EARNINGS / TRANSACTIONS HISTORY (লেনদেনের ইতিহাস ও আয়ের বিবরণ)
// -------------------------------------------------------------
app.get('/api/user/transactions', authenticateToken, (req, res) => {
  const logs = db.get('earnings_log')
    .filter({ user_id: req.user.id })
    .orderBy(['id'], ['desc'])
    .value() || [];

  const withdrawals = db.get('withdrawals')
    .filter({ user_id: req.user.id })
    .orderBy(['id'], ['desc'])
    .value() || [];

  // Combine earnings and withdrawals into unified transaction list
  const combined = [
    ...logs.map(l => ({
      id: l.id,
      type: l.type, // 'daily_checkin', 'whatsapp_online', 'referral_bonus', 'register_bonus'
      amount: l.amount,
      isCredit: true,
      description: l.description,
      created_at: l.created_at
    })),
    ...withdrawals.map(w => ({
      id: w.id,
      type: 'withdraw',
      amount: w.amount,
      isCredit: false,
      status: w.status,
      description: `উত্তোলন (${w.method.toUpperCase()}) - ${w.status === 'approved' ? 'সফল' : (w.status === 'rejected' ? 'ব্যর্থ' : 'অপেক্ষমান')}`,
      created_at: w.created_at
    }))
  ];

  // Sort descending by created_at or id
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ success: true, transactions: combined });
});

// -------------------------------------------------------------
// 6.2 CHANGE PASSWORD API (পাসওয়ার্ড পরিবর্তন)
// -------------------------------------------------------------
app.post('/api/user/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, msg: 'পুরোনো ও নতুন পাসওয়ার্ড আবশ্যক' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, msg: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি' });
  }

  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) {
    return res.status(404).json({ success: false, msg: 'ইউজার পাওয়া যায়নি' });
  }

  // Verify old password
  const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, msg: 'পুরোনো পাসওয়ার্ডটি সঠিক নয়!' });
  }

  // Hash new password and update
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.get('users')
    .find({ id: req.user.id })
    .assign({ password_hash: newHash })
    .write();

  return res.json({ success: true, msg: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
});

// -------------------------------------------------------------
// 7. ADMIN DASHBOARD & CONTROLS
// -------------------------------------------------------------
app.get('/api/admin/overview', authenticateToken, requireAdmin, (req, res) => {
  const totalUsers = db.get('users').size().value();
  const totalLinked = db.get('linked_numbers').size().value();
  const pendingWithdrawals = db.get('withdrawals').filter({ status: 'pending' }).size().value();
  const withdrawalsList = db.get('withdrawals').value();
  const totalPaidOut = withdrawalsList
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const configs = db.get('system_config').value();
  const recentWithdrawals = db.get('withdrawals').orderBy(['id'], ['desc']).take(30).value();
  const usersList = db.get('users').orderBy(['id'], ['desc']).take(50).value().map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    balance: u.balance || 0,
    total_earned: u.total_earned || 0,
    created_at: u.created_at
  }));
  const numbersList = db.get('linked_numbers').orderBy(['id'], ['desc']).take(50).value();

  return res.json({
    success: true,
    stats: {
      totalUsers,
      totalLinked,
      pendingWithdrawals,
      totalPaidOut
    },
    configs,
    recentWithdrawals,
    usersList,
    numbersList
  });
});

app.post('/api/admin/config', authenticateToken, requireAdmin, (req, res) => {
  const { configs } = req.body;
  if (!configs || typeof configs !== 'object') {
    return res.status(400).json({ success: false, msg: 'অবৈধ কনফিগারেশন' });
  }

  const current = db.get('system_config').value();
  db.set('system_config', { ...current, ...configs }).write();

  return res.json({ success: true, msg: 'কনফিগারেশন সফলভাবে আপডেট করা হয়েছে' });
});

app.post('/api/admin/withdraw/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { status, adminNote } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, msg: 'অবৈধ স্ট্যাটাস' });
  }

  const withdraw = db.get('withdrawals').find({ id }).value();
  if (!withdraw) {
    return res.status(404).json({ success: false, msg: 'উত্তোলন রিকোয়েস্ট পাওয়া যায়নি' });
  }

  // Update status
  db.get('withdrawals')
    .find({ id })
    .assign({ status, admin_note: adminNote || '' })
    .write();

  // If rejected, refund balance to user
  if (status === 'rejected' && withdraw.status === 'pending') {
    const user = db.get('users').find({ id: withdraw.user_id }).value();
    if (user) {
      db.get('users')
        .find({ id: withdraw.user_id })
        .assign({
          balance: user.balance + withdraw.amount,
          total_withdrawn: Math.max(0, (user.total_withdrawn || 0) - withdraw.amount)
        })
        .write();
    }
  }

  return res.json({ success: true, msg: `উত্তোলন সফলভাবে ${status === 'approved' ? 'অনুমোদন' : 'বাতিল'} করা হয়েছে` });
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [EarnPulse Master Bridge Server] running on http://localhost:${PORT}`);
  });
}

module.exports = app;
