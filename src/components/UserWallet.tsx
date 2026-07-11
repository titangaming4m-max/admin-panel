import React, { useState } from 'react';
import { Wallet, WalletTransaction, WalletSettings, SiteSettings, WalletRechargeRequest } from '../types';

interface UserWalletProps {
  loggedInUser: { username: string; whatsapp: string } | null;
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  walletSettings: WalletSettings;
  siteSettings: SiteSettings;
  rechargeRequests?: WalletRechargeRequest[];
  onSubmitRechargeRequest?: (amount: number, utrNumber: string, contactMobile: string, remarks: string, paymentMethod: string, screenshot?: string) => string;
  onAddTransaction: (amount: number, type: 'Credit' | 'Debit', method: string, status: 'Success' | 'Pending' | 'Failed') => void;
  onRedirectToLogin: () => void;
}

export default function UserWallet({
  loggedInUser,
  wallet,
  transactions,
  walletSettings,
  siteSettings,
  rechargeRequests = [],
  onSubmitRechargeRequest,
  onAddTransaction,
  onRedirectToLogin,
}: UserWalletProps) {
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState<string>('500');
  const [paymentStep, setPaymentStep] = useState<'details' | 'success' | 'pending'>('details');
  const [txnId, setTxnId] = useState<string>('');
  
  // Search, Filter, Pagination states for Transaction History
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Credit' | 'Debit'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [copiedUpi, setCopiedUpi] = useState(false);

  // Manual Recharge Form states
  const [utrNumber, setUtrNumber] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [remarks, setRemarks] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
  const [isRedirectingToZapUpi, setIsRedirectingToZapUpi] = useState(false);

  const handleRechargeViaZapUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum < walletSettings.minRecharge || amountNum > walletSettings.maxRecharge) {
      alert(`Recharge amount must be between ₹${walletSettings.minRecharge} and ₹${walletSettings.maxRecharge}`);
      return;
    }

    if (wallet?.status === 'Frozen') {
      alert('Your wallet is frozen by Admin. You cannot add money.');
      return;
    }

    setIsRedirectingToZapUpi(true);

    try {
      const res = await fetch('/api/payment/zapupi/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          customer_name: loggedInUser.username,
          customer_mobile: loggedInUser.whatsapp,
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
        window.location.href = data.payment_url;
      } else {
        throw new Error(data.message || 'Unknown response from ZapUPI server');
      }
    } catch (err: any) {
      alert(err.message || 'Unable to connect to payment gateway. Please try again.');
      setIsRedirectingToZapUpi(false);
    }
  };
  
  // User Recharge History tab & list states
  const [rechargeActiveTab, setRechargeActiveTab] = useState<'statement' | 'requests'>('statement');
  const [rechargeSearchTerm, setRechargeSearchTerm] = useState('');
  const [rechargeStatusFilter, setRechargeStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [rechargeCurrentPage, setRechargeCurrentPage] = useState(1);
  const rechargesPerPage = 5;

  if (!loggedInUser) {
    return (
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-center flex flex-col items-center select-none animate-in fade-in duration-200">
        <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mb-4 shadow-inner">
          <i className="fa-solid fa-wallet"></i>
        </div>
        <h3 className="text-slate-800 font-black text-sm uppercase tracking-wider">Wallet Dashboard</h3>
        <p className="text-slate-400 text-xs mt-2 max-w-[250px] font-medium leading-relaxed">
          Please login to view your personal digital wallet, check transactions, or top-up balance.
        </p>
        <button
          onClick={onRedirectToLogin}
          className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider mt-5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  if (!walletSettings.walletEnabled) {
    return (
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-center flex flex-col items-center select-none animate-in fade-in duration-200">
        <div className="w-18 h-18 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-4">
          <i className="fa-solid fa-ban"></i>
        </div>
        <h3 className="text-slate-800 font-black text-sm uppercase tracking-wider">Wallet Suspended</h3>
        <p className="text-slate-400 text-xs mt-2 max-w-[250px] font-medium leading-relaxed">
          The digital wallet system is currently disabled by the Administrator. Please use standard UPI Checkout instead.
        </p>
      </div>
    );
  }

  // Get current user's transactions
  const userTransactions = transactions.filter(
    (t) => t.whatsapp.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')
  );

  // Filter transactions
  const filteredTransactions = userTransactions.filter((t) => {
    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Paginated Transactions
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleQuickAmountClick = (amount: number) => {
    setAddAmount(amount.toString());
  };

  const handleCopyUpi = () => {
    if (siteSettings.upiId) {
      navigator.clipboard.writeText(siteSettings.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large! Please upload a screenshot image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum < walletSettings.minRecharge || amountNum > walletSettings.maxRecharge) {
      alert(`Recharge amount must be between ₹${walletSettings.minRecharge} and ₹${walletSettings.maxRecharge}`);
      return;
    }

    if (wallet?.status === 'Frozen') {
      alert('Your wallet is frozen. You cannot recharge your wallet.');
      return;
    }

    // UTR verification: min 12, max 30 chars, alphanumeric
    const utrTrimmed = utrNumber.trim();
    if (!utrTrimmed) {
      alert('UTR Number / Transaction ID is required.');
      return;
    }
    if (utrTrimmed.length < 12 || utrTrimmed.length > 30) {
      alert('UTR Number must be between 12 and 30 characters long.');
      return;
    }
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(utrTrimmed);
    if (!isAlphanumeric) {
      alert('UTR Number must contain only numbers and letters (alphanumeric).');
      return;
    }

    // Contact Mobile: 10 digits only
    const mobileTrimmed = contactMobile.trim().replace(/\D/g, '');
    if (mobileTrimmed.length !== 10) {
      alert('Contact Mobile Number must be exactly 10 digits.');
      return;
    }

    setIsSubmittingRecharge(true);

    // Simulate premium visual processing feedback
    setTimeout(() => {
      try {
        if (walletSettings.autoCreditEnabled) {
          // If auto credit is enabled, add successful transaction instantly
          onAddTransaction(amountNum, 'Credit', 'UPI QR', 'Success');
          setPaymentStep('success');
          setIsSubmittingRecharge(false);
          // Auto submit request record as approved
          onSubmitRechargeRequest?.(
            amountNum,
            utrTrimmed,
            mobileTrimmed,
            remarks,
            'UPI QR',
            screenshot
          );
        } else {
          // Manual verification flow
          const reqId = onSubmitRechargeRequest?.(
            amountNum,
            utrTrimmed,
            mobileTrimmed,
            remarks,
            'UPI QR',
            screenshot
          );
          setTxnId(reqId || '');
          setPaymentStep('pending');
          setIsSubmittingRecharge(false);

          // Reset manual form fields
          setUtrNumber('');
          setContactMobile('');
          setRemarks('');
          setScreenshot('');
        }
      } catch (err: any) {
        setIsSubmittingRecharge(false);
        alert(err.message || 'Verification submission failed. Please try again.');
      }
    }, 1200);
  };

  const handleCloseAddMoney = () => {
    setIsAddMoneyOpen(false);
    setPaymentStep('details');
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      
      {/* WALLET OVERVIEW DASHBOARD CARD */}
      {!isAddMoneyOpen ? (
        <div className="flex flex-col gap-4">
          
          {/* Main Wallet Balance Card */}
          <div className="bg-[#0B1528] rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden select-none">
            {/* Background Accent Gradients */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#22c55e]/10 blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl"></div>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#a0aec0] font-black text-[9px] uppercase tracking-wider">Available Wallet Balance</p>
                <h3 className="text-white font-black text-3xl mt-1 tracking-tight">
                  ₹{wallet?.balance.toFixed(2) || '0.00'}
                </h3>
              </div>
              <div className="bg-[#22c55e]/20 border border-[#22c55e]/40 px-3 py-1 rounded-full text-emerald-400 font-extrabold text-[10px] uppercase tracking-wide">
                {wallet?.status === 'Frozen' ? (
                  <span className="text-rose-400"><i className="fa-solid fa-snowflake mr-1"></i>Frozen</span>
                ) : (
                  <span><i className="fa-solid fa-circle-check mr-1"></i>Active</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800 text-left">
              <div>
                <span className="text-slate-400 font-bold text-[8.5px] uppercase tracking-wider block">Total Added</span>
                <span className="text-emerald-400 font-black text-sm block mt-0.5">
                  ₹{wallet?.totalAdded.toFixed(2) || '0.00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold text-[8.5px] uppercase tracking-wider block">Total Spent</span>
                <span className="text-blue-400 font-black text-sm block mt-0.5">
                  ₹{wallet?.totalSpent.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (wallet?.status === 'Frozen') {
                  alert('Your wallet is frozen by Admin. You cannot add money.');
                  return;
                }
                setIsAddMoneyOpen(true);
              }}
              className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl text-center mt-5 shadow-lg shadow-green-950/20 active:scale-95 transition-all cursor-pointer block"
            >
              <i className="fa-solid fa-plus-circle mr-1.5 text-xs"></i>
              <span>Add Money To Wallet</span>
            </button>
          </div>

          {/* TRANSACTION HISTORY SECTION */}
          <div className="bg-white border border-[#F1F5F9] rounded-[28px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            
            {/* Split subtabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 select-none">
              <button
                type="button"
                onClick={() => setRechargeActiveTab('statement')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  rechargeActiveTab === 'statement'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Statement History
              </button>
              <button
                type="button"
                onClick={() => setRechargeActiveTab('requests')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer relative ${
                  rechargeActiveTab === 'requests'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Recharge Requests
                {rechargeRequests.filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '') && r.status === 'Pending').length > 0 && (
                  <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </button>
            </div>

            {rechargeActiveTab === 'statement' ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-[4px] h-5 bg-[#22C55E] rounded-full"></div>
                  <h4 className="text-slate-800 font-black tracking-wide text-xs uppercase">Wallet Statement</h4>
                </div>

                {/* Filter Control Board */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {/* Search */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    </span>
                    <input
                      type="text"
                      placeholder="Search Txn ID or Method..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-green-500 text-left"
                    />
                  </div>

                  {/* Toggle Filters */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block mb-1 text-left">Type Filter</label>
                      <select
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-2 text-xs text-slate-700 font-bold focus:outline-none"
                      >
                        <option value="All">All Types</option>
                        <option value="Credit">Credits (Added)</option>
                        <option value="Debit">Debits (Spent)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block mb-1 text-left">Status Filter</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-2 text-xs text-slate-700 font-bold focus:outline-none"
                      >
                        <option value="All">All Status</option>
                        <option value="Success">Success</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List Table container */}
                <div className="flex flex-col gap-2.5">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((t) => {
                      const isCredit = t.type === 'Credit';
                      return (
                        <div
                          key={t.id}
                          className="bg-[#F8FAFC] border border-slate-100 p-3.5 rounded-2xl flex flex-col gap-2 hover:border-slate-200 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                                  isCredit
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <i className={isCredit ? 'fa-solid fa-arrow-down-left' : 'fa-solid fa-arrow-up-right'}></i>
                              </span>
                              <div className="text-left">
                                <span className="text-slate-800 font-bold text-xs uppercase">
                                  {isCredit ? 'Added Money' : 'Plan Purchase'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 block tracking-wider uppercase">
                                  {t.id}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`font-black text-xs block ${isCredit ? 'text-emerald-500' : 'text-slate-800'}`}>
                                {isCredit ? '+' : '-'}₹{t.amount}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                bal: ₹{t.balanceAfter}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[9px] text-slate-400 font-bold uppercase tracking-wider select-none">
                            <span>{t.date}</span>
                            <div className="flex items-center gap-2">
                              <span>{t.paymentMethod}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                  t.status === 'Success'
                                    ? 'bg-emerald-100/75 text-emerald-600'
                                    : t.status === 'Pending'
                                    ? 'bg-amber-100/75 text-amber-600'
                                    : 'bg-rose-100/75 text-rose-600'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-400 font-semibold text-xs uppercase select-none">
                      No statement transactions found
                    </div>
                  )}
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 select-none">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-150 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-150 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* RECHARGE REQUESTS HISTORY VIEW */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-[4px] h-5 bg-amber-500 rounded-full"></div>
                  <h4 className="text-slate-800 font-black tracking-wide text-xs uppercase">Manual Recharge History</h4>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col gap-2.5 mb-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    </span>
                    <input
                      type="text"
                      placeholder="Search by UTR or Request ID..."
                      value={rechargeSearchTerm}
                      onChange={(e) => {
                        setRechargeSearchTerm(e.target.value);
                        setRechargeCurrentPage(1);
                      }}
                      className="w-full pl-9 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-green-500 text-left"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block mb-1 text-left">Status Filter</label>
                    <select
                      value={rechargeStatusFilter}
                      onChange={(e) => {
                        setRechargeStatusFilter(e.target.value as any);
                        setRechargeCurrentPage(1);
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-2 text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Requests</option>
                      <option value="Pending">Pending Verification</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Recharge Verification requests list */}
                <div className="flex flex-col gap-2.5">
                  {rechargeRequests
                    .filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, ''))
                    .filter(r => {
                      const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                      const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                      return matchS && matchF;
                    }).length > 0 ? (
                      rechargeRequests
                        .filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, ''))
                        .filter(r => {
                          const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                          const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                          return matchS && matchF;
                        })
                        .slice((rechargeCurrentPage - 1) * rechargesPerPage, rechargeCurrentPage * rechargesPerPage)
                        .map((req) => (
                          <div
                            key={req.id}
                            className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left flex flex-col gap-3 relative overflow-hidden"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="bg-slate-200 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider select-all">
                                  {req.id}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block mt-1">{req.createdAt}</span>
                              </div>
                              <div>
                                {req.status === 'Pending' && (
                                  <span className="inline-block bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    <i className="fa-regular fa-clock mr-1"></i>Pending Verification
                                  </span>
                                )}
                                {req.status === 'Approved' && (
                                  <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    <i className="fa-solid fa-check mr-1"></i>Approved & Credited
                                  </span>
                                )}
                                {req.status === 'Rejected' && (
                                  <span className="inline-block bg-rose-50 text-rose-500 border border-rose-100 text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    <i className="fa-solid fa-ban mr-1"></i>Rejected
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase block">Amount Requested:</span>
                                <span className="text-slate-800 font-black text-xs block mt-0.5">₹{req.rechargeAmount.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase block">UTR Number:</span>
                                <span className="text-slate-800 font-mono font-bold select-all block mt-0.5">{req.utrNumber}</span>
                              </div>
                              <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-1.5">
                                <span className="text-[8px] text-slate-400 font-bold uppercase block">Contact Mobile:</span>
                                <span className="text-slate-700 font-mono block mt-0.5">{req.contactMobile}</span>
                              </div>
                            </div>

                            {req.remarks && (
                              <div className="text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded-lg italic">
                                "{req.remarks}"
                              </div>
                            )}

                            {req.screenshot && (
                              <div className="flex items-center gap-2">
                                <span className="text-[8.5px] text-slate-400 font-bold uppercase">Submitted Screenshot Proof:</span>
                                <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-white select-none">
                                  <img src={req.screenshot} alt="Receipt Proof" className="w-full h-full object-contain" />
                                </div>
                              </div>
                            )}

                            {/* Response feedback */}
                            {req.status !== 'Pending' && (
                              <div className="border-t border-dashed border-slate-200 pt-2.5 flex flex-col gap-1 text-[11px]">
                                <span className="text-[8px] text-slate-400 font-bold uppercase">Verification Updates:</span>
                                {req.approvedAt && (
                                  <p className="text-slate-500">Processed At: <span className="font-mono text-slate-600">{req.approvedAt}</span></p>
                                )}
                                {req.adminRemarks && (
                                  <div className="bg-[#FAFDFB] border border-emerald-50 text-slate-700 p-2.5 rounded-xl">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Admin Remarks:</span>
                                    <p className="font-bold text-slate-800 mt-0.5">"{req.adminRemarks}"</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 font-semibold text-xs uppercase select-none">
                        No manual recharge requests found
                      </div>
                    )}
                </div>

                {/* Pagination footer */}
                {Math.ceil(rechargeRequests.filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')).filter(r => {
                  const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                  const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                  return matchS && matchF;
                }).length / rechargesPerPage) > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 select-none">
                    <button
                      disabled={rechargeCurrentPage === 1}
                      onClick={() => setRechargeCurrentPage((p) => Math.max(1, p - 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-150 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Page {rechargeCurrentPage} / {Math.ceil(rechargeRequests.filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')).filter(r => {
                        const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                        const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                        return matchS && matchF;
                      }).length / rechargesPerPage)}
                    </span>
                    <button
                      disabled={rechargeCurrentPage === Math.ceil(rechargeRequests.filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')).filter(r => {
                        const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                        const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                        return matchS && matchF;
                      }).length / rechargesPerPage)}
                      onClick={() => setRechargeCurrentPage((p) => Math.min(Math.ceil(rechargeRequests.filter(r => r.userId.replace(/\s+/g, '') === loggedInUser.whatsapp.replace(/\s+/g, '')).filter(r => {
                        const matchS = r.id.toLowerCase().includes(rechargeSearchTerm.toLowerCase()) || r.utrNumber.toLowerCase().includes(rechargeSearchTerm.toLowerCase());
                        const matchF = rechargeStatusFilter === 'All' || r.status === rechargeStatusFilter;
                        return matchS && matchF;
                      }).length / rechargesPerPage), p + 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-150 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      ) : (
        /* ADD MONEY FLOW PAGE WITH ENHANCED MANUAL VERIFICATION */
        <div className="bg-white border border-[#F1F5F9] rounded-[28px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] select-none">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 select-none">
            <h4 className="text-slate-800 font-black text-xs uppercase tracking-wider">Top-up Wallet</h4>
            <button
              onClick={handleCloseAddMoney}
              className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer hover:text-slate-600"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          {paymentStep === 'details' ? (
            <form onSubmit={handleRechargeViaZapUpi} className="flex flex-col gap-4 text-left">
              
              {/* Enter Amount input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Enter Amount (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-700 font-extrabold text-sm font-mono pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={walletSettings.minRecharge}
                    max={walletSettings.maxRecharge}
                    required
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder={`Min ₹${walletSettings.minRecharge} - Max ₹${walletSettings.maxRecharge}`}
                    className="w-full pl-9 bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-black focus:outline-none focus:border-green-500 font-mono text-left"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="text-slate-400 font-bold text-[8.5px] uppercase tracking-wider text-left">Quick Selection</span>
                <div className="grid grid-cols-3 gap-2">
                  {walletSettings.defaultQuickAmounts.map((amount) => {
                    const isSelected = addAmount === amount.toString();
                    return (
                      <button
                        type="button"
                        key={amount}
                        onClick={() => handleQuickAmountClick(amount)}
                        className={`py-2 px-1 text-center rounded-xl font-bold text-xs font-mono transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[#22c55e] text-white shadow-sm shadow-green-100'
                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        +₹{amount}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ZapUPI auto gateway details */}
              <div className="bg-[#0B1528] text-white rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden select-none">
                <div className="absolute right-4 top-4 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider">
                  Auto Gateway
                </div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h6 className="text-[#a0aec0] font-black text-[9px] uppercase tracking-wider">
                    ZapUPI Auto Payment Gateway
                  </h6>
                </div>
                <p className="text-[#a0aec0] text-[10.5px] font-semibold leading-relaxed text-left">
                  Top-up your wallet instantly using your UPI app (PhonePe, GPay, Paytm, BHIM, etc.). No manual UTR entry or screenshot verification needed! Your balance will be credited automatically.
                </p>
              </div>

              {/* Payment Summary */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 select-none text-xs font-bold text-slate-700 mt-2">
                <span className="uppercase">Recharge Amount:</span>
                <span className="text-[#22c55e] font-black text-lg">₹{addAmount || '0'}</span>
              </div>

              {/* PREMIUM ZAPUPI ACTION BUTTON */}
              <button
                type="submit"
                disabled={isRedirectingToZapUpi}
                className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-wider py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 select-none"
              >
                {isRedirectingToZapUpi ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-sm"></i>
                    <span>Connecting Secure Gateway...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt text-xs"></i>
                    <span>Pay Securely via ZapUPI</span>
                  </>
                )}
              </button>

            </form>
          ) : paymentStep === 'success' ? (
            /* AUTO CREDIT SUCCESS SCREEN */
            <div className="flex flex-col items-center gap-4.5 py-6 text-center select-none animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-[#E6F9ED] text-[#22C55E] rounded-full flex items-center justify-center text-3xl shadow-inner animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              
              <div>
                <h4 className="text-slate-900 font-black text-md uppercase tracking-tight">Wallet Recharged!</h4>
                <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-wider">Instant Balance Credited</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl w-full">
                <p className="text-[#15803D] text-xs font-semibold leading-relaxed">
                  {walletSettings.rechargeSuccessMessage}
                </p>
                <p className="text-[#15803D] font-black text-lg mt-3">
                  +₹{parseFloat(addAmount).toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseAddMoney}
                className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer"
              >
                Back To Wallet
              </button>
            </div>
          ) : (
            /* MANUAL PAYMENT SUBMISSION SCREEN */
            <div className="flex flex-col items-center gap-4.5 py-6 text-center select-none animate-in fade-in zoom-in-95 duration-200">
              <div className="w-15 h-15 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl shadow-inner animate-pulse">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>

              <div>
                <h4 className="text-slate-900 font-black text-md uppercase tracking-tight">Verification Pending</h4>
                <p className="text-[#22c55e] font-extrabold text-[10px] mt-1 uppercase tracking-wider">Request ID: {txnId}</p>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl w-full text-left flex flex-col gap-2">
                <p className="text-amber-800 text-xs font-bold leading-relaxed text-center">
                  Your recharge request of ₹{parseFloat(addAmount).toFixed(2)} is pending manual Admin review.
                </p>
                <p className="text-slate-500 text-[10px] leading-relaxed mt-1 text-center font-medium">
                  Please click below to submit your payment details directly to our customer support on WhatsApp to instantly credit your wallet!
                </p>
              </div>

              {/* WhatsApp direct checkout */}
              <button
                type="button"
                onClick={() => {
                  const waMessage = encodeURIComponent(
                    `Hi Admin,\n\nI have requested a Wallet Recharge!\n\n` +
                    `• Request ID: ${txnId}\n` +
                    `• Name (GPay): ${loggedInUser.username}\n` +
                    `• WhatsApp Contact: ${loggedInUser.whatsapp}\n` +
                    `• Recharge Amount: ₹${addAmount}\n\n` +
                    `I have successfully scanned the QR and paid. Please review my payment and credit my wallet balance.`
                  );
                  const rawNum = siteSettings.supportNumber.replace(/\D/g, '');
                  window.open(`https://wa.me/${rawNum || '918015342606'}?text=${waMessage}`, '_blank');
                }}
                className="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-4 px-5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <i className="fa-brands fa-whatsapp text-md"></i>
                <span>Submit Proof to Support</span>
              </button>

              <button
                type="button"
                onClick={handleCloseAddMoney}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back To Statement
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
