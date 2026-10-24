import React, { useState, useEffect } from 'react';
import { 
  Home, CheckSquare, MessageCircle, User, 
  ArrowRight, Copy, RefreshCw, ChevronRight, ChevronLeft,
  TrendingUp, Users, AlertCircle, Settings, Play,
  Download, Globe, CheckCircle2, ShieldCheck, HelpCircle,
  Eye, EyeOff
} from 'lucide-react';
import { translations } from './translations';

// API Base URL: Standardized to /api (Works with Vite proxy locally and Vercel in production)
const API_BASE = '/api';

// 24-Hour Live Countdown Timer (Exact EarnBondhu Match)
function WhatsAppCountdownTimer({ loginDate, createTime, status }) {
  const [timeStr, setTimeStr] = useState('24 : 00 : 00');

  useEffect(() => {
    const calc = () => {
      const dateStr = loginDate || createTime;
      if (!dateStr) return '24 : 00 : 00';

      // Parse date: EarnBondhu returns "2026-10-24 16:48:06" in BD Time (+06:00)
      let parsedDate = 0;
      if (dateStr.includes('T')) {
        parsedDate = new Date(dateStr).getTime();
      } else {
        parsedDate = new Date(dateStr.replace(' ', 'T') + '+06:00').getTime();
      }

      if (isNaN(parsedDate)) return '24 : 00 : 00';

      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - parsedDate) / 1000));
      const totalSeconds = 24 * 3600; // 24 Hours
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    };

    setTimeStr(calc());

    if (status !== 'online') {
      return; // Offline stops ticking
    }

    const interval = setInterval(() => {
      setTimeStr(calc());
    }, 1000);

    return () => clearInterval(interval);
  }, [loginDate, createTime, status]);

  return (
    <div style={{
      background: '#18191c',
      color: '#ffffff',
      padding: '4px 10px',
      borderRadius: '5px',
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: '13px',
      fontWeight: '700',
      letterSpacing: '1px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '95px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    }}>
      {timeStr}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash.replace('#', '').split('-')[0];
      if (['home', 'tasks', 'whatsapp', 'my', 'checkin', 'admin'].includes(hash)) {
        return hash;
      }
    } catch (e) {}
    return 'home';
  });
  const [linkedNumbers, setLinkedNumbers] = useState(() => {
    try {
      const saved = localStorage.getItem('cached_linked_numbers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [referrals, setReferrals] = useState([]);

  // Multi-Language System (English & বাংলা)
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'bn');
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLangTemp, setSelectedLangTemp] = useState(lang);
  const t = translations[lang] || translations.bn;
  
  // Auth Form
  const [isRegister, setIsRegister] = useState(false);
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authInviteCode, setAuthInviteCode] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Auto-detect invite code from URL parameters or Path (?invite=CODE, ?ref=CODE, /register?invite=CODE, /register/CODE)
  useEffect(() => {
    // 1. Check query parameters: ?invite=CODE or ?ref=CODE or ?code=CODE
    const params = new URLSearchParams(window.location.search);
    let inviteParam = params.get('invite') || params.get('ref') || params.get('code');

    // 2. Also check pathname if user entered e.g. /register/ABCDEF
    if (!inviteParam) {
      const match = window.location.pathname.match(/\/register\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        inviteParam = match[1];
      }
    }

    // 3. Check hash router or saved referral in sessionStorage
    if (!inviteParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#/?', '').replace('#', ''));
      inviteParam = hashParams.get('invite') || hashParams.get('ref');
    }

    if (inviteParam) {
      const cleanCode = inviteParam.trim().toUpperCase();
      sessionStorage.setItem('pending_invite_code', cleanCode);
      setAuthInviteCode(cleanCode);
      setIsRegister(true); // Automatically switch to registration tab
    } else {
      // If user navigated, check if they arrived via invite earlier in session
      const savedCode = sessionStorage.getItem('pending_invite_code');
      if (savedCode) {
        setAuthInviteCode(savedCode);
      }
    }
  }, []);

  // Pairing State
  const [inputPhone, setInputPhone] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [activePairingCode, setActivePairingCode] = useState('');
  const [isWaitingConnection, setIsWaitingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedTutorialImg, setSelectedTutorialImg] = useState(null);

  // Withdraw State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState('');
  const [teamStats, setTeamStats] = useState({ totalCount: 0, totalTeamEarnings: 0 });
  const [transactions, setTransactions] = useState([]);
  const [transFilter, setTransFilter] = useState('all'); // 'all', 'online', 'subCommission', 'checkIn', 'invite', 'register', 'dailyLogin', 'bindWhatsapp', 'system', 'withdraw'
  const [transDateFilter, setTransDateFilter] = useState('all'); // 'all', 'today', 'yesterday', '7days'
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showWithdrawHistoryModal, setShowWithdrawHistoryModal] = useState(false);
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState('all');
  const [withdrawDateFilter, setWithdrawDateFilter] = useState('all');
  const [withdrawHistoryLoading, setWithdrawHistoryLoading] = useState(false);

  // CheckIn State from backend
  const [checkInStatus, setCheckInStatus] = useState({
    canCheckIn: false,
    onlineHours: '0.00',
    requiredHours: 6,
    isCheckedInToday: false
  });

  const fetchCheckInStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/checkin/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.success) {
        setCheckInStatus(data);
      }
    } catch (e) {}
  };

  const handleDoCheckIn = async () => {
    try {
      const res = await fetch(`${API_BASE}/checkin/do`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.msg || (lang === 'bn' ? 'চেক-ইন প্রক্রিয়া সম্পন্ন' : 'Check-in processed'));
      fetchCheckInStatus();
      fetchUserData();
    } catch (e) {
      alert(lang === 'bn' ? 'চেক-ইন ব্যর্থ হয়েছে' : 'Check-in failed');
    }
  };

  useEffect(() => {
    if (activeTab === 'checkin' && token) {
      fetchCheckInStatus();
    }
  }, [activeTab, token]);

  const [copied, setCopied] = useState(false);

  // Admin Configuration State
  const [adminStats, setAdminStats] = useState(null);
  const [adminConfigs, setAdminConfigs] = useState({});
  const [adminWithdrawals, setAdminWithdrawals] = useState([]);
  const [adminSaving, setAdminSaving] = useState(false);

  // Live Random Withdraw Ticker State (200 থেকে 10000 টাকার মধ্যে প্রতি ৩.৫ সেকেন্ড পর পর পরিবর্তন)
  const [tickerNotification, setTickerNotification] = useState({
    user: '88017******9809',
    amount: '200.00'
  });

  useEffect(() => {
    const prefixes = ['017', '018', '019', '016', '013', '014', '015'];
    
    const interval = setInterval(() => {
      const isEmail = Math.random() < 0.25;
      let displayUser = '';

      if (isEmail) {
        const emailNames = ['hasan', 'rahim', 'sakib', 'shuvo', 'tanvir', 'arif', 'mim', 'sumon', 'kamal', 'robin'];
        const chosen = emailNames[Math.floor(Math.random() * emailNames.length)];
        displayUser = `${chosen.substring(0, 3)}***@gmail.com`;
      } else {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const lastDigits = Math.floor(1000 + Math.random() * 9000);
        displayUser = `88${prefix}******${lastDigits}`;
      }

      let randAmount = 200;
      const roll = Math.random();
      if (roll < 0.65) {
        const options = [200, 300, 350, 450, 500, 600, 750, 800, 1000];
        randAmount = options[Math.floor(Math.random() * options.length)];
      } else if (roll < 0.90) {
        const options = [1200, 1500, 1800, 2000, 2500, 3000, 3500];
        randAmount = options[Math.floor(Math.random() * options.length)];
      } else {
        const options = [4500, 5000, 6500, 7500, 8500, 10000];
        randAmount = options[Math.floor(Math.random() * options.length)];
      }

      setTickerNotification({
        user: displayUser,
        amount: randAmount.toFixed(2)
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // Mobile Back Button Navigation & History Management
  // -------------------------------------------------------------
  const activeTabRef = React.useRef(activeTab);
  activeTabRef.current = activeTab;

  const modalsRef = React.useRef({});
  modalsRef.current = {
    showNoticeModal,
    showWithdrawModal,
    showWithdrawHistoryModal,
    showShareModal,
    showTransactionsModal,
    showTeamModal,
    showChangePwdModal,
    showVideoModal,
    showLangModal,
    selectedTutorialImg
  };

  const lastBackPressTimeRef = React.useRef(0);
  const [exitToast, setExitToast] = useState(false);

  // Smooth Tab Navigation with History Tracking
  const navigateToTab = (newTab, push = true) => {
    if (activeTabRef.current === newTab) return;
    setActiveTab(newTab);
    activeTabRef.current = newTab;
    if (push) {
      window.history.pushState({ type: 'tab', tab: newTab }, '', '#' + newTab);
    }
  };

  // Check if any modal is currently visible
  const isAnyModalOpen = Boolean(
    showNoticeModal || showWithdrawModal || showWithdrawHistoryModal || 
    showShareModal || showTransactionsModal || showTeamModal || 
    showChangePwdModal || showVideoModal || showLangModal || selectedTutorialImg
  );
  const wasModalOpenRef = React.useRef(false);

  // Automatically manage history entries when any modal opens / closes
  useEffect(() => {
    if (isAnyModalOpen && !wasModalOpenRef.current) {
      window.history.pushState({ type: 'modal', tab: activeTabRef.current }, '', '#' + activeTabRef.current + '-modal');
      wasModalOpenRef.current = true;
    } else if (!isAnyModalOpen && wasModalOpenRef.current) {
      wasModalOpenRef.current = false;
      if (window.history.state && window.history.state.type === 'modal') {
        window.history.back();
      }
    }
  }, [isAnyModalOpen]);

  // Close all open modals helper (used on back button popstate)
  const closeAllOpenModals = () => {
    const m = modalsRef.current;
    let hadModal = false;
    if (m.showNoticeModal) { setShowNoticeModal(false); hadModal = true; }
    if (m.showWithdrawModal) { setShowWithdrawModal(false); hadModal = true; }
    if (m.showWithdrawHistoryModal) { setShowWithdrawHistoryModal(false); hadModal = true; }
    if (m.showShareModal) { setShowShareModal(false); hadModal = true; }
    if (m.showTransactionsModal) { setShowTransactionsModal(false); hadModal = true; }
    if (m.showTeamModal) { setShowTeamModal(false); hadModal = true; }
    if (m.showChangePwdModal) { setShowChangePwdModal(false); hadModal = true; }
    if (m.showVideoModal) { setShowVideoModal(false); hadModal = true; }
    if (m.showLangModal) { setShowLangModal(false); hadModal = true; }
    if (m.selectedTutorialImg) { setSelectedTutorialImg(null); hadModal = true; }
    wasModalOpenRef.current = false;
    return hadModal;
  };

  // Hardware/Gesture Back Button Listener (popstate)
  useEffect(() => {
    if (!token) return;

    // Ensure base history entry
    if (!window.history.state || window.history.state.tab !== activeTabRef.current) {
      window.history.replaceState({ type: 'tab', tab: activeTabRef.current }, '', '#' + activeTabRef.current);
    }

    const handlePopState = () => {
      // 1. If any modal is open: Close that modal and stay on the current tab!
      if (closeAllOpenModals()) {
        return;
      }

      // 2. If no modal is open and user is on ANY sub-tab (e.g. 'my', 'whatsapp', 'tasks', 'checkin', 'admin'):
      // Return smoothly to 'home' tab instead of exiting the site or logging out!
      if (activeTabRef.current !== 'home') {
        setActiveTab('home');
        activeTabRef.current = 'home';
        window.history.replaceState({ type: 'tab', tab: 'home' }, '', '#home');
        return;
      }

      // 3. If already on 'home' tab: Protect against accidental app exit
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2500) {
        // Double press within 2.5s: allow exit
        return;
      } else {
        // Single press: notify user and keep them safely inside the app
        lastBackPressTimeRef.current = now;
        window.history.pushState({ type: 'tab', tab: 'home' }, '', '#home');
        setExitToast(true);
        setTimeout(() => setExitToast(false), 2200);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token]);

  // Fetch User Info (Persistent & Resilient)
  const fetchUserData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // ONLY log out if the server explicitly rejects the token as invalid/expired (HTTP 401 or 403)
      if (res.status === 401 || res.status === 403) {
        console.warn('Session expired (401/403). Logging out.');
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.linkedNumbers) {
          setLinkedNumbers(data.linkedNumbers);
          localStorage.setItem('cached_linked_numbers', JSON.stringify(data.linkedNumbers));
        }
      }
    } catch (err) {
      console.error('fetchUserData error (keeping session active):', err);
      // DO NOT LOG OUT ON NETWORK DISCONNECT OR SERVER COLD START!
    }
  };

  useEffect(() => {
    if (token) fetchUserData();
  }, [token]);

  // Periodic Live Background Sync for WhatsApp List & Balance
  useEffect(() => {
    if (!token) return;
    const syncInterval = setInterval(() => {
      fetchUserData();
    }, 8000);
    return () => clearInterval(syncInterval);
  }, [token, activeTab]);

  // Real-time WhatsApp connection listener (স্বয়ংক্রিয় লাইভ চেকার)
  useEffect(() => {
    let interval = null;
    if (isWaitingConnection && token) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data && data.success) {
            setUser(data.user);
            const onlineList = data.linkedNumbers || [];
            setLinkedNumbers(onlineList);
            
            // Check if user's input phone is now online
            const cleanInput = inputPhone.replace(/^[0+]/, '').trim();
            const matched = onlineList.find(n => 
              String(n.phone_number).trim() === cleanInput ||
              String(n.phone_number).includes(cleanInput)
            );

            if (matched) {
              setIsWaitingConnection(false);
              setConnectionSuccess(true);
              setActivePairingCode('');
              setInputPhone('');
            }
          }
        } catch (e) {}
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingConnection, inputPhone, token]);

  // Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (isRegister && authConfirmPassword && authPassword !== authConfirmPassword) {
      setAuthError(lang === 'bn' ? 'দুইটি পাসওয়ার্ড মেলেনি!' : 'Passwords do not match!');
      setAuthLoading(false);
      return;
    }

    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: String(authPhone).trim(),
          password: authPassword,
          inviteCode: authInviteCode
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error('Non-JSON response:', jsonErr);
      }

      if (data && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveTab('home');
        activeTabRef.current = 'home';
        window.history.replaceState({ type: 'tab', tab: 'home' }, '', '#home');
      } else {
        if (isRegister && data?.code === 'USER_ALREADY_EXISTS') {
          setAuthError(data.msg);
          // Auto switch to Login tab after brief delay so user can login with password
          setTimeout(() => {
            setIsRegister(false);
          }, 2000);
        } else {
          setAuthError(data?.msg || (lang === 'bn' ? 'অনুরোধ ব্যর্থ হয়েছে (ভুল নম্বর বা পাসওয়ার্ড)' : 'Request failed (incorrect credentials)'));
        }
      }
    } catch (err) {
      console.error('Auth fetch error:', err);
      setAuthError(lang === 'bn' ? 'সার্ভারে সংযোগ করা সম্ভব হচ্ছে না' : 'Cannot connect to server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cached_linked_numbers');
    setToken('');
    setUser(null);
    setActiveTab('home');
    activeTabRef.current = 'home';
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Rebind WhatsApp Account Handler
  const handleRebind = (phoneNumber) => {
    let clean = String(phoneNumber).replace(/^\+?880/, '').replace(/^0/, '').trim();
    setInputPhone(clean);
    navigateToTab('whatsapp');
    setActivePairingCode('');
    setIsWaitingConnection(false);
    setConnectionSuccess(false);

    setTimeout(() => {
      const el = document.getElementById('whatsapp-phone-input');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Get 8-Digit Pairing Code
  const handleGetPairingCode = async () => {
    if (!inputPhone) return;
    setPairingLoading(true);
    setActivePairingCode('');

    try {
      const res = await fetch(`${API_BASE}/whatsapp/get-pairing-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber: inputPhone, countryCode: '880' })
      });
      const data = await res.json();
      if (data && data.success) {
        setActivePairingCode((data.pairingCode || '').replace(/[^a-zA-Z0-9]/g, ''));
        setIsWaitingConnection(true);
        setConnectionSuccess(false);
        fetchUserData();
      } else {
        alert(data?.msg || (lang === 'bn' ? 'পেয়ারিং কোড সংগ্রহ করতে সমস্যা হয়েছে' : 'Failed to get pairing code'));
      }
    } catch (err) {
      alert(lang === 'bn' ? 'সার্ভার এরর' : 'Server error');
    } finally {
      setPairingLoading(false);
    }
  };

  // Withdraw Submit
  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawLoading(true);
    setWithdrawMsg('');

    try {
      const res = await fetch(`${API_BASE}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          method: withdrawMethod,
          accountNumber: withdrawAccount
        })
      });
      const data = await res.json();
      setWithdrawMsg(data?.msg || '');
      if (data && data.success) {
        setWithdrawAmount('');
        setWithdrawAccount('');
        fetchUserData();
        setTimeout(() => setShowWithdrawModal(false), 1500);
      }
    } catch (err) {
      setWithdrawMsg(lang === 'bn' ? 'উত্তোলন ব্যর্থ হয়েছে' : 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Admin Data Fetch
  const fetchAdminData = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.success) {
        setAdminStats(data.stats);
        setAdminConfigs(data.configs || {});
        setAdminWithdrawals(data.recentWithdrawals || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'admin') fetchAdminData();
    if ((activeTab === 'tasks' || showTeamModal) && token) {
      fetch(`${API_BASE}/referrals`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d && d.success) {
            setReferrals(d.referrals || []);
            setTeamStats({
              totalCount: d.totalCount || (d.referrals ? d.referrals.length : 0),
              totalTeamEarnings: d.totalTeamEarnings || 0
            });
          }
        })
        .catch(err => console.error('Referrals fetch error:', err));
    }
  }, [activeTab, showTeamModal, token]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d && d.success) {
        setTransactions(d.transactions || []);
      }
    } catch (e) {
      console.error('Fetch transactions error:', e);
    }
  };

  const fetchWithdrawHistory = async () => {
    if (!token) return;
    setWithdrawHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/withdraw/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d && d.success) {
        setWithdrawHistory(d.history || []);
      }
    } catch (e) {
      console.error('Fetch withdraw history error:', e);
    } finally {
      setWithdrawHistoryLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------------------
  // 1. AUTH SCREEN (১০০% আসল স্ক্রিনশট ৩ ও ৪ এর ডিজাইন অনুযায়ী)
  // -------------------------------------------------------------------------
  // If user has token but user profile is loading:
  if (token && !user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '38px', height: '38px', border: '3px solid #e2e8f0',
          borderTop: '3px solid #00c675', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          {lang === 'bn' ? 'অ্যাকাউন্ট লোড হচ্ছে...' : 'Loading account...'}
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Only render login / register screen when genuinely logged out:
  if (!token) {
    return (
      <div style={{
        padding: '20px 20px 30px', display: 'flex', flexDirection: 'column',
        minHeight: '100vh', background: '#f8fafc',
        width: '100%', maxWidth: '440px', margin: '0 auto', position: 'relative'
      }}>
        {/* Top Header with Language Switcher Pill (একদম পেজের উপরে ডানপাশে ফিক্সড) */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          width: '100%', padding: '4px 0 20px'
        }}>
          <div 
            onClick={() => {
              setSelectedLangTemp(lang);
              setShowLangModal(true);
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px',
              color: '#334155', background: '#ffffff', padding: '6px 14px', borderRadius: '20px',
              cursor: 'pointer', userSelect: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0', fontWeight: '500'
            }}
          >
            <Globe size={15} color="#475569" />
            <span>{lang === 'bn' ? 'বাংলা' : 'English'}</span>
            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '2px' }}>▼</span>
          </div>
        </div>

        {/* Centered Auth Card Container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Brand Logo & Headings */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/brand/earnpulse-logo.png"
            alt="EarnPulse"
            style={{
              width: '74px', height: '74px', borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(21, 128, 61, 0.25)', marginBottom: '14px',
              objectFit: 'cover', display: 'inline-block'
            }}
          />

          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.2 }}>
            {isRegister
              ? (lang === 'bn' ? 'EarnPulse-এ যোগ দিন' : 'Join EarnPulse')
              : (lang === 'bn' ? 'EarnPulse-এ স্বাগতম' : 'Welcome to EarnPulse')}
          </h1>

          <p style={{ color: '#475569', fontSize: '13px', marginTop: '6px', lineHeight: 1.4 }}>
            {isRegister
              ? (lang === 'bn' ? 'WhatsApp সংযুক্ত করতে ও পুরস্কার পেতে একটি অ্যাকাউন্ট তৈরি করুন' : 'Create an account to connect WhatsApp and earn cash rewards')
              : (lang === 'bn' ? 'পেয়ারিং কোড দিয়ে WhatsApp সংযুক্ত করুন এবং প্রতিদিনের পুরস্কার দেখুন' : 'Connect WhatsApp with pairing code and explore daily rewards')}
          </p>

          {isRegister && (
            <div style={{ marginTop: '12px' }}>
              <span style={{
                fontSize: '12px', color: '#15803d', background: '#dcfce7',
                padding: '4px 14px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-block'
              }}>
                {lang === 'bn' ? 'পেয়ারিং কোড দিয়ে সংযোগ' : 'Connect with Pairing Code'}
              </span>
            </div>
          )}
        </div>

        {/* White Card Box with Blue Pill Tab Switcher */}
        <div style={{
          background: '#ffffff', borderRadius: '24px', padding: '24px 20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9'
        }}>
          {/* Rounded Pill Tabs (লগইন / অ্যাকাউন্ট তৈরি করুন) */}
          <div style={{
            display: 'flex', background: '#eff6ff', borderRadius: '14px',
            padding: '4px', marginBottom: '20px'
          }}>
            <button
              onClick={() => setIsRegister(false)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: '10px',
                fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                background: !isRegister ? '#ffffff' : 'transparent',
                color: !isRegister ? '#15803d' : '#64748b',
                boxShadow: !isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {lang === 'bn' ? 'লগইন' : 'Login'}
            </button>
            <button
              onClick={() => setIsRegister(true)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: '10px',
                fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                background: isRegister ? '#ffffff' : 'transparent',
                color: isRegister ? '#15803d' : '#64748b',
                boxShadow: isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Register'}
            </button>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field 1: Phone number with +880 */}
            <div style={{
              display: 'flex', alignItems: 'center', background: '#f8fafc',
              borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0 14px', height: '48px'
            }}>
              <span style={{ color: '#15803d', fontSize: '16px', marginRight: '8px' }}>📱</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', paddingRight: '10px', borderRight: '1px solid #cbd5e1' }}>
                +880
              </span>
              <input
                type="text"
                placeholder={lang === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
                value={authPhone}
                onChange={(e) => setAuthPhone(e.target.value)}
                required
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  paddingLeft: '10px', fontSize: '14px', color: '#0f172a'
                }}
              />
            </div>

            {/* Field 2: Password with Eye Toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', background: '#f8fafc',
              borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0 14px', height: '48px'
            }}>
              <span style={{ color: '#15803d', fontSize: '16px', marginRight: '10px' }}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={lang === 'bn' ? 'লগইন পাসওয়ার্ড' : 'Login Password'}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '14px', color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', color: '#94a3b8'
                }}
              >
                {showPassword ? <Eye size={18} color="#15803d" /> : <EyeOff size={18} color="#94a3b8" />}
              </button>
            </div>

            {/* Register extra fields */}
            {isRegister && (
              <>
                {/* Field 3: Confirm Password with Eye Toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: '#f8fafc',
                  borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0 14px', height: '48px'
                }}>
                  <span style={{ color: '#15803d', fontSize: '16px', marginRight: '10px' }}>🔒</span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={lang === 'bn' ? 'লগইন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Login Password'}
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    required
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      fontSize: '14px', color: '#0f172a'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px', display: 'flex', alignItems: 'center', color: '#94a3b8'
                    }}
                  >
                    {showConfirmPassword ? <Eye size={18} color="#15803d" /> : <EyeOff size={18} color="#94a3b8" />}
                  </button>
                </div>

                {/* Field 4: Invite Code (Auto-populated from URL) */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: '#f8fafc',
                  borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0 14px', height: '48px'
                }}>
                  <span style={{ color: '#15803d', fontSize: '16px', marginRight: '10px' }}>✉️</span>
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'আমন্ত্রণ কোড (যেমন: H5DRTN)' : 'Invitation Code (e.g. H5DRTN)'}
                    value={authInviteCode}
                    onChange={(e) => setAuthInviteCode(e.target.value)}
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      fontSize: '14px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '1px'
                    }}
                  />
                </div>
              </>
            )}

            {/* Login Extra Options (পাসওয়ার্ড মনে রাখুন & পাসওয়ার্ড ভুলে গেছেন) */}
            {!isRegister && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', margin: '2px 0 6px' }}>
                <label 
                  onClick={() => setRememberPassword(!rememberPassword)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ color: rememberPassword ? '#15803d' : '#94a3b8', fontSize: '16px' }}>
                    {rememberPassword ? '☑' : '☐'}
                  </span>
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড মনে রাখুন' : 'Remember Password'}</span>
                </label>

                <span 
                  onClick={() => alert(lang === 'bn' ? 'পাসওয়ার্ড রিসেট করতে অনলাইন সাপোর্টে যোগাযোগ করুন' : 'Contact support to reset password')}
                  style={{ color: '#15803d', fontWeight: '500', cursor: 'pointer' }}
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন' : 'Forgot Password'}
                </span>
              </div>
            )}

            {authError && (
              <div style={{ fontSize: '12px', color: '#dc2626', background: '#fee2e2', padding: '10px 12px', borderRadius: '10px', textAlign: 'center' }}>
                {authError}
              </div>
            )}

            {/* Big Green Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="action-btn-green"
              style={{
                width: '100%', height: '48px', borderRadius: '24px',
                fontSize: '16px', fontWeight: 'bold', marginTop: '6px',
                background: 'linear-gradient(145deg, #166534 0%, #15803d 100%)',
                boxShadow: '0 4px 15px rgba(21, 128, 61, 0.3)'
              }}
            >
              {authLoading 
                ? (lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...') 
                : (isRegister 
                  ? (lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Register Now') 
                  : (lang === 'bn' ? 'লগইন' : 'Login'))
              }
            </button>
          </form>
        </div>
        </div>

        {/* Language Selection Modal (লগইন ও রেজিস্ট্রেশন পেজের জন্য) */}
        {showLangModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '24px', padding: '24px 20px',
              width: '100%', maxWidth: '340px', textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>
                {t.selectLanguage}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div
                  onClick={() => setSelectedLangTemp('bn')}
                  style={{
                    padding: '16px 10px', borderRadius: '14px', cursor: 'pointer',
                    border: selectedLangTemp === 'bn' ? '2px solid #15803d' : '1px solid #e2e8f0',
                    background: selectedLangTemp === 'bn' ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>বাংলা</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>বাংলা</div>
                </div>

                <div
                  onClick={() => setSelectedLangTemp('en')}
                  style={{
                    padding: '16px 10px', borderRadius: '14px', cursor: 'pointer',
                    border: selectedLangTemp === 'en' ? '2px solid #15803d' : '1px solid #e2e8f0',
                    background: selectedLangTemp === 'en' ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>English</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>English</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowLangModal(false)}
                  style={{
                    flex: 1, height: '44px', borderRadius: '12px', background: '#f1f5f9',
                    border: 'none', color: '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    setLang(selectedLangTemp);
                    localStorage.setItem('lang', selectedLangTemp);
                    setShowLangModal(false);
                  }}
                  style={{
                    flex: 1, height: '44px', borderRadius: '12px', background: '#15803d',
                    border: 'none', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
                  }}
                >
                  {t.confirm}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. MAIN APP CONTAINER
  // -------------------------------------------------------------------------
  return (
    <div className="mobile-shell">
      {/* 1. TOP HEADER (EP Logo, Username, Language Switcher, App Pill) */}
      <div style={{
        background: '#ffffff', padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/brand/earnpulse-logo.png"
            alt="EarnPulse"
            style={{
              width: '42px', height: '42px', borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(14, 112, 51, 0.25)', objectFit: 'cover'
            }}
          />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>
              EarnPulse
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', fontWeight: '500' }}>
              {user?.username?.includes('@')
                ? user.username.split('@')[0]
                : (user?.username?.startsWith('88') ? user.username : (user?.username?.startsWith('01') ? `88${user.username}` : (user?.username || 'User')))
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            onClick={() => {
              setSelectedLangTemp(lang);
              setShowLangModal(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
              color: '#374151', background: '#f3f4f6', padding: '6px 10px', borderRadius: '20px',
              cursor: 'pointer', userSelect: 'none'
            }}
          >
            <Globe size={14} color="#4b5563" />
            <span>{lang === 'bn' ? 'বাংলা' : 'English'}</span>
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
          </div>

          <button
            onClick={() => alert(lang === 'bn' ? 'APP খুব শীঘ্রই উন্মুক্ত করা হবে' : 'APP download opening soon')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
              color: '#0e7033', background: '#e8f5e9', border: 'none',
              padding: '6px 12px', borderRadius: '20px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            <Download size={13} strokeWidth={2.5} /> APP
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT (Per Tab) */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* ------------------------------------------------------------- */}
        {/* TAB 1: HOME PAGE                                              */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'home' && (
          <>
            {/* Compact Dashboard Balance Strip */}
            <div className="green-banner-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      👑 VIP {t.availableBalance}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '26px', fontWeight: '900', margin: '2px 0 0', letterSpacing: '-0.3px',
                    background: 'linear-gradient(180deg, #ffffff 30%, #e2e8f0 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}>
                    ৳{(user?.balance || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#e2e8f0' }}>
                  <div>{t.totalEarned} &nbsp;<span style={{ fontWeight: 'bold', color: '#fbbf24' }}>৳{(user?.totalEarned || 0).toFixed(2)}</span></div>
                  <div style={{ marginTop: '2px' }}>{t.totalWithdrawn} &nbsp;<span style={{ fontWeight: 'bold', color: '#94a3b8' }}>৳{(user?.totalWithdrawn || 0).toFixed(2)}</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', position: 'relative', zIndex: 1 }}>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  style={{
                    flex: 1, height: '36px', borderRadius: '18px',
                    background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    color: '#0f172a', fontWeight: '800', border: '1px solid rgba(255,255,255,0.6)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35), inset 0 1px 1px rgba(255,255,255,0.7)',
                    textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TrendingUp size={14} color="#0f172a" strokeWidth={3} /> {t.withdraw}
                </button>
                <button
                  onClick={() => {
                    fetchTransactions();
                    setShowTransactionsModal(true);
                  }}
                  style={{
                    flex: 1, height: '36px', borderRadius: '18px',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    color: '#ffffff', fontWeight: 'bold',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  <span style={{ fontSize: '13px' }}>📋</span> {t.rewardDetails}
                </button>
              </div>
            </div>

            {/* Official Promotional Banner */}
            <div style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <img
                src="/brand/earnpulse-banner.webp"
                alt="EarnPulse Official Banner"
                style={{ width: '100%', display: 'block', height: 'auto', minHeight: '125px', objectFit: 'cover' }}
              />
            </div>

            {/* Live Random Withdraw Ticker */}
            <div style={{
              background: '#ffffff', borderRadius: '14px', padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <TrendingUp size={15} color="#15803d" />
                </div>
                <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{tickerNotification.user}</span> {lang === 'bn' ? 'সফলভাবে উত্তোলন করেছেন' : 'successfully withdrew'}
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#15803d', flexShrink: 0, paddingLeft: '8px' }}>
                ৳ {tickerNotification.amount}
              </div>
            </div>

            {/* Available Tasks Header & List */}
            <div className="app-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '14px' }}>
                {t.availableTasks}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Task 1: Connect WhatsApp */}
                <div 
                  onClick={() => navigateToTab('whatsapp')}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                  <img
                    src="/images/tasks/connect.webp"
                    alt="WhatsApp"
                    style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{t.connectWhatsapp}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.connectWhatsappDesc}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', marginTop: '3px' }}>৳ 50.00</div>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                {/* Task 2: Invite Friends */}
                <div 
                  onClick={() => navigateToTab('tasks')}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                  <img
                    src="/images/tasks/invite.webp"
                    alt="Invite"
                    style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{t.inviteTask}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.inviteTaskDesc}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', marginTop: '3px' }}>৳ 100.00</div>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                {/* Task 3: 24h Online Task */}
                <div 
                  onClick={() => navigateToTab('whatsapp')}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                  <img
                    src="/images/tasks/online.webp"
                    alt="Online 24h"
                    style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{t.online24h}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.online24hDesc}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', marginTop: '3px' }}>৳ 40.00</div>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>
              </div>
            </div>

            {/* Daily Check-In Widget */}
            <div className="app-card" onClick={() => navigateToTab('checkin')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  <span>📅</span>
                  <span>{t.dailyCheckIn}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>{t.viewProgress}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} style={{
                    padding: '8px 2px', borderRadius: '10px',
                    background: day === 7 ? '#fef3c7' : '#f1f5f9',
                    border: day === 7 ? '1px solid #fde68a' : '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.day} {day}</div>
                    <div style={{ fontSize: '11px', margin: '2px 0', color: day === 7 ? '#d97706' : '#94a3b8' }}>◇</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: day === 7 ? '#d97706' : '#64748b' }}>
                      {day === 7 ? t.bonus : '৳10.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Bottom Promotional Feature Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Card 1 */}
              <div 
                onClick={() => navigateToTab('whatsapp')}
                style={{
                  position: 'relative', borderRadius: '18px', overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)', cursor: 'pointer',
                  minHeight: '140px', background: '#f8fafc'
                }}
              >
                <img
                  src="/brand/earnbondhu-advantage.webp"
                  alt=""
                  style={{ width: '100%', display: 'block', minHeight: '140px', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '65%',
                  padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ width: '28px', height: '3.5px', background: '#15803d', borderRadius: '2px', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px', lineHeight: 1.2 }}>
                    {lang === 'bn' ? 'আয়ের সুবিধা' : 'Platform Advantage'}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#334155', lineHeight: 1.5, margin: 0, fontWeight: '500' }}>
                    {lang === 'bn' ? 'আয়ের উপায় দেখুন, অগ্রগতি অনুসরণ করুন এবং এক জায়গায় পুরস্কার পরিচালনা করুন।' : 'Explore ways to earn, track your progress and manage rewards in one place.'}
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div 
                onClick={() => navigateToTab('tasks')}
                style={{
                  position: 'relative', borderRadius: '18px', overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)', cursor: 'pointer',
                  minHeight: '140px', background: '#f8fafc'
                }}
              >
                <img
                  src="/brand/earnbondhu-invite.webp"
                  alt=""
                  style={{ width: '100%', display: 'block', minHeight: '140px', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '65%',
                  padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ width: '28px', height: '3.5px', background: '#15803d', borderRadius: '2px', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px', lineHeight: 1.2 }}>
                    {lang === 'bn' ? 'আমন্ত্রণের কাজ' : 'Invite Tasks'}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#334155', lineHeight: 1.5, margin: 0, fontWeight: '500' }}>
                    {lang === 'bn' ? 'বন্ধুদের আমন্ত্রণ জানান, দল গড়ে তুলুন এবং অতিরিক্ত কমিশন পান।' : 'Invite friends, build your team and earn extra commission on every step.'}
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div 
                onClick={() => navigateToTab('whatsapp')}
                style={{
                  position: 'relative', borderRadius: '18px', overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)', cursor: 'pointer',
                  minHeight: '140px', background: '#f8fafc'
                }}
              >
                <img
                  src="/brand/earnbondhu-connect.webp"
                  alt=""
                  style={{ width: '100%', display: 'block', minHeight: '140px', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '65%',
                  padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ width: '28px', height: '3.5px', background: '#15803d', borderRadius: '2px', marginBottom: '8px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px', lineHeight: 1.2 }}>
                    {lang === 'bn' ? 'WhatsApp সক্রিয় করুন' : 'Activate WhatsApp'}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#334155', lineHeight: 1.5, margin: 0, fontWeight: '500' }}>
                    {lang === 'bn' ? 'কাজ পেতে WhatsApp সংযুক্ত করুন এবং সক্রিয় থাকুন।' : 'Connect WhatsApp to unlock tasks and keep your activity moving.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: TASKS & INVITATION (আমন্ত্রণ ও টিম কমিশন)                */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'tasks' && (
          <>
            {/* 1. Invitation Steps (ধাপ ১ - ৪) */}
            <div className="app-card">
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '14px' }}>
                {t.shareLinkTitle}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
                {[
                  { step: lang === 'bn' ? 'ধাপ ১' : 'Step 1', title: t.step1, icon: '🔗' },
                  { step: lang === 'bn' ? 'ধাপ ২' : 'Step 2', title: t.step2, icon: '👤' },
                  { step: lang === 'bn' ? 'ধাপ ৩' : 'Step 3', title: t.step3, icon: '💬' },
                  { step: lang === 'bn' ? 'ধাপ ৪' : 'Step 4', title: t.step4, icon: '🎁' }
                ].map((s, idx) => (
                  <div key={idx} style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.step}</div>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', background: '#dcfce7',
                      color: '#15803d', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', margin: '6px 0', fontSize: '16px'
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Invitation Earnings Box (আমন্ত্রণ থেকে আয়) */}
            <div className="app-card">
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '10px' }}>
                {t.inviteEarning}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t.currentReward}</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#15803d' }}>৳100.00</div>
                </div>
                <div style={{
                  background: '#f1f5f9', padding: '6px 14px', borderRadius: '20px',
                  fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <Users size={14} />
                  <span>{referrals.length} {t.users}</span>
                </div>
              </div>

              {/* 4 Tier Targets Grid (হুবহু টার্গেট আসল স্ক্রিনশট অনুযায়ী) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                {[
                  { users: 10, reward: '1050', label: '01', img: '/images/invitation/gold_tier_1.png', active: true },
                  { users: 30, reward: '3350', label: '02', img: '/images/invitation/gold_tier_2.png', active: false },
                  { users: 50, reward: '6150', label: '03', img: '/images/invitation/gold_tier_3.png', active: false },
                  { users: 100, reward: '12350', label: '04', img: '/images/invitation/gold_tier_4.png', active: false }
                ].map((tier, idx) => (
                  <div key={idx} style={{
                    padding: '12px 2px 10px', borderRadius: '16px',
                    background: tier.active ? '#eaf3ed' : '#f7f9fa',
                    border: tier.active ? '1.5px solid #22c55e' : '1px solid #edf2f7',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>
                      {tier.users}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', lineHeight: 1.2 }}>
                      {t.users}
                    </div>

                    {/* Authentic 3D Gold Ingot Stack Graphic */}
                    <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
                      <img
                        src={tier.img}
                        alt="Gold Bars"
                        style={{ maxWidth: '100%', maxHeight: '42px', objectFit: 'contain' }}
                      />
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
                      ৳{tier.reward}
                    </div>

                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: tier.active ? '#15803d' : '#ffffff',
                      color: tier.active ? '#ffffff' : '#64748b',
                      border: tier.active ? 'none' : '1px solid #e2e8f0',
                      fontSize: '11px', fontWeight: 'bold', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      {tier.label}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                {t.inviteTenGetReward}
              </div>

              {/* Big Green Invite Button - Opens Official Share Modal */}
              <button
                onClick={() => setShowShareModal(true)}
                className="action-btn-green"
                style={{ width: '100%', fontSize: '15px', padding: '14px', fontWeight: 'bold' }}
              >
                {t.inviteNowBtn}
              </button>
            </div>

            {/* 3. Total Commission Dashboard - Luxury 3D Obsidian & Royal Emerald Gold */}
            <div style={{
              background: 'linear-gradient(135deg, #061e14 0%, #0c3323 35%, #08291c 70%, #03140d 100%)',
              borderRadius: '22px', padding: '20px 20px 18px', color: '#fff',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 16px 36px -6px rgba(6, 30, 20, 0.6), inset 0 1px 2px rgba(251, 191, 36, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(251, 191, 36, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    👑 {t.totalCommission}
                  </div>
                  <div style={{
                    fontSize: '28px', fontWeight: '900', marginTop: '2px', letterSpacing: '-0.5px',
                    background: 'linear-gradient(180deg, #ffffff 30%, #e2e8f0 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    ৳ 0.00
                  </div>
                </div>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef08a 0%, #eab308 30%, #ca8a04 70%, #854d0e 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(202, 138, 4, 0.5), inset 0 2px 2px rgba(255,255,255,0.8), inset 0 -2px 3px rgba(0,0,0,0.3)',
                  border: '1.5px solid #fef08a',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    border: '1px dashed rgba(255, 255, 255, 0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'radial-gradient(circle, #fde047 20%, #eab308 60%, #a16207 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)'
                  }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '900', color: '#78350f',
                      letterSpacing: '-0.5px', textShadow: '0 1px 0 rgba(254, 240, 138, 0.8)'
                    }}>
                      RS
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Stats Grid in White Box */}
              <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '14px',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', color: '#0f172a',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                position: 'relative', zIndex: 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} color="#15803d" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.totalInvites}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{referrals.length}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} color="#15803d" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.todayInvites}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>0</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.todayCommission}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>0.00</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.yesterdayCommission}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>0.00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Official 2-Tier Infographic */}
            <div className="app-card" style={{ padding: '16px', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>
                  {lang === 'bn' ? '১ম স্তর সরাসরি রেফারেল' : '1st Level Direct Referral'}
                </h3>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d', margin: '2px 0 10px' }}>
                  {lang === 'bn' ? 'পাবেন ' : 'Get '}<span style={{ color: '#16a34a' }}>15%</span>{lang === 'bn' ? ' কমিশন পুরস্কার' : ' Commission Reward'}
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                  {lang === 'bn' ? '২য় স্তর রেফারেল' : '2nd Level Direct Referral'}
                </h4>
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#15803d', marginTop: '2px' }}>
                  {lang === 'bn' ? 'পাবেন ' : 'Get '}<span style={{ color: '#16a34a' }}>5%</span>{lang === 'bn' ? ' কমিশন পুরস্কার' : ' Commission Reward'}
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <img
                  src="/images/invitation/Share.webp"
                  alt="Referral Tier Structure"
                  style={{ width: '100%', maxWidth: '340px', display: 'inline-block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 5. Rules & Commission Explanation */}
            <div className="app-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '10px' }}>
                {lang === 'bn' ? 'ব্যবহারের নিয়ম' : 'Usage Rules'}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8, marginBottom: '20px' }}>
                {lang === 'bn' ? (
                  <>
                    ১. আমন্ত্রণের লিংক পেতে "কপি করুন"-এ চাপুন<br/>
                    ২. বন্ধুদের লিংক পাঠান এবং সেই লিংক দিয়ে নিবন্ধন করতে বলুন<br/>
                    ৩. বন্ধু অ্যাকাউন্ট সক্রিয় করে শর্ত পূরণ করলে আপনি পুরস্কার পাবেন
                  </>
                ) : (
                  <>
                    1. Tap "Copy" to obtain your exclusive invitation link.<br/>
                    2. Send it to friends and invite them to register.<br/>
                    3. Receive your reward once your friends activate their accounts.
                  </>
                )}
              </div>

              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '10px' }}>
                {lang === 'bn' ? 'পুরস্কারের নিয়ম' : 'Reward Rules'}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8, marginBottom: '20px' }}>
                {lang === 'bn' ? (
                  <>
                    • বন্ধু সক্রিয় হলে একবার ৳100 পুরস্কার পাবেন<br/>
                    • কার্যক্রম শেষে স্বয়ংক্রিয়ভাবে পুরস্কার দেওয়া হবে
                  </>
                ) : (
                  <>
                    • Earn a one-time ৳100 reward when your friend connects WhatsApp.<br/>
                    • Earnings are automatically credited to your balance.
                  </>
                )}
              </div>

              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>
                {lang === 'bn' ? 'আপনার কমিশনের নিয়ম:' : 'Commission Rules:'}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span>💰</span> {lang === 'bn' ? 'স্তর ১ — আপনি পাবেন ১৫%' : 'Tier 1 — You Earn 15%'}
                </div>
                {lang === 'bn' ? '• আপনার লিংক দিয়ে নিবন্ধন করলে তিনি আপনার সরাসরি সদস্য হন এবং আয়ের ১৫% আপনি পাবেন।' : '• Direct referrals who join via your link earn you an extra 15% on their earnings.'}<br/>

                <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                  <span>💰</span> {lang === 'bn' ? 'স্তর ২ — আপনি পাবেন ৫%' : 'Tier 2 — You Earn 5%'}
                </div>
                {lang === 'bn' ? '• আপনার স্তর ১ সদস্যের আমন্ত্রিত বন্ধুরা স্তর ২-এ যুক্ত হন এবং আপনি ৫% পাবেন।' : '• Sub-referrals invited by your direct members grant you an extra 5%.'}<br/>

                <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                  <span>📊</span> {lang === 'bn' ? 'সহজ উদাহরণ' : 'Simple Example'}
                </div>
                {lang === 'bn' ? (
                  <>
                    • স্তর ১-এর সদস্য ৳১০০০ আয় করলে আপনি ৳১৫০ পাবেন।<br/>
                    • স্তর ২-এর সদস্য ৳১০০০ আয় করলে আপনি ৳৫০ পাবেন।
                  </>
                ) : (
                  <>
                    • Tier 1 member earns ৳1000 → You receive ৳150.<br/>
                    • Tier 2 member earns ৳1000 → You receive ৳50.
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: WHATSAPP PAIRING PAGE                                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'whatsapp' && (
          <>
            <div className="app-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={20} color="#15803d" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{t.whatsappConnect}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t.whatsappConnectSub}</div>
                </div>
              </div>

              {/* Video Tutorial 3D Luxury Pill */}
              <button
                onClick={() => setShowVideoModal(true)}
                style={{
                  width: '100%', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #061e14 0%, #0c3323 50%, #08291c 100%)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  color: '#fbbf24', fontSize: '13px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(6, 30, 20, 0.4), inset 0 1px 1px rgba(251, 191, 36, 0.4), inset 0 -2px 2px rgba(0,0,0,0.3)',
                  letterSpacing: '0.3px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)'
                }}>
                  <Play size={10} fill="#0f172a" color="#0f172a" style={{ marginLeft: '1px' }} />
                </div>
                <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {t.videoHelp}
                </span>
              </button>
            </div>

            {/* Step-by-Step 3 Cards */}
            <div className="app-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{t.pairingSteps}</span>
                <span style={{ fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {t.noQrNeeded}
                </span>
              </div>

              {/* 3 Step Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                {[
                  { step: '1', title: t.step1Pair },
                  { step: '2', title: t.step2Pair },
                  { step: '3', title: t.step3Pair }
                ].map((s, idx) => (
                  <div key={idx} style={{
                    padding: '12px 6px', borderRadius: '12px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: '#15803d',
                      color: '#fff', fontSize: '12px', fontWeight: 'bold', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', marginBottom: '6px'
                    }}>
                      {s.step}
                    </div>
                    <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500', lineHeight: 1.3 }}>
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily WhatsApp Reward Widget - Luxury 3D Obsidian & Royal Emerald Gold */}
            <div style={{
              background: 'linear-gradient(135deg, #061e14 0%, #0c3323 35%, #08291c 70%, #03140d 100%)',
              borderRadius: '22px', padding: '18px 20px', color: '#ffffff',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 16px 36px -6px rgba(6, 30, 20, 0.6), inset 0 1px 2px rgba(251, 191, 36, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(251, 191, 36, 0.3)'
            }}>
              <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                🟢 {t.onlineReward}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{t.todayPoints}</div>
                  <div style={{
                    fontSize: '26px', fontWeight: '900', marginTop: '2px', letterSpacing: '-0.5px',
                    background: 'linear-gradient(180deg, #ffffff 30%, #e2e8f0 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    ৳ 0.00
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{t.yesterdayPoints}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>
                    ৳ 0.00
                  </div>
                </div>
              </div>
            </div>

            {/* Pairing Code Box */}
            <div className="app-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                {t.connectWaBox}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                {t.connectWaTip}
              </div>

              {/* Step 1: Input WhatsApp Number */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  {t.step1Phone}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    padding: '10px 12px', background: '#f1f5f9', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center'
                  }}>
                    +880
                  </div>
                  <input
                    id="whatsapp-phone-input"
                    type="tel"
                    placeholder="17XXXXXXXX"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={10}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={handleGetPairingCode}
                  disabled={pairingLoading || !inputPhone}
                  className="action-btn-green"
                  style={{ width: '100%', marginTop: '10px', fontSize: '14px' }}
                >
                  {pairingLoading ? (lang === 'bn' ? 'কোড প্রস্তুত হচ্ছে...' : 'Generating Code...') : t.getCodeBtn}
                </button>
              </div>

              {/* Step 2: 8-Box Verification Code Display */}
              <div style={{ marginBottom: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                  {t.step2Verify}
                </div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} style={{
                      width: '34px', height: '42px', borderRadius: '6px', border: '1.5px solid #cbd5e1',
                      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 'bold', color: '#15803d', fontFamily: 'monospace'
                    }}>
                      {activePairingCode[idx] || ''}
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#94a3b8' }}>-</div>
                  {[4, 5, 6, 7].map((idx) => (
                    <div key={idx} style={{
                      width: '34px', height: '42px', borderRadius: '6px', border: '1.5px solid #cbd5e1',
                      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 'bold', color: '#15803d', fontFamily: 'monospace'
                    }}>
                      {activePairingCode[idx] || ''}
                    </div>
                  ))}
                </div>

                {activePairingCode && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                      onClick={() => copyToClipboard(activePairingCode)}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', background: '#15803d',
                        color: '#fff', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer'
                      }}
                    >
                      <Copy size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {copied ? t.copied : t.copyCodeBtn}
                    </button>
                  </div>
                )}

                {/* Live Waiting Animation Indicator */}
                {isWaitingConnection && (
                  <div style={{
                    marginTop: '14px', padding: '12px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                    border: '1px solid #fde047', display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    <RefreshCw size={18} color="#d97706" style={{ animation: 'spin 2s linear infinite' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#92400e' }}>
                        {lang === 'bn' ? 'সংযোগের জন্য অপেক্ষা করা হচ্ছে...' : 'Waiting for connection...'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#b45309', marginTop: '1px' }}>
                        {lang === 'bn' ? 'WhatsApp-এ কোডটি প্রবেশ করালেই স্বয়ংক্রিয়ভাবে সংযুক্ত হবে।' : 'Enter the code in WhatsApp to connect automatically.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Connection Success Banner */}
                {connectionSuccess && (
                  <div style={{
                    marginTop: '14px', padding: '14px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                    border: '1.5px solid #22c55e', display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)', animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: '#15803d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
                    }}>
                      <CheckCircle2 size={20} color="#ffffff" />
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                        {lang === 'bn' ? '🎉 সফলভাবে সংযুক্ত হয়েছে!' : '🎉 Connected Successfully!'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px', fontWeight: '500' }}>
                        {lang === 'bn' ? 'আপনার WhatsApp সফলভাবে চালু হয়েছে এবং আয় শুরু হয়েছে।' : 'Your WhatsApp is active now and earning started!'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Instructions & 5 Screenshots (Exact EarnBondhu Match) */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <MessageCircle size={13} color="#15803d" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    {lang === 'bn' ? 'ধাপ ৩: WhatsApp ওপেন করে কোডটি দিন এবং ফিরে আসুন' : 'Step 3: Open WhatsApp, enter the code, and return'}
                  </div>
                </div>

                {/* 5 Phone Screenshots Grid matching EarnBondhu */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px'
                }}>
                  {[
                    { src: '/images/tutorial/step1.png', num: 1 },
                    { src: '/images/tutorial/step2.png', num: 2 },
                    { src: '/images/tutorial/step3.png', num: 3 },
                    { src: '/images/tutorial/step4.png', num: 4 },
                    { src: '/images/tutorial/step5.png', num: 5 }
                  ].map((img, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedTutorialImg(img.src)}
                      style={{ 
                        cursor: 'pointer',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#000',
                        aspectRatio: '9/19',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.15s ease'
                      }}
                      title={lang === 'bn' ? `ধাপ ${img.num} বড় করে দেখতে চাপুন` : `Tap to view Step ${img.num}`}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img 
                        src={img.src} 
                        alt={`Step ${img.num}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Connected Numbers List (Exact EarnBondhu Match) */}
            <div className="app-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#064e3b', marginBottom: '14px' }}>
                WhatsApp List
              </div>

              {linkedNumbers.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '30px 10px', textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px'
                  }}>
                    <MessageCircle size={32} color="#94a3b8" />
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                    {t.addNewWa}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {linkedNumbers.map((n, idx) => {
                    const isOnline = n.status === 'online';
                    return (
                      <div key={n.id || idx} style={{
                        padding: '14px 0',
                        borderBottom: idx === linkedNumbers.length - 1 ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        {/* Left: WhatsApp Logo + Number + Online/OFFLINE */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isOnline ? '#22c55e' : '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isOnline ? '0 2px 8px rgba(34, 197, 94, 0.25)' : 'none'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: isOnline ? '#0f172a' : '#64748b',
                              letterSpacing: '0.2px'
                            }}>
                              +{n.country_code || '880'} {n.phone_number}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '4px'
                            }}>
                              <div style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: isOnline ? '#16a34a' : '#94a3b8'
                              }} />
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: isOnline ? '#16a34a' : '#94a3b8'
                              }}>
                                {isOnline ? 'Online' : 'OFFLINE'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Black Box 24h Countdown Timer + Rebind Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <WhatsAppCountdownTimer
                            loginDate={n.login_date}
                            createTime={n.create_time}
                            status={n.status}
                          />

                          {!isOnline && (
                            <button
                              onClick={() => handleRebind(n.phone_number)}
                              style={{
                                background: '#0b7c3e',
                                color: '#ffec8b',
                                border: 'none',
                                padding: '4px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                letterSpacing: '0.3px',
                                boxShadow: '0 2px 6px rgba(11, 124, 62, 0.3)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Rebind
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MY PROFILE                                             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'my' && (
          <>
            {/* Compact Dashboard Balance Strip */}
            <div className="green-banner-card">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  👑 VIP {t.accountBalance}
                </span>
                <div style={{
                  fontSize: '26px', fontWeight: '900', margin: '2px 0', letterSpacing: '-0.3px',
                  background: 'linear-gradient(180deg, #ffffff 30%, #e2e8f0 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}>
                  ৳{(user?.balance || 0).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', position: 'relative', zIndex: 1 }}>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  style={{
                    flex: 1, height: '36px', borderRadius: '12px',
                    background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    color: '#0f172a', fontWeight: '800', border: '1px solid rgba(255,255,255,0.6)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35), inset 0 1px 1px rgba(255,255,255,0.7)',
                    textShadow: '0 1px 0 rgba(255,255,255,0.4)'
                  }}
                >
                  <TrendingUp size={14} color="#0f172a" strokeWidth={3} /> {t.withdraw}
                </button>
                <button
                  onClick={() => {
                    fetchWithdrawHistory();
                    setShowWithdrawHistoryModal(true);
                  }}
                  style={{
                    flex: 1, height: '36px', borderRadius: '12px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
                    color: '#ffffff', fontWeight: 'bold',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  {t.history}
                </button>
              </div>
            </div>

            {/* Invite Code Box */}
            <div className="app-card">
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                {t.inviteAndEarn}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                {t.inviteAndEarnSub}
              </div>

              <div style={{
                background: '#f8fafc', padding: '12px 14px', borderRadius: '10px',
                border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{t.inviteCodeLabel}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '1px' }}>
                    {user?.inviteCode || ''}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(user?.inviteCode || '')}
                  style={{
                    padding: '9px 20px', borderRadius: '12px',
                    background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    color: '#0f172a', fontSize: '13px', fontWeight: '800',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    boxShadow: '0 6px 14px rgba(217, 119, 6, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -2px 3px rgba(180, 83, 9, 0.45)',
                    textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {copied ? t.copied : t.copyCode}
                </button>
              </div>
            </div>

            {/* Menu Options List */}
            <div className="app-card" style={{ padding: '6px 14px' }}>
              {[
                { 
                  title: t.earningDetails, 
                  icon: '💰', 
                  action: () => {
                    fetchTransactions();
                    setShowTransactionsModal(true);
                  } 
                },
                { 
                  title: t.importantNotice, 
                  icon: '✉️', 
                  action: () => setShowNoticeModal(true) 
                },
                { 
                  title: t.myTeam, 
                  icon: '👥', 
                  action: () => {
                    setShowTeamModal(true);
                  } 
                },
                { 
                  title: t.changePassword, 
                  icon: '🔒', 
                  action: () => {
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setChangePwdError('');
                    setChangePwdSuccess('');
                    setShowChangePwdModal(true);
                  } 
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={item.action}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 0', borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1e293b' }}>
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
              ))}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                padding: '14px', borderRadius: '12px', background: '#ffffff',
                border: '1px solid #fee2e2', color: '#dc2626', fontWeight: 'bold',
                fontSize: '14px', cursor: 'pointer', textAlign: 'center'
              }}
            >
              {t.logout}
            </button>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: CHECK-IN CALENDAR                                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'checkin' && (
          <div>
            {/* Top Back Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <button
                onClick={() => navigateToTab('home')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#334155', padding: '4px', display: 'flex', alignItems: 'center'
                }}
              >
                <ChevronLeft size={22} color="#334155" strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{t.checkInCalendar}</span>
            </div>

            {/* Green Top Calendar Banner */}
            <div style={{
              background: 'linear-gradient(145deg, #166534 0%, #15803d 100%)',
              borderRadius: '20px 20px 0 0', padding: '22px 20px 20px', color: '#fff',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ maxWidth: '65%' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px', lineHeight: 1.2 }}>
                  {t.checkInToday}
                </h2>
                <p style={{ fontSize: '13px', opacity: 0.95, margin: '8px 0 0', lineHeight: 1.4 }}>
                  {t.checkInSubtitle}
                </p>
              </div>

              {/* 3D Calendar Graphic */}
              <img
                src="/images/checkin/calendar.webp"
                alt="Calendar"
                style={{
                  position: 'absolute', right: '14px', top: '16px',
                  width: '110px', height: '110px', objectFit: 'contain'
                }}
              />
            </div>

            {/* Today Date Pill Green Bar */}
            <div style={{
              background: '#237841', color: '#fff', textAlign: 'center',
              padding: '10px', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px'
            }}>
              {lang === 'bn' 
                ? `আজ ${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`
                : `Today ${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
            </div>

            {/* White Calendar Grid Box */}
            <div style={{
              background: '#ffffff', borderRadius: '0 0 20px 20px', padding: '16px 12px 20px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.04)', marginBottom: '16px'
            }}>
              {/* Day Headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center',
                fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '12px'
              }}>
                {lang === 'bn' ? (
                  <>
                    <div>রবি</div><div>সোম</div><div>মঙ্গল</div><div>বুধ</div><div>বৃহঃ</div><div>শুক্র</div><div>শনি</div>
                  </>
                ) : (
                  <>
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </>
                )}
              </div>

              {/* Calendar Days Matrix (35 days from 27 to 31) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {[
                  '27', '28', '29', '30', '01', '02', '03',
                  '04', '05', '06', '07', '08', '09', '10',
                  '11', '12', '13', '14', '15', '16', '17',
                  '18', '19', '20', '21', '22', '23', '24',
                  '25', '26', '27', '28', '29', '30', '31'
                ].map((d, idx) => {
                  const today = String(new Date().getDate()).padStart(2, '0');
                  const isToday = d === today && idx >= 20;

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 2px', borderRadius: '8px', textAlign: 'center',
                        background: isToday ? '#dcfce7' : '#f8fafc',
                        border: isToday ? '1.5px solid #22c55e' : '1px solid #f1f5f9'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: isToday ? 'bold' : 'normal' }}>
                        {d}
                      </div>
                      <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
                        <img
                          src="/images/checkin/perfect_star_coin.png"
                          alt="coin"
                          style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Check-In Action Button */}
              <button
                onClick={handleDoCheckIn}
                disabled={checkInStatus.isCheckedInToday}
                style={{
                  width: '100%', height: '46px', marginTop: '20px', borderRadius: '12px',
                  background: checkInStatus.isCheckedInToday ? '#e2e8f0' : (checkInStatus.canCheckIn ? '#15803d' : '#e2e8f0'),
                  color: checkInStatus.isCheckedInToday ? '#94a3b8' : (checkInStatus.canCheckIn ? '#ffffff' : '#64748b'),
                  fontWeight: 'bold', fontSize: '15px', border: 'none', cursor: 'pointer',
                  boxShadow: checkInStatus.canCheckIn ? '0 4px 12px rgba(21, 128, 61, 0.25)' : 'none'
                }}
              >
                {checkInStatus.isCheckedInToday ? t.checkInDone : t.checkInBtn}
              </button>

              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                {t.onlineTimeLow}: {checkInStatus.onlineHours}/{checkInStatus.requiredHours || 6} {t.hours}
              </div>
            </div>

            {/* Rules Card */}
            <div className="app-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: '#15803d', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d' }} />
                <span>{t.rules}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
                {t.rule1}<br/>
                {t.rule2}<br/>
                {t.rule3}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: ADMIN CONTROL PANEL                                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="app-card">
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>
              অ্যাডমিন প্রফিট মার্জিন ও টোকেন ব্রিজ
            </h2>

            {adminStats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>মোট ইউজার</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{adminStats.totalUsers}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>পেন্ডিং উইথড্র</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>{adminStats.pendingWithdrawals}</div>
                </div>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAdminSaving(true);
              const res = await fetch(`${API_BASE}/admin/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ configs: adminConfigs })
              });
              const d = await res.json();
              alert(d.msg);
              setAdminSaving(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#334155', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  মাস্টার প্ল্যাটফর্ম কানেক্টর টোকেন (Master Bearer Token)
                </label>
                <input
                  type="text"
                  placeholder="Bearer token paste here..."
                  value={adminConfigs.master_target_token || ''}
                  onChange={(e) => setAdminConfigs({ ...adminConfigs, master_target_token: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#334155', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  ইউজার রিওয়ার্ড রেশিও (যেমন: 0.80 = ৮০% ইউজারকে দেওয়া, ২০% আপনার লাভ)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={adminConfigs.user_reward_ratio || 0.80}
                  onChange={(e) => setAdminConfigs({ ...adminConfigs, user_reward_ratio: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#334155', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  স্তর ১ রেফারেল বোনাস রেশিও (ডিফল্ট: 0.15 = ১৫%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adminConfigs.referral_l1_ratio || 0.15}
                  onChange={(e) => setAdminConfigs({ ...adminConfigs, referral_l1_ratio: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#334155', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  স্তর ২ রেফারেল বোনাস রেশিও (ডিফল্ট: 0.05 = ৫%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adminConfigs.referral_l2_ratio || 0.05}
                  onChange={(e) => setAdminConfigs({ ...adminConfigs, referral_l2_ratio: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <button
                type="submit"
                disabled={adminSaving}
                className="action-btn-green"
                style={{ width: '100%', marginTop: '6px' }}
              >
                {adminSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* 3. BOTTOM NAVIGATION BAR (Home, Tasks, WhatsApp, Mine) */}
      <div style={{ height: '70px' }} />
      <div className="bottom-bar">
        {[
          { id: 'home', label: t.home, icon: Home },
          { id: 'tasks', label: t.tasks, icon: CheckSquare },
          { id: 'whatsapp', label: t.whatsapp, icon: MessageCircle },
          { id: 'my', label: t.my, icon: User }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateToTab(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#15803d' : '#94a3b8'
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 'bold' : 'normal' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Exit Notification Toast */}
      {exitToast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '30px',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: 99999,
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          animation: 'fadeInOut 2.2s ease forwards'
        }}>
          {lang === 'bn' ? 'অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন' : 'Press back again to exit'}
        </div>
      )}

      {/* 4. LANGUAGE SELECTION MODAL */}
      {showLangModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '24px 20px',
            width: '100%', maxWidth: '340px', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>
              {t.selectLanguage}
            </h3>

            {/* Bangla & English Selection Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              {/* Option Bangla */}
              <div
                onClick={() => setSelectedLangTemp('bn')}
                style={{
                  padding: '16px 10px', borderRadius: '14px', cursor: 'pointer',
                  border: selectedLangTemp === 'bn' ? '2px solid #15803d' : '1px solid #e2e8f0',
                  background: selectedLangTemp === 'bn' ? '#f0fdf4' : '#ffffff'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>বাংলা</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>বাংলা</div>
              </div>

              {/* Option English */}
              <div
                onClick={() => setSelectedLangTemp('en')}
                style={{
                  padding: '16px 10px', borderRadius: '14px', cursor: 'pointer',
                  border: selectedLangTemp === 'en' ? '2px solid #15803d' : '1px solid #e2e8f0',
                  background: selectedLangTemp === 'en' ? '#f0fdf4' : '#ffffff'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>English</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>English</div>
              </div>
            </div>

            {/* Cancel & Confirm Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLangModal(false)}
                style={{
                  flex: 1, height: '44px', borderRadius: '12px', background: '#f1f5f9',
                  border: 'none', color: '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  setLang(selectedLangTemp);
                  localStorage.setItem('lang', selectedLangTemp);
                  setShowLangModal(false);
                }}
                style={{
                  flex: 1, height: '44px', borderRadius: '12px', background: '#15803d',
                  border: 'none', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
                }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIDEO MODAL (আসল টিউটোরিয়াল ভিডিও সহ) */}
      {showVideoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '20px',
            width: '100%', maxWidth: '360px', textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', color: '#0f172a' }}>
              {t.videoHelp}
            </h3>

            {/* Real Playable WhatsApp Pairing Tutorial Video */}
            <div style={{
              background: '#000', borderRadius: '12px', overflow: 'hidden',
              position: 'relative', width: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <video
                src="/videos/whatsapp_help.mp4"
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '380px' }}
              >
                আপনার ব্রাউজার ভিডিও প্লে করতে সমর্থন করে না।
              </video>
            </div>

            <button
              onClick={() => setShowVideoModal(false)}
              className="action-btn-green"
              style={{ width: '100%', marginTop: '16px', fontSize: '14px' }}
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Fullscreen Modal */}
      {selectedTutorialImg && (
        <div 
          onClick={() => setSelectedTutorialImg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', backdropFilter: 'blur(6px)'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '340px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedTutorialImg(null)}
              style={{
                position: 'absolute', top: '-42px', right: '0',
                background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
                fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <img 
              src={selectedTutorialImg} 
              alt="Tutorial Zoom" 
              style={{ width: '100%', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'block' }} 
            />
          </div>
        </div>
      )}

      {/* 6. WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '20px',
            width: '100%', maxWidth: '360px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{t.withdraw}</h3>
              <button onClick={() => setShowWithdrawModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  {lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'bkash', name: 'bKash', logo: '/brand/bkash.png', color: '#e2136e', bgGrad: 'linear-gradient(135deg, #e2136e 0%, #be1259 100%)' },
                    { id: 'nagad', name: 'Nagad', logo: '/brand/nagad.png', color: '#f7941d', bgGrad: 'linear-gradient(135deg, #f7941d 0%, #ea580c 100%)' },
                    { id: 'rocket', name: 'Rocket', logo: '/brand/rocket.png', color: '#8c3494', bgGrad: 'linear-gradient(135deg, #8c3494 0%, #6b21a8 100%)' }
                  ].map((m) => {
                    const isSelected = withdrawMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setWithdrawMethod(m.id)}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: '16px',
                          border: isSelected ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                          background: isSelected 
                            ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' 
                            : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          boxShadow: isSelected 
                            ? '0 8px 18px rgba(217, 119, 6, 0.28), inset 0 1px 1px #ffffff, inset 0 -2px 0 rgba(0,0,0,0.06)' 
                            : '0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 #ffffff',
                          transform: isSelected ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative'
                        }}
                      >
                        {/* Real 3D Brand Logo Container */}
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px',
                          background: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isSelected
                            ? `0 4px 12px ${m.color}35, inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.06)`
                            : '0 2px 6px rgba(0,0,0,0.06)',
                          border: isSelected ? `1.5px solid ${m.color}50` : '1px solid #f1f5f9',
                          padding: '5px', overflow: 'hidden'
                        }}>
                          <img
                            src={m.logo}
                            alt={m.name}
                            style={{
                              width: '100%', height: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <span style={{
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: '12px',
                          color: isSelected ? '#0f172a' : '#64748b',
                          letterSpacing: '0.2px'
                        }}>
                          {m.name}
                        </span>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: '-4px', right: '-4px',
                            width: '16px', height: '16px', borderRadius: '50%',
                            background: '#fbbf24', color: '#78350f', fontSize: '10px',
                            fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                            border: '1.5px solid #ffffff'
                          }}>
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  {lang === 'bn' ? 'অ্যাকাউন্ট নম্বর' : 'Account Number'}
                </label>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  {lang === 'bn' ? 'টাকার পরিমাণ (মিনিমাম ৳২০০)' : 'Amount (Minimum ৳200)'}
                </label>
                <input
                  type="number"
                  placeholder="200"
                  min="200"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              {withdrawMsg && (
                <div style={{ fontSize: '12px', color: '#15803d', background: '#dcfce7', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  {withdrawMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading}
                className="action-btn-green"
                style={{ width: '100%', marginTop: '6px' }}
              >
                {withdrawLoading ? (lang === 'bn' ? 'উত্তোলন হচ্ছে...' : 'Processing...') : (lang === 'bn' ? 'উত্তোলন নিশ্চিত করুন' : 'Confirm Withdrawal')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. OFFICIAL SHARE MODAL (হুবহু আসল EarnBondhu এর মতো বটম শিট / পপআপ) */}
      {showShareModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px 20px', width: '100%', maxWidth: '440px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', animation: 'slideUp 0.25s ease'
          }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '20px' }}>
              {lang === 'bn' ? 'আপনার লিংক শেয়ার করুন' : 'Share your link'}
            </div>

            {/* Social Share Icons Row (আপনার দেওয়া আসল অরিজিনাল লোগো সমূহ) */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '24px' }}>
              {/* WhatsApp Share */}
              <div 
                onClick={() => {
                  const inviteLink = `${window.location.origin}/register?invite=${user?.inviteCode || ''}`;
                  const shareText = encodeURIComponent(`Earn money daily on EarnPulse! Register and start earning now: ${inviteLink}`);
                  // Web + Mobile universal WhatsApp URL
                  const waUrl = `https://api.whatsapp.com/send?text=${shareText}`;
                  window.open(waUrl, '_blank', 'noopener,noreferrer');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <img
                  src="/images/social/whatsapp.png"
                  alt="WhatsApp"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>WhatsApp</span>
              </div>

              {/* Telegram Share */}
              <div 
                onClick={() => {
                  const inviteLink = `${window.location.origin}/register?invite=${user?.inviteCode || ''}`;
                  const shareText = encodeURIComponent(`Earn money daily on EarnPulse! Register here: ${inviteLink}`);
                  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareText}`;
                  window.open(tgUrl, '_blank', 'noopener,noreferrer');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <img
                  src="/images/social/telegram.png"
                  alt="Telegram"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>Telegram</span>
              </div>

              {/* Facebook Share */}
              <div 
                onClick={() => {
                  const inviteLink = `${window.location.origin}/register?invite=${user?.inviteCode || ''}`;
                  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`;
                  window.open(fbUrl, '_blank', 'noopener,noreferrer');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <img
                  src="/images/social/facebook.png"
                  alt="Facebook"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>Facebook</span>
              </div>

              {/* Messenger Share */}
              <div 
                onClick={() => {
                  const inviteLink = `${window.location.origin}/register?invite=${user?.inviteCode || ''}`;
                  // Web Messenger dialog + deep link
                  const msgUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(inviteLink)}&app_id=29141203953&redirect_uri=${encodeURIComponent(window.location.origin)}`;
                  window.open(msgUrl, '_blank', 'noopener,noreferrer');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <img
                  src="/images/social/messenger.png"
                  alt="Messenger"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>Messenger</span>
              </div>

              {/* IMO Share */}
              <div 
                onClick={() => {
                  const inviteLink = `${window.location.origin}/register?invite=${user?.inviteCode || ''}`;
                  copyToClipboard(inviteLink);
                  // Try IMO app protocol or web share
                  if (navigator.share) {
                    navigator.share({
                      title: 'EarnPulse Invitation',
                      text: 'Earn money daily on EarnPulse! Register here:',
                      url: inviteLink
                    }).catch(() => {});
                  } else {
                    window.location.href = 'imo://';
                    setTimeout(() => {
                      alert(lang === 'bn' ? 'আমন্ত্রণ লিংক কপি হয়েছে! IMO অ্যাপে বন্ধুদের পেস্ট করে পাঠান।' : 'Link copied! Paste and share with IMO friends.');
                    }, 500);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <img
                  src="/images/social/imo.png"
                  alt="IMO"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>IMO</span>
              </div>
            </div>

            {/* Link Box with Copy Button */}
            <div style={{
              background: '#f8fafc', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '18px'
            }}>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '12px', color: '#64748b', marginRight: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{lang === 'bn' ? 'লিংক | ' : 'Link | '}</span>
                {`${window.location.origin}/register?invite=${user?.inviteCode || ''}`}
              </div>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/register?invite=${user?.inviteCode || ''}`)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', background: '#15803d',
                  color: '#fff', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', flexShrink: 0
                }}
              >
                {copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'কপি করুন' : 'Copy')}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                width: '100%', height: '44px', borderRadius: '12px', background: '#f1f5f9',
                border: 'none', color: '#475569', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              {lang === 'bn' ? 'বন্ধ' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* 8. TRANSACTIONS / INCOME DETAILS MODAL (হুবহু আসল স্ক্রিনশট ২ - লেনদেনের ইতিহাস) */}
      {showTransactionsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 300,
          display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px',
          margin: '0 auto', left: 0, right: 0
        }}>
          {/* Header with Back Arrow and Logo */}
          <div style={{
            background: '#ffffff', padding: '14px 16px', display: 'flex', alignItems: 'center',
            gap: '12px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button
              onClick={() => setShowTransactionsModal(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#334155', display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <ChevronLeft size={22} color="#334155" strokeWidth={2.5} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/brand/earnpulse-logo.png"
                alt="Logo"
                style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                {lang === 'bn' ? 'লেনদেনের ইতিহাস' : 'Transaction History'}
              </span>
            </div>
          </div>

          {/* Top Date Filter Chips */}
          <div style={{
            padding: '12px 14px', background: '#ffffff', borderBottom: '1px solid #f1f5f9',
            display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch'
          }}>
            {[
              { id: 'all', bn: 'সব তারিখ', en: 'All Dates' },
              { id: 'today', bn: 'আজ', en: 'Today' },
              { id: 'yesterday', bn: 'গতকাল', en: 'Yesterday' },
              { id: '7days', bn: 'গত ৭ দিন', en: 'Last 7 Days' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTransDateFilter(f.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: transDateFilter === f.id ? 'bold' : 'normal',
                  background: transDateFilter === f.id ? '#eaf3ed' : '#f1f5f9',
                  color: transDateFilter === f.id ? '#15803d' : '#64748b',
                  border: transDateFilter === f.id ? '1px solid #86efac' : '1px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {lang === 'bn' ? f.bn : f.en}
              </button>
            ))}
          </div>

          {/* 2-Column Body: Left Categories + Right Transactions List */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left Category Sidebar */}
            <div style={{
              width: '125px', background: '#f1f5f9', overflowY: 'auto',
              borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'
            }}>
              {[
                { id: 'all', bn: 'সব', en: 'All' },
                { id: 'online', bn: 'অনলাইনে থাকার সময়', en: 'Online Duration' },
                { id: 'subCommission', bn: 'দলের কমিশন', en: 'Team Commission' },
                { id: 'checkIn', bn: 'চেক-ইন', en: 'Check-in' },
                { id: 'invite', bn: 'আমন্ত্রণের পুরস্কার', en: 'Invite Reward' },
                { id: 'register', bn: 'নিবন্ধন বোনাস', en: 'Register Bonus' },
                { id: 'dailyLogin', bn: 'দৈনিক লগইন পুরস্কার', en: 'Daily Login' },
                { id: 'bindWhatsapp', bn: 'WhatsApp সংযুক্তি', en: 'Bind WhatsApp' },
                { id: 'system', bn: 'সিস্টেম বোনাস', en: 'System Bonus' },
                { id: 'withdraw', bn: 'উত্তোলন', en: 'Withdrawal' },
                { id: 'withdrawFail', bn: 'উত্তোলন ব্যর্থ', en: 'Withdrawal Failed' },
                { id: 'inviteExtra', bn: 'অতিরিক্ত আমন্ত্রণ বোনাস', en: 'Extra Invite Bonus' }
              ].map((c) => {
                const isSelected = transFilter === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setTransFilter(c.id)}
                    style={{
                      padding: '12px 10px', fontSize: '12px', cursor: 'pointer',
                      color: isSelected ? '#15803d' : '#475569',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      background: isSelected ? '#ffffff' : 'transparent',
                      borderLeft: isSelected ? '3.5px solid #15803d' : '3.5px solid transparent',
                      lineHeight: 1.3
                    }}
                  >
                    {lang === 'bn' ? c.bn : c.en}
                  </div>
                );
              })}
            </div>

            {/* Right Transactions List */}
            <div style={{ flex: 1, background: '#ffffff', overflowY: 'auto', padding: '14px 12px' }}>
              {(() => {
                // Filter by category
                let filtered = transactions;
                if (transFilter === 'checkIn') filtered = filtered.filter(t => t.type === 'daily_checkin');
                else if (transFilter === 'online') filtered = filtered.filter(t => t.type === 'whatsapp_online');
                else if (transFilter === 'withdraw') filtered = filtered.filter(t => t.type === 'withdraw');
                else if (transFilter === 'subCommission' || transFilter === 'invite') filtered = filtered.filter(t => t.type === 'referral_bonus');
                else if (transFilter !== 'all') filtered = [];

                // Filter by date
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const yestDate = new Date(now.getTime() - 24 * 3600 * 1000);
                const yestStr = yestDate.toISOString().split('T')[0];
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

                if (transDateFilter === 'today') {
                  filtered = filtered.filter(t => t.created_at && t.created_at.startsWith(todayStr));
                } else if (transDateFilter === 'yesterday') {
                  filtered = filtered.filter(t => t.created_at && t.created_at.startsWith(yestStr));
                } else if (transDateFilter === '7days') {
                  filtered = filtered.filter(t => new Date(t.created_at) >= sevenDaysAgo);
                }

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '13px' }}>
                      {lang === 'bn' ? 'আর কোনো বিবরণ নেই' : 'No more records'}
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map((item, idx) => {
                      const isCredit = item.isCredit !== false;
                      const displayTitle = item.type === 'daily_checkin'
                        ? (lang === 'bn' ? 'চেক-ইন' : 'Check-in')
                        : (item.type === 'whatsapp_online'
                          ? (lang === 'bn' ? 'অনলাইন পুরস্কার' : 'Online Reward')
                          : (item.type === 'withdraw'
                            ? (lang === 'bn' ? 'উত্তোলন' : 'Withdrawal')
                            : (item.description || (lang === 'bn' ? 'বোনাস' : 'Bonus'))));

                      const formattedDate = item.created_at 
                        ? item.created_at.replace('T', ' ').substring(0, 19)
                        : '';

                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#ffffff', borderRadius: '12px', padding: '12px 14px',
                            border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: isCredit ? '#eaf3ed' : '#fee2e2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isCredit ? '#15803d' : '#dc2626', fontSize: '16px'
                            }}>
                              {isCredit ? '↙' : '↗'}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                                {displayTitle}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                {formattedDate}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            fontSize: '15px', fontWeight: 'bold',
                            color: isCredit ? '#15803d' : '#dc2626'
                          }}>
                            {isCredit ? `+৳${parseFloat(item.amount || 0).toFixed(2)}` : `-৳${parseFloat(item.amount || 0).toFixed(2)}`}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ textAlign: 'center', padding: '20px 0 10px', color: '#94a3b8', fontSize: '12px' }}>
                      {lang === 'bn' ? 'আর কোনো বিবরণ নেই' : 'No more records'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 9. MY TEAM MODAL (হুবহু আসল স্ক্রিনশট - দল / Subordinate List) */}
      {showTeamModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 300,
          display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px',
          margin: '0 auto', left: 0, right: 0
        }}>
          {/* Header with Back Arrow and Title */}
          <div style={{
            background: '#ffffff', padding: '14px 16px', display: 'flex', alignItems: 'center',
            borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button
              onClick={() => setShowTeamModal(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#334155', display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <ChevronLeft size={22} color="#334155" strokeWidth={2.5} />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginRight: '24px' }}>
              {lang === 'bn' ? 'দল' : 'Team'}
            </div>
          </div>

          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
            {/* Top Summary Card (দলের সদস্য সংখ্যা ও আয়) */}
            <div style={{
              background: '#ffffff', borderRadius: '18px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9'
            }}>
              {/* Stat 1: দলের সদস্য সংখ্যা */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', background: '#15803d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
                }}>
                  <User size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.2 }}>
                    {lang === 'bn' ? 'দলের সদস্য সংখ্যা' : 'Team Members'}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                    {teamStats.totalCount || referrals.length || 0}
                  </div>
                </div>
              </div>

              {/* Vertical divider */}
              <div style={{ width: '1px', height: '36px', background: '#f1f5f9', margin: '0 12px' }} />

              {/* Stat 2: আয় */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', background: '#ca8a04',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '20px'
                }}>
                  🪙
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.2 }}>
                    {lang === 'bn' ? 'আয়' : 'Income'}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                    {teamStats.totalTeamEarnings || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Subordinate Members List Card */}
            <div style={{
              background: '#ffffff', borderRadius: '18px', padding: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9',
              minHeight: '350px'
            }}>
              {referrals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '13px' }}>
                  {lang === 'bn' ? 'আর কোনো বিবরণ নেই' : 'No team members yet'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {referrals.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 0', borderBottom: idx < referrals.length - 1 ? '1px solid #f8fafc' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#15803d', fontSize: '16px' }}>👤</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                          {member.username}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                        <div>
                          {lang === 'bn' ? 'দলের সদস্য সংখ্যা: ' : 'Team: '}
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{member.subTeamCount || 0}</span>
                        </div>
                        <div>
                          {lang === 'bn' ? 'মোট আয়: ' : 'Earned: '}
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{member.total_earned || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', padding: '30px 0 10px', color: '#94a3b8', fontSize: '12px' }}>
                    {lang === 'bn' ? 'আর কোনো বিবরণ নেই' : 'No more records'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. CHANGE PASSWORD MODAL (হুবহু আসল স্ক্রিনশট ২ - পাসওয়ার্ড পরিবর্তন) */}
      {showChangePwdModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#ffffff', zIndex: 350,
          display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px',
          margin: '0 auto', left: 0, right: 0
        }}>
          {/* Top Header with Back Arrow and Title */}
          <div style={{
            background: '#ffffff', padding: '14px 16px', display: 'flex', alignItems: 'center',
            borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button
              onClick={() => setShowChangePwdModal(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#334155', display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <ChevronLeft size={22} color="#334155" strokeWidth={2.5} />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginRight: '24px' }}>
              {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
            </div>
          </div>

          <div style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setChangePwdLoading(true);
              setChangePwdError('');
              setChangePwdSuccess('');

              if (newPassword !== confirmNewPassword) {
                setChangePwdError(lang === 'bn' ? 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!' : 'Passwords do not match!');
                setChangePwdLoading(false);
                return;
              }

              try {
                const res = await fetch(`${API_BASE}/user/change-password`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    oldPassword,
                    newPassword,
                    confirmPassword: confirmNewPassword
                  })
                });
                const data = await res.json();
                if (data && data.success) {
                  setChangePwdSuccess(data.msg || (lang === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password changed successfully!'));
                  setTimeout(() => {
                    setShowChangePwdModal(false);
                  }, 1500);
                } else {
                  setChangePwdError(data?.msg || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to change password'));
                }
              } catch (err) {
                setChangePwdError(lang === 'bn' ? 'সার্ভার সংযোগ সমস্যা' : 'Server connection error');
              } finally {
                setChangePwdLoading(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column' }}>

              {/* Field 1: পুরোনো পাসওয়ার্ড */}
              <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                  {lang === 'bn' ? 'পুরোনো পাসওয়ার্ড' : 'Old Password'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#15803d', fontSize: '18px' }}>🔒</span>
                  <input
                    type="password"
                    placeholder={lang === 'bn' ? 'পুরোনো পাসওয়ার্ড লিখুন' : 'Enter old password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      fontSize: '14px', color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {/* Field 2: নতুন পাসওয়ার্ড */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#15803d', fontSize: '18px' }}>🔒</span>
                  <input
                    type="password"
                    placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড লিখুন' : 'Enter new password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      fontSize: '14px', color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {/* Field 3: পাসওয়ার্ড নিশ্চিত করুন */}
              <div style={{ padding: '16px 0 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                  {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#15803d', fontSize: '18px' }}>🔒</span>
                  <input
                    type="password"
                    placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    style={{
                      flex: 1, border: 'none', background: 'transparent', outline: 'none',
                      fontSize: '14px', color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {changePwdError && (
                <div style={{ fontSize: '12px', color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '10px', marginTop: '16px', textAlign: 'center' }}>
                  {changePwdError}
                </div>
              )}

              {changePwdSuccess && (
                <div style={{ fontSize: '12px', color: '#15803d', background: '#dcfce7', padding: '10px', borderRadius: '10px', marginTop: '16px', textAlign: 'center' }}>
                  {changePwdSuccess}
                </div>
              )}

              {/* Big Green Save Button (সংরক্ষণ) */}
              <button
                type="submit"
                disabled={changePwdLoading}
                className="action-btn-green"
                style={{
                  width: '100%', height: '48px', borderRadius: '12px',
                  fontSize: '16px', fontWeight: 'bold', marginTop: '30px',
                  background: '#15803d', border: 'none', color: '#ffffff'
                }}
              >
                {changePwdLoading ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ' : 'Save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 10.1 IMPORTANT NOTICE MODAL (জরুরি বিজ্ঞপ্তি) */}
      {showNoticeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 350,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '360px',
            padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center'
          }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', marginBottom: '14px'
            }}>
              ✉️
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
              {t.importantNotice}
            </div>
            <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              {lang === 'bn' 
                ? 'স্বাগতম EarnPulse-এ! আপনার হোয়াটসঅ্যাপ অ্যাকাউন্ট যুক্ত করে প্রতিদিন ঘরে বসে নিশ্চিত আয় করুন। সিস্টেমের সকল সেবা সম্পূর্ণ স্বাভাবিক ও সক্রিয় আছে।'
                : 'Welcome to EarnPulse! Connect your WhatsApp account and earn guaranteed daily income. All platform services are fully operational.'}
            </div>
            <button
              onClick={() => setShowNoticeModal(false)}
              className="action-btn-green"
              style={{ width: '100%', height: '44px', borderRadius: '12px', fontSize: '14px' }}
            >
              {lang === 'bn' ? 'ঠিক আছে' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* 11. WITHDRAWALS HISTORY MODAL (হুবহু আসল স্ক্রিনশট ২ এর মতো - Withdrawals) */}
      {showWithdrawHistoryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 300,
          display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px',
          margin: '0 auto', left: 0, right: 0
        }}>
          {/* Header with Back Arrow and Brand Title */}
          <div style={{
            background: '#ffffff', padding: '12px 16px', display: 'flex', alignItems: 'center',
            borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button
              onClick={() => setShowWithdrawHistoryModal(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#334155', display: 'flex', alignItems: 'center', padding: '4px'
              }}
            >
              <ChevronLeft size={22} color="#334155" strokeWidth={2.5} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginRight: '24px' }}>
              <img
                src="/brand/earnpulse-logo.png"
                alt="EarnPulse"
                style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>
                {lang === 'bn' ? 'উত্তোলন' : 'Withdrawals'}
              </span>
            </div>
          </div>

          {/* Top Date Filter Chips */}
          <div style={{
            background: '#ffffff', display: 'flex', gap: '8px', padding: '10px 14px',
            borderBottom: '1px solid #f1f5f9', overflowX: 'auto', whiteSpace: 'nowrap'
          }}>
            {[
              { id: 'all', labelBn: 'সব তারিখ', labelEn: 'All Dates' },
              { id: 'today', labelBn: 'আজ', labelEn: 'Today' },
              { id: 'yesterday', labelBn: 'গতকাল', labelEn: 'Yesterday' },
              { id: '7days', labelBn: 'গত ৭ দিন', labelEn: 'Last 7 Days' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setWithdrawDateFilter(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: withdrawDateFilter === tab.id ? 'bold' : 'normal',
                  border: 'none',
                  background: withdrawDateFilter === tab.id ? '#15803d' : '#f1f5f9',
                  color: withdrawDateFilter === tab.id ? '#ffffff' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0
                }}
              >
                {lang === 'bn' ? tab.labelBn : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Main 2-Column Split: Left Sidebar (Categories) & Right Area (Items / Empty State) */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Status Categories Sidebar */}
            <div style={{
              width: '105px', background: '#f8fafc', borderRight: '1px solid #e2e8f0',
              overflowY: 'auto', display: 'flex', flexDirection: 'column'
            }}>
              {[
                { id: 'all', labelBn: 'সব', labelEn: 'All' },
                { id: 'pending', labelBn: 'অপেক্ষমান', labelEn: 'Pending' },
                { id: 'processing', labelBn: 'প্রক্রিয়াধীন', labelEn: 'Processing' },
                { id: 'success', labelBn: 'সফল', labelEn: 'Success' },
                { id: 'failed', labelBn: 'ব্যর্থ', labelEn: 'Failed' },
                { id: 'approved', labelBn: 'অনুমোদিত', labelEn: 'Approved' },
                { id: 'rejected', labelBn: 'প্রত্যাখ্যাত', labelEn: 'Rejected' }
              ].map(cat => {
                const isActive = withdrawStatusFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setWithdrawStatusFilter(cat.id)}
                    style={{
                      padding: '14px 10px', fontSize: '13px', textAlign: 'center',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#15803d' : '#64748b',
                      fontWeight: isActive ? 'bold' : 'normal',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #15803d' : '3px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    {lang === 'bn' ? cat.labelBn : cat.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Right List Area */}
            <div style={{ flex: 1, padding: '14px', overflowY: 'auto', background: '#ffffff' }}>
              {(() => {
                let filtered = [...withdrawHistory];

                // 1. Status Filter
                if (withdrawStatusFilter !== 'all') {
                  if (withdrawStatusFilter === 'approved' || withdrawStatusFilter === 'success') {
                    filtered = filtered.filter(w => w.status === 'approved' || w.status === 'success');
                  } else if (withdrawStatusFilter === 'rejected' || withdrawStatusFilter === 'failed') {
                    filtered = filtered.filter(w => w.status === 'rejected' || w.status === 'failed');
                  } else if (withdrawStatusFilter === 'processing') {
                    filtered = filtered.filter(w => w.status === 'processing');
                  } else if (withdrawStatusFilter === 'pending') {
                    filtered = filtered.filter(w => w.status === 'pending');
                  }
                }

                // 2. Date Filter
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const yestDate = new Date(now.getTime() - 24 * 3600 * 1000);
                const yestStr = yestDate.toISOString().split('T')[0];
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

                if (withdrawDateFilter === 'today') {
                  filtered = filtered.filter(w => w.created_at && w.created_at.startsWith(todayStr));
                } else if (withdrawDateFilter === 'yesterday') {
                  filtered = filtered.filter(w => w.created_at && w.created_at.startsWith(yestStr));
                } else if (withdrawDateFilter === '7days') {
                  filtered = filtered.filter(w => new Date(w.created_at) >= sevenDaysAgo);
                }

                if (withdrawHistoryLoading) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '13px' }}>
                      {lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                    </div>
                  );
                }

                // Empty State with Icon matching Screenshot 2
                if (filtered.length === 0) {
                  return (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', height: '100%', minHeight: '260px',
                      color: '#94a3b8', textAlign: 'center'
                    }}>
                      <div style={{
                        width: '74px', height: '74px', borderRadius: '18px',
                        background: '#f1f5f9', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '36px', marginBottom: '12px'
                      }}>
                        📁
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>
                        {lang === 'bn' ? 'কোনো তথ্য নেই' : 'No Data'}
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map((item, idx) => {
                      const isApproved = item.status === 'approved' || item.status === 'success';
                      const isRejected = item.status === 'rejected' || item.status === 'failed';
                      const isPending = item.status === 'pending';

                      const statusBadge = isApproved ? {
                        text: lang === 'bn' ? 'অনুমোদিত' : 'Approved',
                        bg: '#dcfce7', color: '#15803d'
                      } : isRejected ? {
                        text: lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected',
                        bg: '#fee2e2', color: '#dc2626'
                      } : {
                        text: lang === 'bn' ? 'অপেক্ষমান' : 'Pending',
                        bg: '#fef3c7', color: '#d97706'
                      };

                      const formattedDate = item.created_at
                        ? item.created_at.replace('T', ' ').substring(0, 19)
                        : '';

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            background: '#f8fafc', borderRadius: '12px', padding: '12px 14px',
                            border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', textTransform: 'capitalize' }}>
                                {item.method || 'bKash'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                ({item.account_number})
                              </span>
                            </div>
                            <span style={{
                              fontSize: '11px', fontWeight: 'bold', padding: '3px 8px',
                              borderRadius: '12px', background: statusBadge.bg, color: statusBadge.color
                            }}>
                              {statusBadge.text}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {formattedDate}
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                              ৳{parseFloat(item.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ textAlign: 'center', padding: '16px 0 6px', color: '#94a3b8', fontSize: '12px' }}>
                      {lang === 'bn' ? 'আর কোনো বিবরণ নেই' : 'No more records'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
