import React, { useState, useEffect } from 'react';
import { Service, Plan, Order, Banner, SiteSettings, ActivityLog, Wallet, WalletTransaction, WalletSettings, WalletLog, WalletRechargeRequest } from './types';
import {
  INITIAL_SERVICES,
  INITIAL_PLANS,
  INITIAL_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_BANNERS,
  INITIAL_ACTIVITIES
} from './initialData';
import AdminConsole from './components/AdminConsole';
import UserWallet from './components/UserWallet';
import PaymentRedirectorOverlay from './components/PaymentRedirectorOverlay';
import PlanVideoPlayer from './components/PlanVideoPlayer';

export default function App() {
  // --- STATE LOADERS & SYSTEM SYNC ---
  const [services, setServices] = useState<Service[]>(() => {
    const local = localStorage.getItem('zyro_services');
    return local ? JSON.parse(local) : INITIAL_SERVICES;
  });

  const [plans, setPlans] = useState<Plan[]>(() => {
    const local = localStorage.getItem('zyro_plans');
    return local ? JSON.parse(local) : INITIAL_PLANS;
  });

  const [settings, setSettings] = useState<SiteSettings>(() => {
    const local = localStorage.getItem('zyro_settings');
    return local ? JSON.parse(local) : INITIAL_SETTINGS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const local = localStorage.getItem('zyro_orders');
    return local ? JSON.parse(local) : INITIAL_ORDERS;
  });

  const [banners, setBanners] = useState<Banner[]>(() => {
    const local = localStorage.getItem('zyro_banners');
    return local ? JSON.parse(local) : INITIAL_BANNERS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const local = localStorage.getItem('zyro_activity_logs');
    return local ? JSON.parse(local) : INITIAL_ACTIVITIES;
  });

  // --- WALLET SYSTEM STATES ---
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    const local = localStorage.getItem('zyro_wallets');
    return local ? JSON.parse(local) : [];
  });

  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    const local = localStorage.getItem('zyro_wallet_transactions');
    return local ? JSON.parse(local) : [];
  });

  const [walletSettings, setWalletSettings] = useState<WalletSettings>(() => {
    const local = localStorage.getItem('zyro_wallet_settings');
    const defaultSettings: WalletSettings = {
      minRecharge: 10,
      maxRecharge: 100000,
      defaultQuickAmounts: [100, 250, 500, 1000, 2000, 5000],
      walletEnabled: true,
      autoCreditEnabled: true,
      walletBonusEnabled: false,
      rechargeSuccessMessage: 'Recharge successful! Your wallet has been credited.',
      rechargeFailureMessage: 'Recharge failed! Payment was not credited to your wallet.'
    };
    return local ? JSON.parse(local) : defaultSettings;
  });

  const [walletLogs, setWalletLogs] = useState<WalletLog[]>(() => {
    const local = localStorage.getItem('zyro_wallet_logs');
    return local ? JSON.parse(local) : [];
  });

  const [rechargeRequests, setRechargeRequests] = useState<WalletRechargeRequest[]>(() => {
    const local = localStorage.getItem('zyro_wallet_recharge_requests');
    return local ? JSON.parse(local) : [];
  });

  // --- ZAPUPI PAYMENT & DYNAMIC SERVER SYNCS ---
  const [isInitialized, setIsInitialized] = useState(false);
  const [zapupiPaymentResult, setZapupiPaymentResult] = useState<{ status: 'success' | 'failed'; orderId?: string } | null>(null);
  const [paymentRedirector, setPaymentRedirector] = useState<{
    url: string;
    amount: number;
    customerName: string;
    customerMobile: string;
    orderId?: string;
  } | null>(null);

  // Load from backend on startup
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(db => {
        if (db && Object.keys(db).length > 0) {
          if (db.services) setServices(db.services);
          if (db.plans) setPlans(db.plans);
          if (db.settings) setSettings(db.settings);
          if (db.orders) setOrders(db.orders);
          if (db.banners) setBanners(db.banners);
          if (db.activityLogs) setActivityLogs(db.activityLogs);
          if (db.wallets) setWallets(db.wallets);
          if (db.walletTransactions) setWalletTransactions(db.walletTransactions);
          if (db.walletSettings) setWalletSettings(db.walletSettings);
          if (db.walletLogs) setWalletLogs(db.walletLogs);
          if (db.rechargeRequests) setRechargeRequests(db.rechargeRequests);
          setIsInitialized(true);
        } else {
          // If server database is empty, seed it with the current client data
          const seed = {
            services,
            plans,
            settings,
            orders,
            banners,
            activityLogs,
            wallets,
            walletTransactions,
            walletSettings,
            walletLogs,
            rechargeRequests
          };
          fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(seed)
          })
          .then(() => setIsInitialized(true))
          .catch(err => {
            console.error('Error seeding DB on startup:', err);
            setIsInitialized(true); // set true even if error to allow client session usage
          });
        }
      })
      .catch(err => {
        console.error('Error loading DB on startup:', err);
        setIsInitialized(true); // fallback to allow client offline usage
      });
  }, []);

  // Listen to state changes and push to server DB (debounced)
  useEffect(() => {
    if (!isInitialized) return;

    const syncData = {
      services,
      plans,
      settings,
      orders,
      banners,
      activityLogs,
      wallets,
      walletTransactions,
      walletSettings,
      walletLogs,
      rechargeRequests
    };

    const timer = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData)
      }).catch(err => console.error('Error syncing DB to server:', err));
    }, 1000);

    return () => clearTimeout(timer);
  }, [isInitialized, services, plans, settings, orders, banners, activityLogs, wallets, walletTransactions, walletSettings, walletLogs, rechargeRequests]);

  // Check URL params for ZapUPI checkout outcomes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('zapupi_status');
    const orderId = params.get('order_id');

    if (status) {
      setZapupiPaymentResult({
        status: status === 'success' ? 'success' : 'failed',
        orderId: orderId || undefined
      });
      // Clear address bar cleanly
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);

  // Pathname router for deep link redirects
  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname === '/orders') {
      setPage('orders');
      window.history.replaceState({}, document.title, '/');
    } else if (pathname === '/wallet') {
      setPage('wallet');
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // --- PERSISTENCE EFFECT WRITERS ---
  useEffect(() => {
    localStorage.setItem('zyro_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('zyro_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('zyro_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zyro_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('zyro_banners', JSON.stringify(banners));
  }, [banners]);

  useEffect(() => {
    localStorage.setItem('zyro_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('zyro_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('zyro_wallet_transactions', JSON.stringify(walletTransactions));
  }, [walletTransactions]);

  useEffect(() => {
    localStorage.setItem('zyro_wallet_settings', JSON.stringify(walletSettings));
  }, [walletSettings]);

  useEffect(() => {
    localStorage.setItem('zyro_wallet_logs', JSON.stringify(walletLogs));
  }, [walletLogs]);

  useEffect(() => {
    localStorage.setItem('zyro_wallet_recharge_requests', JSON.stringify(rechargeRequests));
  }, [rechargeRequests]);

  // --- CORE UX SYSTEM TABS ---
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [page, setPage] = useState<'home' | 'service_detail' | 'orders' | 'profile' | 'wallet'>('home');

  // --- HIDDEN ADMIN MODE TRIGGERS ---
  useEffect(() => {
    const handleCheckAdminHash = () => {
      if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
        setIsAdminMode(true);
      }
    };
    handleCheckAdminHash();
    window.addEventListener('hashchange', handleCheckAdminHash);
    return () => window.removeEventListener('hashchange', handleCheckAdminHash);
  }, []);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(2); // Default to Dripclient
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // --- USER AUTHENTICATION STATES ---
  const [users, setUsers] = useState<{ username: string; whatsapp: string; password?: string; dateJoined: string }[]>(() => {
    const local = localStorage.getItem('zyro_users');
    return local ? JSON.parse(local) : [];
  });

  const [loggedInUser, setLoggedInUser] = useState<{ username: string; whatsapp: string } | null>(() => {
    const local = localStorage.getItem('zyro_logged_in_user');
    return local ? JSON.parse(local) : null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authWhatsApp, setAuthWhatsApp] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [trackWhatsApp, setTrackWhatsApp] = useState('');

  // Persist user records
  useEffect(() => {
    localStorage.setItem('zyro_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('zyro_logged_in_user', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('zyro_logged_in_user');
    }
  }, [loggedInUser]);

  // --- MODALS STATES ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentService, setPaymentService] = useState<Service | null>(null);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // --- CLIENT ORDER PLACEMENT FIELDS ---
  const [custName, setCustName] = useState('');
  const [custWhatsApp, setCustWhatsApp] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [checkoutMethod, setCheckoutMethod] = useState<'selection' | 'wallet' | 'upi'>('selection');
  const [upiUtr, setUpiUtr] = useState('');
  const [upiContact, setUpiContact] = useState('');
  const [upiRemarks, setUpiRemarks] = useState('');
  const [walletConfirmPay, setWalletConfirmPay] = useState(false);

  // --- HOMEPAGE CUSTOM UPI PAYMENT FIELDS ---
  const [homepageUpiAmount, setHomepageUpiAmount] = useState('500');
  const [guestUpiName, setGuestUpiName] = useState('');
  const [guestUpiMobile, setGuestUpiMobile] = useState('');
  const [isRedirectingToHomepageZapUpi, setIsRedirectingToHomepageZapUpi] = useState(false);
  const [showHomepageUpiForm, setShowHomepageUpiForm] = useState(false);

  // --- LIVE COUNTER SYSTEM ---
  const [onlineUsers, setOnlineUsers] = useState(settings.minUsers);

  useEffect(() => {
    if (!settings.randomUsersEnabled) {
      setOnlineUsers(settings.minUsers);
      return;
    }
    const interval = setInterval(() => {
      setOnlineUsers(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const next = prev + delta;
        return next >= settings.minUsers && next <= settings.maxUsers ? next : prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [settings.minUsers, settings.maxUsers, settings.randomUsersEnabled]);

  // --- GLOBAL SYSTEM ACTION LOGGERS ---
  const logActivity = (action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // --- WALLET SYSTEM HELPERS & DISPATCHERS ---
  const logWalletActivity = (whatsapp: string, action: string, details: string) => {
    const newLog: WalletLog = {
      id: `wlog-${Date.now()}`,
      whatsapp,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setWalletLogs(prev => [newLog, ...prev]);
  };

  const getUserWallet = (whatsapp: string, username: string): Wallet => {
    const normPhone = whatsapp.replace(/\s+/g, '');
    const existing = wallets.find(w => w.whatsapp.replace(/\s+/g, '') === normPhone);
    if (existing) return existing;

    const newWallet: Wallet = {
      whatsapp: whatsapp,
      username: username,
      balance: 0,
      totalAdded: 0,
      totalSpent: 0,
      lastRecharge: 'N/A',
      status: 'Active'
    };
    
    setWallets(prev => {
      if (prev.some(w => w.whatsapp.replace(/\s+/g, '') === normPhone)) return prev;
      return [...prev, newWallet];
    });
    return newWallet;
  };

  const handleUserAddTransaction = (amount: number, type: 'Credit' | 'Debit', method: string, status: 'Success' | 'Pending' | 'Failed') => {
    if (!loggedInUser) return;
    const userWallet = getUserWallet(loggedInUser.whatsapp, loggedInUser.username);
    
    const txnId = 'WTXN-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let bonus = 0;
    if (walletSettings.walletBonusEnabled && type === 'Credit' && status === 'Success') {
      bonus = amount * 0.05;
    }
    const finalAmount = amount + bonus;

    let balanceAfter = userWallet.balance;
    if (status === 'Success') {
      if (type === 'Credit') {
        balanceAfter += finalAmount;
      } else {
        balanceAfter -= finalAmount;
      }
    }

    const newTxn: WalletTransaction = {
      id: txnId,
      whatsapp: loggedInUser.whatsapp,
      username: loggedInUser.username,
      amount: amount,
      type,
      paymentMethod: method,
      status,
      balanceAfter,
      date: dateStr
    };

    setWalletTransactions(prev => [newTxn, ...prev]);

    if (status === 'Success') {
      setWallets(prev => prev.map(w => {
        if (w.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')) {
          return {
            ...w,
            balance: balanceAfter,
            totalAdded: type === 'Credit' ? w.totalAdded + amount : w.totalAdded,
            totalSpent: type === 'Debit' ? w.totalSpent + amount : w.totalSpent,
            lastRecharge: type === 'Credit' ? dateStr : w.lastRecharge
          };
        }
        return w;
      }));
      logWalletActivity(loggedInUser.whatsapp, type === 'Credit' ? 'Deposit' : 'Spend', `${type === 'Credit' ? 'Credited' : 'Debited'} ₹${finalAmount.toFixed(2)}${bonus > 0 ? ' (including 5% bonus ₹' + bonus.toFixed(2) + ')' : ''} to account. Txn: ${txnId}`);
    } else {
      logWalletActivity(loggedInUser.whatsapp, 'Deposit Request', `Submitted pending deposit request for ₹${amount.toFixed(2)}. Txn: ${txnId}`);
    }
  };

  const handleUpdateWallet = (whatsapp: string, balance: number, status: 'Active' | 'Frozen', type?: 'credit' | 'debit' | 'edit', amt?: number) => {
    setWallets(prev => {
      const normPhone = whatsapp.replace(/\s+/g, '');
      const exists = prev.some(w => w.whatsapp.replace(/\s+/g, '') === normPhone);
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (!exists) {
        const userRec = users.find(u => u.whatsapp.replace(/\s+/g, '') === normPhone);
        const username = userRec ? userRec.username : 'User';
        const newW: Wallet = {
          whatsapp,
          username,
          balance,
          totalAdded: type === 'credit' ? (amt || balance) : 0,
          totalSpent: type === 'debit' ? (amt || 0) : 0,
          lastRecharge: type === 'credit' ? dateStr : 'N/A',
          status
        };
        return [...prev, newW];
      }

      return prev.map(w => {
        if (w.whatsapp.replace(/\s+/g, '') === normPhone) {
          return {
            ...w,
            balance,
            status,
            totalAdded: type === 'credit' ? w.totalAdded + (amt || 0) : w.totalAdded,
            totalSpent: type === 'debit' ? w.totalSpent + (amt || 0) : w.totalSpent,
            lastRecharge: type === 'credit' ? dateStr : w.lastRecharge
          };
        }
        return w;
      });
    });

    const actionText = type ? `Balance ${type}` : `Status update`;
    const detailsText = type === 'credit' ? `Admin credited ₹${amt} to user balance` :
                        type === 'debit' ? `Admin debited ₹${amt} from user balance` :
                        type === 'edit' ? `Admin edited balance to exactly ₹${balance}` :
                        `Admin updated status to ${status}`;

    logWalletActivity(whatsapp, actionText, detailsText);
    
    if (type && amt) {
      const userRec = users.find(u => u.whatsapp.replace(/\s+/g, '') === whatsapp.replace(/\s+/g, ''));
      const username = userRec ? userRec.username : 'User';
      const newTxn: WalletTransaction = {
        id: 'WTXN-ADM-' + Math.floor(100000 + Math.random() * 900000),
        whatsapp,
        username,
        amount: amt,
        type: type === 'credit' ? 'Credit' : type === 'debit' ? 'Debit' : 'Credit',
        paymentMethod: 'Admin Override',
        status: 'Success',
        balanceAfter: balance,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      setWalletTransactions(prev => [newTxn, ...prev]);
    }
  };

  const handleUpdateWalletSettings = (newSettings: WalletSettings) => {
    setWalletSettings(newSettings);
  };

  const handleApproveTransaction = (txnId: string) => {
    setWalletTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        const targetWallet = getUserWallet(t.whatsapp, t.username);
        let bonus = 0;
        if (walletSettings.walletBonusEnabled) {
          bonus = t.amount * 0.05;
        }
        const finalCredit = t.amount + bonus;
        const newBal = targetWallet.balance + finalCredit;

        setWallets(wPrev => wPrev.map(w => {
          if (w.whatsapp.replace(/\s+/g, '') === t.whatsapp.replace(/\s+/g, '')) {
            return {
              ...w,
              balance: newBal,
              totalAdded: w.totalAdded + t.amount,
              lastRecharge: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
          }
          return w;
        }));

        logWalletActivity(t.whatsapp, 'Deposit Approved', `Admin approved deposit transaction ${txnId} for ₹${t.amount.toFixed(2)}${bonus > 0 ? ' (including 5% bonus ₹' + bonus.toFixed(2) + ')' : ''}. Balance after: ₹${newBal.toFixed(2)}`);
        return { ...t, status: 'Success', balanceAfter: newBal };
      }
      return t;
    }));
  };

  const handleRejectTransaction = (txnId: string) => {
    setWalletTransactions(prev => prev.map(t => {
      if (t.id === txnId) {
        logWalletActivity(t.whatsapp, 'Deposit Rejected', `Admin rejected pending deposit transaction ${txnId} for ₹${t.amount.toFixed(2)}`);
        return { ...t, status: 'Failed' };
      }
      return t;
    }));
  };

  const handleDeleteTransaction = (txnId: string) => {
    setWalletTransactions(prev => prev.filter(t => t.id !== txnId));
  };

  const handleClearTransactions = () => {
    if (confirm('Are you sure you want to permanently clear all wallet transaction logs? User balances will not be altered.')) {
      setWalletTransactions([]);
      logActivity('Wallet History Cleared', 'Admin cleared all historic wallet transaction statement entries');
    }
  };

  // --- WALLET RECHARGE REQUEST HANDLERS ---
  const handleSubmitRechargeRequest = (amount: number, utrNumber: string, contactMobile: string, remarks: string, paymentMethod: string, screenshot?: string) => {
    const duplicate = rechargeRequests.some(r => r.utrNumber.trim() === utrNumber.trim());
    if (duplicate) {
      throw new Error(`Duplicate UTR number detected! The UTR Number "${utrNumber}" has already been submitted for verification. Please verify and enter the correct UTR.`);
    }

    if (!loggedInUser) {
      throw new Error('User session not found. Please log in.');
    }

    const reqId = 'RECH' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newRequest: WalletRechargeRequest = {
      id: reqId,
      userId: loggedInUser.whatsapp,
      username: loggedInUser.username,
      rechargeAmount: amount,
      utrNumber: utrNumber.trim(),
      contactMobile: contactMobile.trim(),
      paymentMethod,
      remarks: remarks.trim() || undefined,
      screenshot: screenshot || undefined,
      status: 'Pending',
      createdAt: dateStr
    };

    setRechargeRequests(prev => [newRequest, ...prev]);
    logWalletActivity(loggedInUser.whatsapp, 'Recharge Requested', `Submitted a recharge request of ₹${amount} with UTR: ${utrNumber}. Request ID: ${reqId}`);
    logActivity('Wallet Recharge Request', `${loggedInUser.username} submitted a recharge request of ₹${amount} with UTR ${utrNumber}.`);
    
    return reqId;
  };

  const handleApproveRechargeRequest = (id: string, adminRemarks?: string) => {
    const request = rechargeRequests.find(r => r.id === id);
    if (!request) return;
    if (request.status !== 'Pending') {
      alert('This request is already processed!');
      return;
    }

    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const targetWallet = getUserWallet(request.userId, request.username);
    
    let bonus = 0;
    if (walletSettings.walletBonusEnabled) {
      bonus = request.rechargeAmount * 0.05;
    }
    const finalCredit = request.rechargeAmount + bonus;
    const newBal = targetWallet.balance + finalCredit;

    // Update wallet balance
    setWallets(prev => prev.map(w => {
      if (w.whatsapp.replace(/\s+/g, '') === request.userId.replace(/\s+/g, '')) {
        return {
          ...w,
          balance: newBal,
          totalAdded: w.totalAdded + request.rechargeAmount,
          lastRecharge: dateStr
        };
      }
      return w;
    }));

    // Create a Wallet Transaction record linked with recharge request
    const txnId = 'WTXN-' + Math.floor(100000 + Math.random() * 900000);
    const newTxn: WalletTransaction = {
      id: txnId,
      whatsapp: request.userId,
      username: request.username,
      amount: request.rechargeAmount,
      type: 'Credit',
      paymentMethod: request.paymentMethod,
      status: 'Success',
      balanceAfter: newBal,
      date: dateStr
    };
    setWalletTransactions(prev => [newTxn, ...prev]);

    // Update request status to Approved
    setRechargeRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Approved',
          approvedAt: dateStr,
          approvedBy: 'Admin',
          adminRemarks: adminRemarks || undefined
        };
      }
      return r;
    }));

    logWalletActivity(request.userId, 'Recharge Approved', `Admin approved recharge request ${id} (UTR: ${request.utrNumber}) for ₹${request.rechargeAmount.toFixed(2)}${bonus > 0 ? ' (including 5% bonus ₹' + bonus.toFixed(2) + ')' : ''}. Balance: ₹${newBal.toFixed(2)}`);
    logActivity('Recharge Approved', `Approved recharge request ${id} for ${request.username}. Credited ₹${finalCredit.toFixed(2)}.`);
  };

  const handleRejectRechargeRequest = (id: string, adminRemarks: string) => {
    const request = rechargeRequests.find(r => r.id === id);
    if (!request) return;
    if (request.status !== 'Pending') {
      alert('This request is already processed!');
      return;
    }

    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Update request status to Rejected
    setRechargeRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Rejected',
          adminRemarks: adminRemarks || 'Rejected by Admin'
        };
      }
      return r;
    }));

    logWalletActivity(request.userId, 'Recharge Rejected', `Admin rejected recharge request ${id} (UTR: ${request.utrNumber}) for ₹${request.rechargeAmount.toFixed(2)}. Reason: ${adminRemarks}`);
    logActivity('Recharge Rejected', `Rejected recharge request ${id} for ${request.username}. Reason: ${adminRemarks}`);
  };

  const handleDeleteRechargeRequest = (id: string) => {
    if (confirm('Are you sure you want to delete this recharge request record?')) {
      setRechargeRequests(prev => prev.filter(r => r.id !== id));
      logActivity('Recharge Req Deleted', `Deleted recharge request record ${id}.`);
    }
  };

  // --- CRUD DISPATCH SERVICES ---
  const handleAddService = (svc: Omit<Service, 'id'>) => {
    const nextId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;
    setServices(prev => [...prev, { ...svc, id: nextId }]);
  };

  const handleEditService = (svc: Service) => {
    setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
  };

  const handleDeleteService = (id: number) => {
    setServices(prev => prev.filter(s => s.id !== id));
    setPlans(prev => prev.filter(p => p.serviceId !== id)); // Cascade delete plans
  };

  const handleReorderServices = (list: Service[]) => {
    setServices(list);
  };

  // --- CRUD DISPATCH PLANS ---
  const handleAddPlan = (pl: Omit<Plan, 'id'>) => {
    const nextId = `plan-${Date.now()}`;
    setPlans(prev => [...prev, { ...pl, id: nextId }]);
  };

  const handleEditPlan = (pl: Plan) => {
    setPlans(prev => prev.map(p => p.id === pl.id ? pl : p));
  };

  const handleDeletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  // --- CRUD DISPATCH ORDERS ---
  const handleUpdateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // --- CRUD DISPATCH BANNERS ---
  const handleAddBanner = (ban: Omit<Banner, 'id'>) => {
    const nextId = `ban-${Date.now()}`;
    setBanners(prev => [...prev, { ...ban, id: nextId }]);
  };

  const handleEditBanner = (ban: Banner) => {
    setBanners(prev => prev.map(b => b.id === ban.id ? ban : b));
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  // --- SYSTEM PRESET RESTORERS ---
  const handleClearCache = () => {
    localStorage.removeItem('zyro_services');
    localStorage.removeItem('zyro_plans');
    localStorage.removeItem('zyro_settings');
    localStorage.removeItem('zyro_orders');
    localStorage.removeItem('zyro_banners');
    localStorage.removeItem('zyro_activity_logs');
    
    setServices(INITIAL_SERVICES);
    setPlans(INITIAL_PLANS);
    setSettings(INITIAL_SETTINGS);
    setOrders(INITIAL_ORDERS);
    setBanners(INITIAL_BANNERS);
    setActivityLogs(INITIAL_ACTIVITIES);
    
    logActivity('System Reset', 'Local storage tables cleared and reseeded');
    alert('System Cache cleared and restored to default presets!');
  };

  const handleBackupDatabase = () => {
    const dbPayload = {
      services,
      plans,
      settings,
      orders,
      banners,
      activityLogs
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dbPayload, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `zyrohub_db_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreDatabase = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.services && parsed.plans && parsed.settings) {
        setServices(parsed.services);
        setPlans(parsed.plans);
        setSettings(parsed.settings);
        if (parsed.orders) setOrders(parsed.orders);
        if (parsed.banners) setBanners(parsed.banners);
        if (parsed.activityLogs) setActivityLogs(parsed.activityLogs);
        
        logActivity('DB Restore', 'Database table variables restored successfully from backup file');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // --- ICON RENDER HELPERS ---
  const renderServiceIcon = (type: string, className = "w-full h-full") => {
    if (type.startsWith('data:image') || type.startsWith('http')) {
      return (
        <img
          src={type}
          alt="custom icon"
          className={`${className} object-cover`}
          referrerPolicy="no-referrer"
        />
      );
    }

    switch (type) {
      case 'guild_glorry':
        return (
          <div className={`${className} bg-gradient-to-br from-[#FF416C] to-[#FF4B2B] flex items-center justify-center p-2 rounded-xl shadow-inner`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow">
              <path d="M50 20 L80 32 V58 C80 73 50 85 50 85 C50 85 20 73 20 58 V32 L50 20 Z" fill="#FFEAA7" opacity="0.25" />
              <path d="M50 25 L73 34 V54 C73 66 50 76 50 76 C50 76 27 66 27 54 V34 L50 25 Z" fill="#FFD700" />
              <path d="M38 52 L44 42 L50 47 L56 42 L62 52 H38 Z" fill="#D63031" />
              <circle cx="50" cy="34" r="5" fill="#D63031" />
            </svg>
          </div>
        );
      case 'dripclient':
        return (
          <div className={`${className} bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] flex items-center justify-center p-2 rounded-xl shadow-inner`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
              <circle cx="50" cy="50" r="32" stroke="#E100FF" strokeWidth="3" strokeDasharray="6 6" />
              <rect x="35" y="35" width="30" height="30" rx="6" fill="#FFFFFF" />
              <circle cx="50" cy="50" r="6" fill="#4A00E0" />
              <path d="M50 15 V35 M50 65 V85 M15 50 H35 M65 50 H85" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'prime_hook':
        return (
          <div className={`${className} bg-gradient-to-br from-[#11998e] to-[#38ef7d] flex items-center justify-center p-2 rounded-xl shadow-inner`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect x="20" y="20" width="60" height="60" rx="10" fill="#0A2E24" />
              <path d="M32 40 L45 50 L32 60" stroke="#38ef7d" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="52" y1="60" x2="68" y2="60" stroke="#38ef7d" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'hg_cheat':
        return (
          <div className={`${className} bg-gradient-to-br from-[#00c6ff] to-[#0072ff] flex items-center justify-center p-2 rounded-xl shadow-inner`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
              <circle cx="50" cy="50" r="30" stroke="#FFFFFF" strokeWidth="4" />
              <circle cx="50" cy="50" r="16" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
              <path d="M50 10 V90 M10 50 H90" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" />
            </svg>
          </div>
        );
      case 'instagram':
        return (
          <div className={`${className} bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] flex items-center justify-center p-2 rounded-xl shadow-sm`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-white" strokeWidth="6">
              <rect x="22" y="22" width="56" height="56" rx="16" />
              <circle cx="50" cy="50" r="15" />
              <circle cx="66" cy="34" r="2.5" fill="#FFFFFF" />
            </svg>
          </div>
        );
      case 'youtube':
        return (
          <div className={`${className} bg-[#FF0000] flex items-center justify-center p-3 rounded-xl shadow-sm`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-white">
              <path d="M92 31 C92 24 86 18 79 18 C65 17 35 17 21 18 C14 18 8 24 8 31 C7 41 7 59 8 69 C8 76 14 82 21 82 C35 83 65 83 79 82 C86 82 92 76 92 69 C93 59 93 41 92 31 Z" />
              <path d="M41 38 L65 50 L41 62 V38 Z" fill="#FF0000" />
            </svg>
          </div>
        );
      case 'telegram':
        return (
          <div className={`${className} bg-[#229ED9] flex items-center justify-center p-2.5 rounded-xl shadow-sm`}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-white">
              <path d="M85 22 L15 48 C13 49 13 52 16 53 L33 58 L73 33 C75 32 76 33 75 34 L42 63 L40 78 C40 80 42 81 44 79 L53 70 L69 82 C71 83 73 82 74 79 L89 25 C90 23 88 21 85 22 Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`${className} bg-slate-900 flex items-center justify-center text-white text-xs font-bold`}>
            {type.substring(0, 2).toUpperCase()}
          </div>
        );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const navigateToService = (id: number) => {
    setSelectedServiceId(id);
    setActiveFilter('All');
    setPage('service_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyNow = (plan: Plan, service: Service) => {
    setSelectedPlan(plan);
    setPaymentService(service);
    
    // Clear or prefill previous checkout input fields
    setCustName(loggedInUser ? loggedInUser.username : '');
    setCustWhatsApp(loggedInUser ? loggedInUser.whatsapp : '');
    setCheckoutMethod(walletSettings.walletEnabled ? 'selection' : 'upi');
    setUpiUtr('');
    setUpiContact('');
    setUpiRemarks('');
    setIsSubmittingOrder(false);
    setCheckoutSuccess(false);
    setGeneratedOrderId('');
    setWalletConfirmPay(false);
    
    setShowPaymentModal(true);
  };
 
  // ZapUPI Order payment handler
  const [isRedirectingToZapUpi, setIsRedirectingToZapUpi] = useState(false);

  const handlePayViaZapUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !paymentService) return;

    if (!custName.trim() || !custWhatsApp.trim()) {
      alert('Please enter your Name and WhatsApp Contact Number to continue.');
      return;
    }

    setIsRedirectingToZapUpi(true);

    try {
      const res = await fetch('/api/payment/zapupi/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPlan.price,
          customer_name: custName,
          customer_mobile: custWhatsApp,
          plan_id: selectedPlan.id,
          service_id: paymentService.id,
          is_wallet_recharge: false
        })
      });

      if (!res.ok) {
        let errMsg = 'Failed to initiate ZapUPI transaction';
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = `${errMsg}: ${errData.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.status === 'success' && data.payment_url) {
        setPaymentRedirector({
          url: data.payment_url,
          amount: selectedPlan.price,
          customerName: custName,
          customerMobile: custWhatsApp,
          orderId: data.order_id || undefined
        });
        setIsRedirectingToZapUpi(false);
      } else {
        throw new Error(data.message || 'Unknown response from ZapUPI server');
      }
    } catch (err: any) {
      alert(err.message || 'Unable to connect to payment gateway. Please try again.');
      setIsRedirectingToZapUpi(false);
    }
  };

  const handleHomepageUpiPay = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(homepageUpiAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount to pay.');
      return;
    }

    if (amountNum < walletSettings.minRecharge || amountNum > walletSettings.maxRecharge) {
      alert(`Amount must be between ₹${walletSettings.minRecharge} and ₹${walletSettings.maxRecharge}`);
      return;
    }

    let customerName = '';
    let customerMobile = '';

    if (loggedInUser) {
      customerName = loggedInUser.username;
      customerMobile = loggedInUser.whatsapp;
    } else {
      if (!guestUpiName.trim() || !guestUpiMobile.trim()) {
        alert('Please fill out both Name and WhatsApp Number to make the payment.');
        return;
      }
      
      const mobileTrimmed = guestUpiMobile.trim().replace(/\D/g, '');
      if (mobileTrimmed.length !== 10) {
        alert('WhatsApp Number must be exactly 10 digits.');
        return;
      }

      customerName = guestUpiName.trim();
      customerMobile = mobileTrimmed;
    }

    setIsRedirectingToHomepageZapUpi(true);

    try {
      const res = await fetch('/api/payment/zapupi/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          customer_name: customerName,
          customer_mobile: customerMobile,
          is_wallet_recharge: true
        })
      });

      if (!res.ok) {
        let errMsg = 'Failed to initiate ZapUPI transaction';
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = `${errMsg}: ${errData.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.status === 'success' && data.payment_url) {
        setPaymentRedirector({
          url: data.payment_url,
          amount: amountNum,
          customerName: customerName,
          customerMobile: customerMobile,
          orderId: data.order_id || undefined
        });
        setIsRedirectingToHomepageZapUpi(false);
      } else {
        throw new Error(data.message || 'Unknown response from ZapUPI server');
      }
    } catch (err: any) {
      alert(err.message || 'Unable to connect to payment gateway. Please try again.');
      setIsRedirectingToHomepageZapUpi(false);
    }
  };
 
  // Submit Order Form
  const handleClientOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !paymentService) return;
 
    if (!custName.trim() || !custWhatsApp.trim()) {
      alert('Please fill out all order verification fields before proceeding!');
      return;
    }

    if (checkoutMethod === 'upi') {
      const trimmedUtr = upiUtr.trim();
      const trimmedContact = upiContact.trim();
      
      // Check if UTR is numeric / alphanumeric and 12-30 characters
      if (!trimmedUtr) {
        alert('UTR Number is required.');
        return;
      }
      const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(trimmedUtr);
      if (!isAlphanumeric) {
        alert('UTR Number must contain only numbers or alphabets.');
        return;
      }
      if (trimmedUtr.length < 12 || trimmedUtr.length > 30) {
        alert('UTR Number must be between 12 and 30 characters.');
        return;
      }

      // Check if Contact Mobile is numeric and exactly 10 digits
      if (!trimmedContact) {
        alert('Contact Mobile Number is required.');
        return;
      }
      const isNumeric = /^[0-9]+$/.test(trimmedContact);
      if (!isNumeric) {
        alert('Contact Mobile Number must be numeric only.');
        return;
      }
      if (trimmedContact.length !== 10) {
        alert('Contact Mobile Number must be exactly 10 digits.');
        return;
      }
    }
 
    setIsSubmittingOrder(true);
 
    setTimeout(() => {
      const ordId = `ORD${Math.floor(10000 + Math.random() * 90000)}`;
      const newOrder: Order = {
        id: ordId,
        customerName: custName,
        whatsapp: custWhatsApp,
        serviceId: paymentService.id,
        planId: selectedPlan.id,
        serviceName: paymentService.name,
        planName: selectedPlan.name,
        duration: selectedPlan.duration,
        transactionId: checkoutMethod === 'upi' ? upiUtr.trim() : 'N/A',
        amount: selectedPlan.price,
        status: checkoutMethod === 'upi' ? 'Pending Verification' : 'Pending',
        paymentMethod: checkoutMethod === 'upi' ? 'UPI' : 'Wallet',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
 
      setOrders(prev => [newOrder, ...prev]);
      logActivity('Order Placed', `Order ${ordId} submitted by customer ${custName} via UPI. UTR: ${checkoutMethod === 'upi' ? upiUtr.trim() : 'N/A'}`);
 
      setGeneratedOrderId(ordId);
      setCheckoutSuccess(true);
      setIsSubmittingOrder(false);
    }, 600);
  };

  // --- USER PROFILE & SESSION LOGIC ---
  const handleUserSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authName.trim() || !authWhatsApp.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all signup fields.');
      return;
    }

    const normalizedWhatsApp = authWhatsApp.trim();
    if (users.some(u => u.whatsapp === normalizedWhatsApp)) {
      setAuthError('An account with this WhatsApp number already exists!');
      return;
    }

    const newUser = {
      username: authName.trim(),
      whatsapp: normalizedWhatsApp,
      password: authPassword,
      dateJoined: new Date().toISOString().replace('T', ' ').substring(0, 10)
    };

    setUsers(prev => [...prev, newUser]);
    setLoggedInUser({ username: newUser.username, whatsapp: newUser.whatsapp });
    setAuthSuccess('Registration successful! Logging in...');
    logActivity('User Sign-Up', `New user registered with GPay name: ${newUser.username}`);

    setAuthName('');
    setAuthWhatsApp('');
    setAuthPassword('');

    setCustName(newUser.username);
    setCustWhatsApp(newUser.whatsapp);

    setTimeout(() => {
      setAuthSuccess('');
      setPage('home');
    }, 1200);
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authWhatsApp.trim() || !authPassword.trim()) {
      setAuthError('Please enter both WhatsApp number and password.');
      return;
    }

    const normalizedWhatsApp = authWhatsApp.trim();
    const foundUser = users.find(u => u.whatsapp === normalizedWhatsApp);

    if (!foundUser) {
      setAuthError('Account not found with this WhatsApp number.');
      return;
    }

    if (foundUser.password !== authPassword) {
      setAuthError('Incorrect password. Please try again!');
      return;
    }

    setLoggedInUser({ username: foundUser.username, whatsapp: foundUser.whatsapp });
    setAuthSuccess('Login successful! Welcome back...');
    logActivity('User Login', `User ${foundUser.username} logged in successfully`);

    setAuthWhatsApp('');
    setAuthPassword('');

    setCustName(foundUser.username);
    setCustWhatsApp(foundUser.whatsapp);

    setTimeout(() => {
      setAuthSuccess('');
      setPage('home');
    }, 1200);
  };

  const handleUserLogout = () => {
    if (loggedInUser) {
      logActivity('User Logout', `User ${loggedInUser.username} logged out`);
    }
    setLoggedInUser(null);
    setCustName('');
    setCustWhatsApp('');
    setPage('home');
  };

  // Filter out disabled services
  const enabledServices = services
    .filter(s => s.status === 'Enabled')
    .sort((a, b) => a.order - b.order);

  const currentService = services.find(s => s.id === selectedServiceId) || enabledServices[0] || services[0];
  const activePlansForCurrentService = plans.filter(p => p.serviceId === currentService?.id && p.status === 'Active');

  // --- RENDER SCREEN DISPATCH ---
  if (isAdminMode) {
    return (
      <AdminConsole
        services={services}
        plans={plans}
        orders={orders}
        banners={banners}
        settings={settings}
        activityLogs={activityLogs}
        
        users={users}
        wallets={wallets}
        transactions={walletTransactions}
        walletSettings={walletSettings}
        walletLogs={walletLogs}
        rechargeRequests={rechargeRequests}
        onUpdateWallet={handleUpdateWallet}
        onUpdateWalletSettings={handleUpdateWalletSettings}
        onApproveTransaction={handleApproveTransaction}
        onRejectTransaction={handleRejectTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onClearTransactions={handleClearTransactions}
        onApproveRechargeRequest={handleApproveRechargeRequest}
        onRejectRechargeRequest={handleRejectRechargeRequest}
        onDeleteRechargeRequest={handleDeleteRechargeRequest}
        
        onAddService={handleAddService}
        onEditService={handleEditService}
        onDeleteService={handleDeleteService}
        onReorderServices={handleReorderServices}
        
        onAddPlan={handleAddPlan}
        onEditPlan={handleEditPlan}
        onDeletePlan={handleDeletePlan}
        
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        
        onAddBanner={handleAddBanner}
        onEditBanner={handleEditBanner}
        onDeleteBanner={handleDeleteBanner}
        
        onUpdateSettings={setSettings}
        onClearCache={handleClearCache}
        onBackupDatabase={handleBackupDatabase}
        onRestoreDatabase={handleRestoreDatabase}
        onLogActivity={logActivity}
        onCloseAdmin={() => setIsAdminMode(false)}
        
        renderServiceIcon={renderServiceIcon}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] py-0 md:py-8 flex items-start justify-center transition-all duration-300">
      
      {/* Center Simulated Frame */}
      <div id="mobile-device-frame" className="w-full max-w-md bg-[#F4F6F9] min-h-screen md:min-h-[850px] md:max-h-[920px] md:rounded-[36px] md:shadow-2xl md:border-8 md:border-[#0F172A] relative flex flex-col overflow-y-auto no-scrollbar transition-all duration-200">
        
        {/* Top Announcement Bar */}
        {settings.announcementEnabled && settings.announcementText && (
          <div
            id="top-offer-bar"
            style={{
              backgroundColor: settings.announcementBgColor,
              color: settings.announcementTextColor
            }}
            className="text-center py-2 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shrink-0 select-none animate-pulse-slow"
          >
            <span>{settings.announcementText}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: USER HOMEPAGE                                         */}
        {/* ------------------------------------------------------------- */}
        {page === 'home' && (
          <div id="home-view-scrollable" className="flex-1 flex flex-col pb-8">
            
            {/* Header section with branding */}
            <header id="home-app-header" className="bg-white px-4 py-4 rounded-b-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                {/* Brand Logo - Secret Admin Mode Entry */}
                <div
                  onClick={() => {
                    setLogoClicks(prev => {
                      const next = prev + 1;
                      if (next >= 5) {
                        setIsAdminMode(true);
                        return 0;
                      }
                      return next;
                    });
                  }}
                  className="w-9 h-9 rounded-full bg-[#22c55e] flex items-center justify-center text-white font-extrabold text-[12px] shadow-sm select-none cursor-pointer active:scale-95 transition-transform overflow-hidden shrink-0"
                  title={settings.brandName || "ZH"}
                >
                  {settings.websiteLogoUrl ? (
                    <img
                      src={settings.websiteLogoUrl}
                      alt={settings.brandName || "Logo"}
                      className="w-full h-full object-cover animate-fade-in"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    settings.brandName ? settings.brandName.substring(0, 2).toUpperCase() : 'ZH'
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <h1 className="text-slate-800 font-extrabold text-[12px] xs:text-[13px] tracking-wide uppercase line-clamp-1 max-w-[170px]">
                    {settings.brandName}
                  </h1>
                  {/* Verified check badge */}
                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 bg-[#22c55e] rounded text-white text-[9px] font-bold shadow-sm select-none">
                    <i className="fa-solid fa-check"></i>
                  </span>
                </div>
              </div>

              {/* Navigation button or profile state */}
              <button
                onClick={() => setPage('profile')}
                className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
              >
                <i className="fa-regular fa-user text-slate-500 text-[10px]"></i>
                <span>Account</span>
              </button>
            </header>

            {/* Home Content Body */}
            <main className="flex-1 px-4 py-6 flex flex-col gap-5">
              
              {/* Dynamic Welcome Heading */}
              <section id="welcome-info-card" className="text-center mt-2 flex flex-col items-center">
                <p className="text-slate-500 font-extrabold tracking-widest text-[11px] mb-1 uppercase">
                  HI WELCOME TO
                </p>
                <h2 className="text-slate-900 font-black text-2xl tracking-tight leading-tight uppercase max-w-[320px]">
                  {settings.brandName}
                </h2>
                
                {/* 1™ check badge banner */}
                <div className="flex items-center justify-center gap-2 mt-2 mb-4">
                  <span className="text-slate-900 font-black text-3xl leading-none">1™</span>
                  <div className="w-8 h-8 bg-[#2ce157] rounded-lg flex items-center justify-center text-white text-lg font-black shadow-md shadow-green-100 select-none">
                    <i className="fa-solid fa-check stroke-[3]"></i>
                  </div>
                </div>

                {/* Split text by spaces/lines to replicate the screenshot subtitle details */}
                <p className="text-slate-500 font-extrabold text-[11px] xs:text-[12.5px] tracking-wide leading-relaxed uppercase max-w-[330px]">
                  {settings.homepageSubHeading}
                </p>
              </section>

              {/* Online Users Count Indicator */}
              <div className="flex justify-center my-1 select-none">
                <div className="inline-flex items-center gap-2 bg-[#E6F9ED] border border-[#DCFCE7] px-4 py-1.5 rounded-full shadow-[0_3px_10px_rgba(34,197,94,0.08)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
                  </span>
                  <span className="text-[#15803D] font-extrabold text-xs">
                    {onlineUsers.toLocaleString()} users online right now
                  </span>
                </div>
              </div>

              {/* CTA Navigation Buttons */}
              <div id="quick-action-buttons" className="flex flex-col gap-3.5 mt-2 select-none">
                
                {/* Helpline Support */}
                <button
                  id="btn-customer-support"
                  onClick={() => setShowSupportModal(true)}
                  className="bg-[#22C55E] hover:bg-[#1fbd58] active:scale-[0.98] text-white py-3.5 px-6 rounded-[18px] font-bold text-sm tracking-wide shadow-lg shadow-green-100 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer"
                >
                  <i className="fa-solid fa-comment-dots text-base"></i>
                  <span>{settings.supportButtonText}</span>
                </button>

                {/* Join Whatsapp channel/group */}
                <button
                  id="btn-whatsapp-group"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="bg-white hover:bg-slate-50 active:scale-[0.98] text-[#22C55E] border-2 border-[#22C55E] py-3.5 px-6 rounded-[18px] font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer"
                >
                  <i className="fa-solid fa-user-group text-sm"></i>
                  <span>{settings.joinButtonText}</span>
                </button>

                {/* Pay via UPI / QR Code Toggle Button */}
                <button
                  id="btn-pay-upi-toggle"
                  onClick={() => setShowHomepageUpiForm(!showHomepageUpiForm)}
                  className="bg-gradient-to-r from-[#035240] to-[#0a7a67] hover:brightness-105 active:scale-[0.98] text-white py-3.5 px-6 rounded-[18px] font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer w-full"
                >
                  <i className="fa-solid fa-qrcode text-sm"></i>
                  <span>{settings.upiButtonText}</span>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ml-1 ${showHomepageUpiForm ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Custom UPI Payment Amount Selector & Pay Widget nested inside */}
                {showHomepageUpiForm && (
                  <form
                    onSubmit={handleHomepageUpiPay}
                    className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-[22px] flex flex-col gap-3 shadow-xs select-none mt-1 text-left animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0a7a67] flex items-center justify-center">
                        <i className="fa-solid fa-qrcode text-sm"></i>
                      </div>
                      <span className="font-extrabold text-[11.5px] uppercase tracking-wider text-slate-700">
                        Direct UPI Payment
                      </span>
                    </div>

                    {/* Preset Amount Options */}
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 font-extrabold text-[8px] uppercase tracking-widest">
                        Select Preset Amount
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[100, 250, 500, 1000].map((preset) => {
                          const isSelected = parseFloat(homepageUpiAmount) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setHomepageUpiAmount(preset.toString())}
                              className={`py-2 px-1 text-center rounded-xl font-black text-xs font-mono transition-all duration-150 cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#035240] to-[#0a7a67] text-white shadow-xs'
                                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                              }`}
                            >
                              ₹{preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Guest Input Fields (Only visible when user is not logged in) */}
                    {!loggedInUser && (
                      <div className="flex flex-col gap-2 bg-white/60 p-2.5 rounded-xl border border-slate-150 mt-0.5">
                        <span className="text-slate-400 font-extrabold text-[8px] uppercase tracking-widest">
                          Enter Billing Details
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="Your Name"
                              value={guestUpiName}
                              onChange={(e) => setGuestUpiName(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-slate-800 text-[11px] font-bold focus:outline-none focus:border-green-500"
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="WhatsApp No."
                              value={guestUpiMobile}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setGuestUpiMobile(val);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-slate-800 text-[11px] font-bold focus:outline-none focus:border-green-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Amount Entry and Payment Submit Button */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-black text-xs font-mono pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={walletSettings.minRecharge}
                          max={walletSettings.maxRecharge}
                          required
                          placeholder="Amount"
                          value={homepageUpiAmount}
                          onChange={(e) => setHomepageUpiAmount(e.target.value)}
                          className="w-full pl-7.5 pr-2.5 bg-white border border-slate-200 rounded-xl py-2.5 text-slate-800 text-xs font-black focus:outline-none focus:border-green-500 font-mono text-left"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isRedirectingToHomepageZapUpi}
                        className="bg-gradient-to-r from-[#035240] to-[#0a7a67] hover:brightness-105 active:scale-[0.98] text-white py-2.5 px-5 rounded-xl font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-75"
                      >
                        {isRedirectingToHomepageZapUpi ? (
                          <>
                            <i className="fa-solid fa-circle-notch animate-spin text-xs"></i>
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-regular fa-credit-card text-xs"></i>
                            <span>Pay Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

              </div>

              {/* Dynamic Service Title Divider */}
              <div className="flex items-center gap-2.5 pl-1 mt-6">
                <div className="w-[5px] h-6 bg-[#22C55E] rounded-full"></div>
                <h3 className="text-slate-800 font-black tracking-wide text-md uppercase">
                  {settings.servicesTitle}
                </h3>
              </div>

              {/* Services List cards */}
              <div id="services-cards-list" className="flex flex-col gap-3">
                {enabledServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="bg-white rounded-[20px] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-[#F1F5F9] flex items-center justify-between hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 shrink-0 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center border border-slate-50">
                        {renderServiceIcon(svc.iconType)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-slate-800 font-bold text-[13px] tracking-wide uppercase line-clamp-1 max-w-[170px]">
                            {svc.name}
                          </h4>
                          {svc.verified && (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-[#22c55e] rounded text-white text-[7.5px] font-bold select-none">
                              <i className="fa-solid fa-check"></i>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 font-semibold text-[10px] tracking-wider uppercase mt-0.5">
                          {svc.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigateToService(svc.id)}
                      className="bg-[#EBFDF2] hover:bg-[#DCFCE7] text-[#22c55e] font-extrabold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors duration-150 select-none"
                    >
                      <span>Plans</span>
                      <i className="fa-solid fa-play text-[7px] ml-0.5"></i>
                    </button>
                  </div>
                ))}
              </div>

            </main>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: PLANS DETAILS                                         */}
        {/* ------------------------------------------------------------- */}
        {page === 'service_detail' && (
          <div id="service-detail-view" className="flex-1 flex flex-col pb-8">
            
            {/* Page Header */}
            <header id="detail-app-header" className="bg-white px-4 py-4.5 rounded-b-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage('home')}
                  className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 flex items-center justify-center text-slate-700 transition-all duration-150 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-left text-[15px]"></i>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-lg overflow-hidden shadow-sm shrink-0 bg-slate-50 flex items-center justify-center border border-slate-50">
                    {renderServiceIcon(currentService?.iconType || 'dripclient')}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <h2 className="text-slate-800 font-extrabold text-[12px] xs:text-[13px] tracking-wide uppercase line-clamp-1 max-w-[100px] xs:max-w-[140px]">
                        {currentService?.name}
                      </h2>
                      {currentService?.verified && (
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#22c55e] rounded text-white text-[8px] font-bold select-none">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 font-semibold text-[10px] tracking-wider uppercase mt-0.5">
                      {currentService?.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile navigation */}
              <button
                onClick={() => setPage('profile')}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-800 px-3 py-1.5 rounded-full text-[11.5px] font-bold tracking-wide transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
                title="Account"
              >
                <i className="fa-regular fa-user text-slate-500 text-[10px]"></i>
                <span>Account</span>
              </button>
            </header>

            {/* Plans Body list */}
            <main className="flex-1 px-4 py-5 flex flex-col gap-5">
              
              {/* Category selector slider */}
              <div id="category-filters-scroll" className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none">
                {['All', '3 DAYS', '7 DAYS', '14 DAYS', '15 DAYS', '30 DAYS', '365 DAYS'].map((filter) => {
                  const isActive = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#22c55e] text-white shadow-sm shadow-green-100'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>

              {/* Grid map */}
              <div id="plans-cards-grid" className="flex flex-col gap-4">
                {activePlansForCurrentService
                  .filter(p => activeFilter === 'All' || p.category === activeFilter)
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-white rounded-[24px] p-4.5 shadow-[0_4px_18px_rgba(0,0,0,0.03)] border border-[#F1F5F9] flex flex-col gap-4.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        
                        <div className="flex items-start gap-3">
                          <div className="w-13 h-13 shrink-0 rounded-xl overflow-hidden shadow-inner mt-0.5 bg-slate-50 flex items-center justify-center border border-slate-100">
                            {renderServiceIcon(currentService.iconType)}
                          </div>
                          <div className="flex flex-col">
                            <span className="inline-block bg-slate-100 text-slate-500 font-extrabold text-[9px] px-2 py-0.5 rounded-md w-fit mb-1.5 uppercase select-none">
                              {plan.duration}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-slate-800 font-bold text-[13px] tracking-wide leading-snug uppercase line-clamp-1 max-w-[150px] xs:max-w-[180px]">
                                {plan.name}
                              </h3>
                              {currentService.verified && (
                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-[#22c55e] rounded text-white text-[7px] font-bold select-none">
                                  <i className="fa-solid fa-check"></i>
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 font-semibold text-[11px] mt-0.5">
                              Qty: {plan.qty}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col justify-center">
                          <span className="text-[#22c55e] font-black text-lg xs:text-xl leading-none">
                            ₹{plan.price}
                          </span>
                          <span className="text-slate-400 font-bold text-xs line-through mt-1">
                            ₹{plan.oldPrice}
                          </span>
                        </div>

                      </div>

                      {plan.videoUrl && (
                        <PlanVideoPlayer
                          videoUrl={plan.videoUrl}
                          videoFileSize={plan.videoFileSize}
                          videoFileName={plan.videoFileName}
                          videoFrameRate={plan.videoFrameRate}
                        />
                      )}

                      {/* Dynamic BUY NOW action */}
                      <button
                        onClick={() => handleBuyNow(plan, currentService)}
                        className="w-full bg-[#0B1528] hover:bg-[#12213D] active:scale-[0.98] text-white py-3.5 px-5 rounded-[16px] font-bold text-sm tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <span>{settings.buyButtonText}</span>
                        <i className="fa-solid fa-chevron-right text-[10px] ml-0.5"></i>
                      </button>

                    </div>
                  ))}

                {activePlansForCurrentService.filter(p => activeFilter === 'All' || p.category === activeFilter).length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border border-[#F1F5F9] select-none">
                    <i className="fa-solid fa-folder-open text-slate-300 text-3xl mb-2"></i>
                    <p className="text-slate-400 text-sm font-semibold uppercase">No plans available.</p>
                  </div>
                )}
              </div>

            </main>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: MY ORDERS                                             */}
        {/* ------------------------------------------------------------- */}
        {page === 'orders' && (
          <div id="orders-page" className="flex-1 flex flex-col pb-8 animate-in fade-in duration-200">
            {/* Header */}
            <header className="bg-white px-4 py-4.5 rounded-b-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage('home')}
                  className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 flex items-center justify-center text-slate-700 transition-all duration-150 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-left text-[15px]"></i>
                </button>
                <h2 className="text-slate-800 font-black text-xs uppercase tracking-wider">
                  My Orders Panel
                </h2>
              </div>
              <button
                onClick={() => setPage('profile')}
                className="flex items-center gap-1 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide cursor-pointer"
              >
                <i className="fa-regular fa-user text-slate-500 text-[10px]"></i>
                <span>Account</span>
              </button>
            </header>

            <main className="flex-1 px-4 py-5 flex flex-col gap-4">
              {loggedInUser ? (
                /* LOGGED IN USER ORDERS */
                <div className="flex flex-col gap-4">
                  <div className="bg-[#E6F9ED] border border-[#DCFCE7] p-4 rounded-2xl flex items-center gap-3 select-none">
                    <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-md font-bold">
                      {loggedInUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h4 className="text-slate-800 font-extrabold text-xs uppercase">Hello, {loggedInUser.username}</h4>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">Tracking your orders in real-time</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {orders.filter(o => 
                      o.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '') || 
                      o.customerName.toLowerCase() === loggedInUser.username.toLowerCase()
                    ).length > 0 ? (
                      orders.filter(o => 
                        o.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '') || 
                        o.customerName.toLowerCase() === loggedInUser.username.toLowerCase()
                      ).map((order) => {
                        const svcObj = services.find(s => s.id === order.serviceId);
                        return (
                          <div key={order.id} className="bg-white border border-[#F1F5F9] rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] transition-all duration-150">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg shrink-0 bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden">
                                  {renderServiceIcon(svcObj?.iconType || 'dripclient')}
                                </div>
                                <div className="text-left">
                                  <h4 className="text-slate-800 font-extrabold text-xs uppercase line-clamp-1 max-w-[150px]">{order.serviceName}</h4>
                                  <span className="inline-block bg-slate-100 text-slate-500 font-bold text-[8px] px-1.5 py-0.5 rounded uppercase mt-0.5">{order.planName} ({order.duration})</span>
                                </div>
                              </div>
                              <span className="text-slate-800 font-black text-sm">₹{order.amount}</span>
                            </div>

                            <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                              <div className="text-left">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Order ID & Date</span>
                                <span className="text-slate-700 font-mono text-[10px] font-bold uppercase block mt-0.5">{order.id}</span>
                                <span className="text-slate-400 font-mono text-[8px] block">{order.date}</span>
                              </div>

                              <div className="text-right">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-1">Status</span>
                                {order.status === 'Pending' && <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase px-2 py-1 rounded-md">Pending</span>}
                                {order.status === 'Processing' && <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase px-2 py-1 rounded-md">Processing</span>}
                                {order.status === 'Completed' && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase px-2 py-1 rounded-md">Completed</span>}
                                {order.status === 'Cancelled' && <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase px-2 py-1 rounded-md">Cancelled</span>}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const msg = encodeURIComponent(`Hi Admin, my Order ID is ${order.id}. Please review my transaction!`);
                                const rawNum = settings.supportNumber.replace(/\D/g, '');
                                window.open(`https://wa.me/${rawNum || '918015342606'}?text=${msg}`, '_blank');
                              }}
                              className="w-full bg-[#F1F5F9] hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 hover:border-emerald-200"
                            >
                              <i className="fa-brands fa-whatsapp text-xs"></i>
                              <span>Contact Support For Order</span>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-[#F1F5F9] px-6 select-none">
                        <i className="fa-solid fa-receipt text-slate-300 text-4xl mb-3"></i>
                        <h4 className="text-slate-700 font-bold text-xs uppercase">No orders registered yet!</h4>
                        <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-1 max-w-[220px] mx-auto uppercase text-center">Any orders placed under your account credentials will display here.</p>
                        <button
                          onClick={() => setPage('home')}
                          className="mt-4 bg-[#22C55E] hover:bg-[#1fbd58] text-white py-2 px-4 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Browse Services
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* GUEST LOOKUP PANEL & PROMPT */
                <div className="flex flex-col gap-5">
                  <div className="bg-white border border-[#F1F5F9] rounded-[24px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 text-lg mx-auto">
                      <i className="fa-solid fa-user-lock"></i>
                    </div>
                    <div>
                      <h4 className="text-slate-800 font-black text-xs uppercase">Account Sign In Required</h4>
                      <p className="text-slate-400 text-[10.5px] font-medium leading-relaxed uppercase mt-1 max-w-[240px] mx-auto text-center">
                        To store your orders permanently, please log in or register.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setPage('profile');
                      }}
                      className="w-full bg-[#0B1528] hover:bg-[#12213D] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      Sign In / Sign Up
                    </button>
                  </div>

                  {/* QUICK GUEST SEARCH LOOKUP */}
                  <div className="bg-white border border-[#F1F5F9] rounded-[24px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
                      <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                      <h4 className="text-slate-800 font-black text-[10.5px] uppercase tracking-wider text-left">Quick Order Tracker</h4>
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WhatsApp Contact Number</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={trackWhatsApp}
                          onChange={(e) => setTrackWhatsApp(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 font-mono"
                        />
                      </div>
                    </div>

                    {trackWhatsApp.trim() && (
                      <div className="flex flex-col gap-3.5 mt-2">
                        {orders.filter(o => o.whatsapp.replace(/\s+/g, '') === trackWhatsApp.trim().replace(/\s+/g, '')).length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <h5 className="text-[#22C55E] font-black text-[9px] uppercase tracking-wider text-left">Found {orders.filter(o => o.whatsapp.replace(/\s+/g, '') === trackWhatsApp.trim().replace(/\s+/g, '')).length} Order(s):</h5>
                            {orders.filter(o => o.whatsapp.replace(/\s+/g, '') === trackWhatsApp.trim().replace(/\s+/g, '')).map((order) => {
                              return (
                                <div key={order.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 text-left">
                                  <div className="flex justify-between items-start">
                                    <div className="text-left">
                                      <span className="font-extrabold text-slate-800 text-[11px] block uppercase">{order.serviceName}</span>
                                      <span className="text-slate-400 font-medium text-[9px] block uppercase">{order.planName} ({order.duration})</span>
                                    </div>
                                    <span className="text-slate-800 font-black text-[11px]">₹{order.amount}</span>
                                  </div>

                                  <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[9px]">
                                    <div className="text-left">
                                      <span className="text-slate-400 font-bold block uppercase">Order ID: {order.id}</span>
                                      <span className="text-slate-400 font-mono block">{order.date}</span>
                                    </div>
                                    <div>
                                      {order.status === 'Pending' && <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Pending</span>}
                                      {order.status === 'Processing' && <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Processing</span>}
                                      {order.status === 'Completed' && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Completed</span>}
                                      {order.status === 'Cancelled' && <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Cancelled</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-slate-400 text-[9px] font-bold uppercase text-center">No matching orders found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: MY PROFILE (LOGIN / SIGN UP / USER PORTAL)             */}
        {/* ------------------------------------------------------------- */}
        {page === 'profile' && (
          <div id="profile-page" className="flex-1 flex flex-col pb-8 animate-in fade-in duration-200">
            {/* Header */}
            <header className="bg-white px-4 py-4.5 rounded-b-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 select-none relative">
              <button
                onClick={() => setPage('home')}
                className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 flex items-center justify-center text-slate-700 transition-all duration-150 cursor-pointer absolute left-4"
              >
                <i className="fa-solid fa-arrow-left text-[15px]"></i>
              </button>
              <h2 className="text-slate-800 font-black text-xs uppercase tracking-wider text-center">
                {loggedInUser ? 'My Account' : 'Member Portal'}
              </h2>
            </header>

            <main className="flex-1 px-4 py-5 flex flex-col gap-4">
              {loggedInUser ? (
                /* USER DETAILS IF LOGGED IN */
                <div className="flex flex-col gap-5">
                  <div className="bg-white border border-[#F1F5F9] rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#22C55E] flex items-center justify-center text-3xl font-black shadow-inner mb-4 select-none">
                      {loggedInUser.username.charAt(0).toUpperCase()}
                    </div>
                    
                    <h3 className="text-slate-900 font-black text-lg uppercase tracking-tight leading-none text-center">{loggedInUser.username}</h3>
                    <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-1.5 text-center">Registered Customer</p>

                    <div className="w-full border-t border-slate-100 my-5 pt-4 flex flex-col gap-3 text-left">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">GPay Full Name:</span>
                        <span className="text-slate-800 font-extrabold uppercase">{loggedInUser.username}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">WhatsApp Number:</span>
                        <span className="text-slate-800 font-extrabold font-mono">{loggedInUser.whatsapp}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Total Placed Orders:</span>
                        <span className="text-[#22C55E] font-black">{orders.filter(o => o.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '') || o.customerName.toLowerCase() === loggedInUser.username.toLowerCase()).length} Order(s)</span>
                      </div>
                    </div>

                    {/* View My Orders Button */}
                    <button
                      onClick={() => setPage('orders')}
                      className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer mb-2.5"
                    >
                      Track My Orders
                    </button>

                    {/* Log out action */}
                    <button
                      onClick={handleUserLogout}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider border border-rose-100 transition-colors cursor-pointer"
                    >
                      Logout Account
                    </button>
                  </div>
                </div>
              ) : (
                /* LOGIN / REGISTRATION FORMS */
                <div className="bg-white border border-[#F1F5F9] rounded-[28px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-5">
                  {/* Form Selectors */}
                  <div className="flex border-b border-slate-100 select-none">
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                        authMode === 'login' ? 'border-[#22C55E] text-slate-800 border-[#22C55E]' : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Login Account
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                        authMode === 'signup' ? 'border-[#22C55E] text-slate-800 border-[#22C55E]' : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Sign Up / Register
                    </button>
                  </div>

                  {/* Feedback alerts */}
                  {authError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-[10.5px] font-semibold p-3.5 rounded-xl text-center select-none uppercase">
                      {authError}
                    </div>
                  )}
                  {authSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 text-[#15803D] text-[10.5px] font-semibold p-3.5 rounded-xl text-center select-none uppercase animate-bounce">
                      {authSuccess}
                    </div>
                  )}

                  {authMode === 'login' ? (
                    /* LOGIN FORM */
                    <form onSubmit={handleUserLogin} className="flex flex-col gap-4 text-left">
                      {/* WhatsApp contact */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WhatsApp Number</label>
                        <input
                          type="tel"
                          required
                          value={authWhatsApp}
                          onChange={(e) => setAuthWhatsApp(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 font-mono text-left"
                        />
                      </div>

                      {/* Password */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Account Password</label>
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 text-left"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0B1528] hover:bg-[#12213D] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider mt-2 transition-colors cursor-pointer"
                      >
                        Sign In Now
                      </button>
                    </form>
                  ) : (
                    /* REGISTRATION FORM */
                    <form onSubmit={handleUserSignUp} className="flex flex-col gap-4 text-left">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Name (As listed in GPay)</label>
                        <input
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Enter name exactly as in GPay"
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 text-left"
                        />
                      </div>

                      {/* WhatsApp Number */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WhatsApp Contact Number</label>
                        <input
                          type="tel"
                          required
                          value={authWhatsApp}
                          onChange={(e) => setAuthWhatsApp(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 font-mono text-left"
                        />
                      </div>

                      {/* Password */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Create Account Password</label>
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 text-left"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider mt-2 transition-colors cursor-pointer"
                      >
                        Register Account
                      </button>
                    </form>
                  )}
                </div>
              )}
            </main>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: USER WALLET PORTAL                                     */}
        {/* ------------------------------------------------------------- */}
        {page === 'wallet' && (
          <div id="wallet-page" className="flex-1 flex flex-col pb-8 animate-in fade-in duration-200">
            {/* Header */}
            <header className="bg-white px-4 py-4.5 rounded-b-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 select-none relative">
              <button
                onClick={() => setPage('home')}
                className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 flex items-center justify-center text-slate-700 transition-all duration-150 cursor-pointer absolute left-4"
              >
                <i className="fa-solid fa-arrow-left text-[15px]"></i>
              </button>
              <h2 className="text-slate-800 font-black text-xs uppercase tracking-wider text-center">
                My Wallet
              </h2>
            </header>

            <main className="flex-1 px-4 py-5 flex flex-col gap-4">
              <UserWallet
                loggedInUser={loggedInUser}
                wallet={loggedInUser ? getUserWallet(loggedInUser.whatsapp, loggedInUser.username) : null}
                transactions={walletTransactions}
                walletSettings={walletSettings}
                siteSettings={settings}
                rechargeRequests={rechargeRequests}
                onSubmitRechargeRequest={handleSubmitRechargeRequest}
                onAddTransaction={handleUserAddTransaction}
                onRedirectToLogin={() => {
                  setAuthMode('login');
                  setPage('profile');
                }}
                onPaymentRedirect={(data) => setPaymentRedirector(data)}
              />
            </main>
          </div>
        )}

        {/* Footer Trademark copyright */}
        <footer className="w-full text-center py-4 bg-transparent mt-auto select-none">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {settings.footerText}
          </p>
        </footer>

        {/* Persistent Bottom Tab Navigation Bar */}
        {!isAdminMode && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 py-3 px-6 flex justify-around items-center shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-30 select-none">
            {/* Browse Tab */}
            <button
              onClick={() => {
                setPage('home');
                setActiveFilter('All');
              }}
              className={`flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                page === 'home' || page === 'service_detail'
                  ? 'text-[#22C55E] scale-105 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className="fa-solid fa-compass text-base"></i>
              <span className="text-[9px] font-black uppercase tracking-wider">Browse</span>
            </button>

            {/* Wallet Tab */}
            {walletSettings.walletEnabled && (
              <button
                onClick={() => {
                  if (!loggedInUser) {
                    setAuthMode('login');
                    setPage('profile');
                  } else {
                    setPage('wallet');
                  }
                }}
                className={`flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                  page === 'wallet'
                    ? 'text-[#22C55E] scale-105 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className="fa-solid fa-wallet text-base"></i>
                <span className="text-[9px] font-black uppercase tracking-wider">Wallet</span>
              </button>
            )}

            {/* Orders Tab */}
            <button
              onClick={() => setPage('orders')}
              className={`flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                page === 'orders'
                  ? 'text-[#22C55E] scale-105 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left text-base"></i>
              <span className="text-[9px] font-black uppercase tracking-wider">My Orders</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setPage('profile')}
              className={`flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                page === 'profile'
                  ? 'text-[#22C55E] scale-105 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className="fa-solid fa-user-circle text-base"></i>
              <span className="text-[9px] font-black uppercase tracking-wider">
                {loggedInUser ? 'Account' : 'Login'}
              </span>
            </button>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* CHECKOUT PAYMENT GATEWAY OVERLAY MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {showPaymentModal && selectedPlan && paymentService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Checkout Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-400 text-lg"></i>
                <span className="font-extrabold text-xs uppercase tracking-wider">Secure UPI Checkout</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Conditionally Render Success Screen OR Form Screen */}
            {checkoutSuccess ? (
              /* Success Screen ("next page") */
              <div className="p-6 flex flex-col items-center gap-5 overflow-y-auto no-scrollbar text-center select-none">
                <div className="w-16 h-16 bg-[#E6F9ED] text-[#22C55E] rounded-full flex items-center justify-center text-3xl shadow-inner animate-bounce mt-4">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                
                <div>
                  <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight">Order Registered!</h4>
                  <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">Order ID: {generatedOrderId}</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl w-full flex flex-col gap-2.5">
                  <p className="text-[#15803D] text-[11px] font-semibold uppercase leading-relaxed text-left">
                    {checkoutMethod === 'upi' ? (
                      <span>
                        Payment Verification status: <strong className="underline">Pending Verification</strong>.<br className="mb-1" />
                        Our administrator will verify your UTR Number (<strong className="font-mono">{upiUtr}</strong>) shortly and activate your service.
                      </span>
                    ) : (
                      <span>
                        Your order has been paid successfully from your wallet. Your subscription is now active!
                      </span>
                    )}
                  </p>
                </div>

                {/* Big Button: Contact the WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    const waMessage = encodeURIComponent(
                      `Hi Admin,\n\nI have placed an order on the panel!\n\n` +
                      `• Order ID: ${generatedOrderId}\n` +
                      `• Name (GPay): ${custName}\n` +
                      `• WhatsApp Contact: ${custWhatsApp}\n` +
                      `• Service: ${paymentService.name}\n` +
                      `• Plan: ${selectedPlan.name} (${selectedPlan.duration})\n` +
                      `• Payment Method: ${checkoutMethod === 'upi' ? 'UPI Manual' : 'Wallet Balance'}\n` +
                      (checkoutMethod === 'upi' ? `• UTR Number: ${upiUtr}\n• Contact Mobile: ${upiContact}\n• Remarks: ${upiRemarks || 'None'}\n` : '') +
                      `• Amount: ₹${selectedPlan.price}\n\n` +
                      `Please review my transaction and activate my service.`
                    );
                    const rawNum = settings.supportNumber.replace(/\D/g, '');
                    window.open(`https://wa.me/${rawNum || '918015342606'}?text=${waMessage}`, '_blank');
                  }}
                  className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-green-100 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer animate-pulse"
                >
                  <i className="fa-brands fa-whatsapp text-lg"></i>
                  <span>Contact WhatsApp Support</span>
                </button>

                <p className="text-slate-400 text-[10px] font-bold uppercase max-w-[240px] leading-relaxed mt-2">
                  Clicking the button above will open WhatsApp chat directly to submit your payment details.
                </p>
              </div>
            ) : (
              /* Form / Step Screen */
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4.5 no-scrollbar">
                
                {/* Product Info Block */}
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                      {renderServiceIcon(paymentService.iconType)}
                    </div>
                    <div className="text-left">
                      <h5 className="text-slate-800 font-bold text-xs uppercase line-clamp-1 max-w-[150px]">
                        {paymentService.name}
                      </h5>
                      <span className="inline-block bg-slate-200 text-slate-600 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase mt-0.5">
                        {selectedPlan.duration}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#22c55e] font-black text-base block">
                      ₹{selectedPlan.price}
                    </span>
                    <span className="text-slate-400 text-[10px] line-through">
                      ₹{selectedPlan.oldPrice}
                    </span>
                  </div>
                </div>

                {checkoutMethod === 'selection' && (
                  <div className="flex flex-col gap-4 py-2 text-left">
                    <h6 className="text-slate-800 font-black text-xs uppercase tracking-wider text-center select-none">
                      Select Payment Method
                    </h6>

                    {/* Option 1: Wallet Instant Payment */}
                    <button
                      type="button"
                      onClick={() => setCheckoutMethod('wallet')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-emerald-500 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <i className="fa-solid fa-wallet"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 font-extrabold text-sm uppercase">Wallet Balance</p>
                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-0.5">Pay instantly & secure instant delivery</p>
                        {loggedInUser && (
                          <p className="text-[#22c55e] font-black text-[10px] uppercase mt-1">
                            Balance: ₹{getUserWallet(loggedInUser.whatsapp, loggedInUser.username).balance.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                    </button>

                    {/* Option 2: ZapUPI Auto Payment */}
                    <button
                      type="button"
                      onClick={() => setCheckoutMethod('upi')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#0B1528] bg-white hover:bg-slate-50 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 group-hover:bg-[#0B1528] group-hover:text-white transition-colors">
                        <i className="fa-solid fa-bolt"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 font-extrabold text-sm uppercase">ZapUPI Gateway</p>
                        <p className="text-slate-400 font-bold text-[10px] uppercase mt-0.5">Pay securely using GPay, PhonePe, Paytm, or any UPI app</p>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-[#0B1528] transition-colors"></i>
                    </button>
                  </div>
                )}

                {checkoutMethod === 'wallet' && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('selection')}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-left"></i>
                        <span>Back</span>
                      </button>
                      <span className="bg-emerald-500/10 text-green-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                        Instant Delivery
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 bg-gradient-to-b from-green-50 to-white p-4 rounded-2xl border border-green-200 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-green-100 pb-2 select-none">
                        <i className="fa-solid fa-wallet text-[#22C55E]"></i>
                        <h6 className="text-slate-800 font-black text-[10px] uppercase tracking-wider">
                          Instant Wallet Payment
                        </h6>
                      </div>

                      {!loggedInUser ? (
                        <div className="flex flex-col gap-2 py-1">
                          <p className="text-slate-500 font-bold text-[10px] uppercase leading-snug">
                            Save time with 1-click checkout! Register or log in to use your personal digital wallet credit.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentModal(false);
                              setAuthMode('login');
                              setPage('profile');
                            }}
                            className="w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            Login / Register
                          </button>
                        </div>
                      ) : (
                        (() => {
                          const userWallet = getUserWallet(loggedInUser.whatsapp, loggedInUser.username);
                          const isFrozen = userWallet.status === 'Frozen';
                          const hasSufficient = userWallet.balance >= selectedPlan.price;

                          return (
                            <div className="flex flex-col gap-2.5">
                              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                                <div className="flex flex-col">
                                  <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider">Available Wallet Balance</span>
                                  <span className={`text-sm font-black ${isFrozen ? 'text-rose-500 line-through' : 'text-slate-800'}`}>
                                    ₹{userWallet.balance.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider">Plan Cost</span>
                                  <span className="text-sm font-black text-emerald-600 block">
                                    -₹{selectedPlan.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {isFrozen ? (
                                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-center">
                                  <p className="text-rose-700 font-bold text-[9px] uppercase">
                                    ⚠️ Wallet account frozen. Please contact administrator.
                                  </p>
                                </div>
                              ) : hasSufficient ? (
                                !walletConfirmPay ? (
                                  <button
                                    type="button"
                                    onClick={() => setWalletConfirmPay(true)}
                                    className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md border-0 animate-in fade-in duration-150"
                                  >
                                    <i className="fa-solid fa-bolt animate-pulse"></i>
                                    <span>Pay Instantly with Wallet</span>
                                  </button>
                                ) : (
                                  <div className="flex flex-col gap-2 bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl animate-in zoom-in-95 duration-150">
                                    <p className="text-slate-800 font-black text-[10px] uppercase text-center select-none">
                                      Confirm Wallet Purchase?
                                    </p>
                                    <p className="text-slate-500 font-bold text-[8px] uppercase text-center leading-normal">
                                      This will instantly deduct ₹{selectedPlan.price.toFixed(2)} from your wallet balance.
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextBal = userWallet.balance - selectedPlan.price;
                                          
                                          // 1. Deduct balance from wallets list state
                                          setWallets(prev => prev.map(w => {
                                            if (w.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')) {
                                              return {
                                                ...w,
                                                balance: nextBal,
                                                totalSpent: w.totalSpent + selectedPlan.price
                                              };
                                            }
                                            return w;
                                          }));

                                          // 2. Generate transaction ID
                                          const txnId = 'WTXN-' + Math.floor(100000 + Math.random() * 900000);
                                          const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

                                          // 3. Create wallet debit transaction
                                          const newTxn: WalletTransaction = {
                                            id: txnId,
                                            whatsapp: loggedInUser.whatsapp,
                                            username: loggedInUser.username,
                                            amount: selectedPlan.price,
                                            type: 'Debit',
                                            paymentMethod: 'Wallet Balance',
                                            status: 'Success',
                                            balanceAfter: nextBal,
                                            date: dateStr
                                          };
                                          setWalletTransactions(prev => [newTxn, ...prev]);

                                          // 4. Create Order with Completed status and Wallet paymentMethod
                                          const ordId = 'ORD' + Math.floor(10000 + Math.random() * 90000);
                                          const newOrder: Order = {
                                            id: ordId,
                                            customerName: loggedInUser.username,
                                            whatsapp: loggedInUser.whatsapp,
                                            serviceId: paymentService.id,
                                            planId: selectedPlan.id,
                                            serviceName: paymentService.name,
                                            planName: selectedPlan.name,
                                            duration: selectedPlan.duration,
                                            transactionId: txnId,
                                            amount: selectedPlan.price,
                                            status: 'Completed',
                                            paymentMethod: 'Wallet',
                                            date: dateStr
                                          };
                                          setOrders(prev => [newOrder, ...prev]);

                                          // 5. Log activity
                                          logActivity('Wallet Purchase', `Purchased plan "${selectedPlan.name}" using wallet. Order ID: ${ordId}`);
                                          logWalletActivity(loggedInUser.whatsapp, 'Spend', `Deducted ₹${selectedPlan.price} for plan "${selectedPlan.name}". Balance after: ₹${nextBal}`);

                                          // 6. Set success screen properties
                                          setCustName(loggedInUser.username);
                                          setCustWhatsApp(loggedInUser.whatsapp);
                                          setGeneratedOrderId(ordId);
                                          setCheckoutSuccess(true);
                                          setWalletConfirmPay(false);
                                        }}
                                        className="flex-1 bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-[9px] uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer text-center border-0 shadow-xs"
                                      >
                                        Yes, Confirm Pay
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWalletConfirmPay(false)}
                                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[9px] uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer text-center border-0"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="flex flex-col gap-2 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
                                  <p className="text-rose-700 font-extrabold text-[11px] uppercase text-center select-none">
                                    ⚠️ Insufficient Wallet Balance
                                  </p>
                                  <p className="text-slate-500 font-medium text-[9px] uppercase text-center">
                                    Need ₹{(selectedPlan.price - userWallet.balance).toFixed(2)} more to purchase this subscription.
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowPaymentModal(false);
                                        setPage('wallet');
                                      }}
                                      className="flex-1 bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-[9px] uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer text-center border-0 shadow-xs"
                                    >
                                      ⚡ Add Money
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowPaymentModal(false);
                                      }}
                                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[9px] uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer text-center border-0"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}

                {checkoutMethod === 'upi' && (
                  <form onSubmit={handlePayViaZapUpi} className="flex flex-col gap-4.5 text-left animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      {walletSettings.walletEnabled && (
                        <button
                          type="button"
                          onClick={() => setCheckoutMethod('selection')}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-left"></i>
                          <span>Back</span>
                        </button>
                      )}
                      <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-100 select-none ml-auto">
                        Auto Gateway
                      </span>
                    </div>

                    {/* ZapUPI Info card */}
                    <div className="bg-[#0B1528] text-white rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden select-none">
                      <div className="absolute right-4 top-4 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider">
                        Live Auto
                      </div>
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h6 className="text-[#a0aec0] font-black text-[9.5px] uppercase tracking-wider">
                          ZapUPI Auto Payment Gateway
                        </h6>
                      </div>
                      <p className="text-[#a0aec0] text-[10.5px] font-semibold leading-relaxed text-left">
                        Secure instant checkout! Complete the payment on any UPI application (PhonePe, GPay, Paytm, etc.). Your order will be automatically verified and completed.
                      </p>
                    </div>

                    {/* Section B: FULFILLMENT INPUT FIELDS */}
                    <div className="flex flex-col gap-3.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 select-none">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <h6 className="text-slate-800 font-black text-[10px] uppercase tracking-wider">
                          Customer details
                        </h6>
                      </div>

                      {/* Field 1: Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-extrabold text-[9px] uppercase tracking-wider select-none text-left flex items-center gap-1">
                          <i className="fa-regular fa-user text-slate-400 text-[8px]"></i>
                          <span>Your Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Enter your name"
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 text-left"
                        />
                      </div>

                      {/* Field 2: WhatsApp contact */}
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-extrabold text-[9px] uppercase tracking-wider select-none text-left flex items-center gap-1">
                          <i className="fa-brands fa-whatsapp text-[#22C55E] text-[9px]"></i>
                          <span>WhatsApp Contact *</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={custWhatsApp}
                          onChange={(e) => setCustWhatsApp(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-green-500 text-left"
                        />
                      </div>
                    </div>

                    {/* Submitting Actions */}
                    <button
                      type="submit"
                      disabled={isRedirectingToZapUpi}
                      className="w-full bg-[#0B1528] hover:bg-[#12213D] disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer select-none"
                    >
                      {isRedirectingToZapUpi ? (
                        <>
                          <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                          <span>Connecting Secure Gateway...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-bolt text-xs"></i>
                          <span>Pay ₹{selectedPlan.price} Securely</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* JOIN WHATSAPP CHANNELS MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-[#22C55E] text-white px-5 py-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-lg"></i>
                <span className="font-bold text-sm uppercase tracking-wide">WhatsApp Channels</span>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
              
              <div className="text-center py-2 flex flex-col items-center select-none">
                <div className="w-16 h-16 bg-[#E6F9ED] text-[#22C55E] rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">
                  <i className="fa-brands fa-whatsapp"></i>
                </div>
                <h4 className="text-slate-800 font-extrabold text-sm uppercase">Join Our Channels</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[240px] font-medium leading-relaxed">
                  Join our official community and get direct updates, promo codes, and customer support.
                </p>
              </div>

              {/* Channel list */}
              <div className="flex flex-col gap-2.5">
                <a
                  href={settings.joinGroupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#F8FAFC] hover:bg-slate-50 border border-slate-100 hover:border-[#22C55E]/40 rounded-2xl p-3.5 flex items-center justify-between transition-all duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-[#22C55E] text-white rounded-xl flex items-center justify-center text-md shadow-sm">
                      <i className="fa-solid fa-bullhorn"></i>
                    </div>
                    <div>
                      <h5 className="text-slate-800 font-bold text-xs uppercase">Official WhatsApp Channel</h5>
                      <span className="text-emerald-600 font-semibold text-[10px] uppercase tracking-wider block mt-0.5">
                        Free Giveaways Here
                      </span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                </a>
              </div>

              {/* Welcome 1,000 Free Views Note Box */}
              <div className="bg-[#E6F9ED] border border-[#DCFCE7] rounded-2xl p-3.5 mt-1 flex gap-2.5 select-none">
                <i className="fa-solid fa-gift text-[#22C55E] text-md mt-0.5 animate-bounce"></i>
                <div>
                  <h6 className="text-green-800 font-bold text-xs uppercase mb-0.5">1,000 Views Offer</h6>
                  <p className="text-green-700 text-[10.5px] font-semibold leading-relaxed">
                    Send a screenshot of you joining the WhatsApp Channel to our Admin and claim 1,000 Free Views!
                  </p>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2 shrink-0 select-none">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl text-center cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ZAPUPI SECURE PAYMENT OUTCOME DIALOG                          */}
      {/* ------------------------------------------------------------- */}
      {zapupiPaymentResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all duration-300">
          <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 text-center">
            
            {zapupiPaymentResult.status === 'success' ? (
              <>
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner mx-auto animate-bounce">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight">Payment Approved!</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Automatic Webhook Verification</p>
                
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl w-full my-4 text-left">
                  <p className="text-emerald-800 text-xs font-semibold leading-relaxed">
                    Your ZapUPI payment was successfully processed! Your wallet balance has been credited or order has been created.
                  </p>
                  {zapupiPaymentResult.orderId && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-100/60 flex justify-between items-center text-[10px] font-bold text-emerald-700">
                      <span className="uppercase">Order Reference:</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 select-all">{zapupiPaymentResult.orderId}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setZapupiPaymentResult(null)}
                  className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer select-none"
                >
                  Back To Panel
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner mx-auto animate-pulse">
                  <i className="fa-solid fa-circle-xmark"></i>
                </div>
                <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight">Payment Unverified</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Transaction Cancelled or Failed</p>
                
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl w-full my-4 text-left">
                  <p className="text-rose-800 text-xs font-semibold leading-relaxed">
                    The payment was either cancelled, timed out, or rejected by the payment gateway. If any amount was deducted, please contact Support.
                  </p>
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setZapupiPaymentResult(null);
                      setShowSupportModal(true);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer select-none"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => setZapupiPaymentResult(null)}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer select-none"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ZAPUPI SECURE PAYMENT REDIRECTOR OVERLAY                      */}
      {/* ------------------------------------------------------------- */}
      {paymentRedirector && (
        <PaymentRedirectorOverlay
          url={paymentRedirector.url}
          amount={paymentRedirector.amount}
          customerName={paymentRedirector.customerName}
          customerMobile={paymentRedirector.customerMobile}
          orderId={paymentRedirector.orderId}
          onCancel={() => setPaymentRedirector(null)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 24/7 CUSTOMER HELPLINE MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-[#22C55E] text-white px-5 py-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-headset text-lg"></i>
                <span className="font-bold text-sm uppercase tracking-wide font-black">Customer Support</span>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
              
              <div className="text-center py-2 flex flex-col items-center select-none">
                <div className="w-16 h-16 bg-[#E6F9ED] text-[#22C55E] rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <h4 className="text-slate-800 font-extrabold text-sm uppercase">Support Help Center</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[240px] font-medium leading-relaxed">
                  We are available 24/7 to solve your problems. Connect with us directly via the options below.
                </p>
              </div>

              {/* Helpline Option */}
              <div className="flex flex-col gap-2.5">
                <a
                  href={`https://wa.me/${settings.supportNumber.replace(/\D/g, '')}?text=Hi%20Admin,%20I%20need%20assistance%20with%20the%20panel`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#F8FAFC] hover:bg-slate-50 border border-slate-100 hover:border-[#22C55E]/40 rounded-2xl p-3.5 flex items-center justify-between transition-all duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center text-md shadow-sm">
                      <i className="fa-brands fa-whatsapp"></i>
                    </div>
                    <div>
                      <h5 className="text-slate-800 font-bold text-xs uppercase">WhatsApp Live Chat</h5>
                      <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block mt-0.5">
                        Average Reply Time: 1 Min
                      </span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                </a>
              </div>

              {/* Copy helpline support mobile number */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider select-none">
                  Helpline Mobile Number
                </label>
                <div className="flex items-center gap-2 bg-[#F1F5F9] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-700 font-extrabold text-xs select-all flex-1 text-center font-mono">
                    {settings.supportNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(settings.supportNumber, 'helpline')}
                    className="bg-white hover:bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer transition-colors"
                  >
                    {copiedText === 'helpline' ? (
                      <span className="text-emerald-500 font-black">Copied!</span>
                    ) : (
                      <span>Copy</span>
                    )}
                  </button>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2 shrink-0 select-none">
              <button
                onClick={() => setShowSupportModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl text-center cursor-pointer"
              >
                Back To Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
