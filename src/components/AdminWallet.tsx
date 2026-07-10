import React, { useState } from 'react';
import { Wallet, WalletTransaction, WalletSettings, WalletLog, WalletRechargeRequest } from '../types';

interface AdminWalletProps {
  users: { username: string; whatsapp: string; dateJoined: string }[];
  wallets: Wallet[];
  transactions: WalletTransaction[];
  walletSettings: WalletSettings;
  walletLogs: WalletLog[];
  rechargeRequests?: WalletRechargeRequest[];
  onUpdateWallet: (whatsapp: string, balance: number, status: 'Active' | 'Frozen', type?: 'credit' | 'debit' | 'edit', amt?: number) => void;
  onUpdateSettings: (settings: WalletSettings) => void;
  onApproveTransaction: (txnId: string) => void;
  onRejectTransaction: (txnId: string) => void;
  onDeleteTransaction: (txnId: string) => void;
  onClearTransactions: () => void;
  onApproveRechargeRequest?: (id: string, adminRemarks?: string) => void;
  onRejectRechargeRequest?: (id: string, adminRemarks: string) => void;
  onDeleteRechargeRequest?: (id: string) => void;
}

export default function AdminWallet({
  users,
  wallets,
  transactions,
  walletSettings,
  walletLogs,
  rechargeRequests = [],
  onUpdateWallet,
  onUpdateSettings,
  onApproveTransaction,
  onRejectTransaction,
  onDeleteTransaction,
  onClearTransactions,
  onApproveRechargeRequest,
  onRejectRechargeRequest,
  onDeleteRechargeRequest,
}: AdminWalletProps) {
  // Current active sub-tab inside Wallet Management
  const [subTab, setSubTab] = useState<'users' | 'transactions' | 'settings' | 'logs' | 'recharges'>('recharges');

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserHistory, setSelectedUserHistory] = useState<string | null>(null);

  // Modal actions states
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'add' | 'deduct' | 'edit';
    whatsapp: string;
    username: string;
    currentBalance: number;
  } | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('');

  // Recharge specific states
  const [selectedRechargeRequest, setSelectedRechargeRequest] = useState<WalletRechargeRequest | null>(null);
  const [activeRechargeAction, setActiveRechargeAction] = useState<{ type: 'approve' | 'reject'; requestId: string } | null>(null);
  const [adminRemarkInput, setAdminRemarkInput] = useState('');
  const [rechargeSearch, setRechargeSearch] = useState('');
  const [rechargeFilterStatus, setRechargeFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // Settings states
  const [minRecharge, setMinRecharge] = useState(walletSettings.minRecharge);
  const [maxRecharge, setMaxRecharge] = useState(walletSettings.maxRecharge);
  const [quickPresetsText, setQuickPresetsText] = useState(walletSettings.defaultQuickAmounts.join(', '));
  const [walletEnabled, setWalletEnabled] = useState(walletSettings.walletEnabled);
  const [autoCreditEnabled, setAutoCreditEnabled] = useState(walletSettings.autoCreditEnabled);
  const [walletBonusEnabled, setWalletBonusEnabled] = useState(walletSettings.walletBonusEnabled);
  const [successMsg, setSuccessMsg] = useState(walletSettings.rechargeSuccessMessage);
  const [failureMsg, setFailureMsg] = useState(walletSettings.rechargeFailureMessage);

  // Calculated Stats
  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalAdded = transactions.filter(t => t.type === 'Credit' && t.status === 'Success').reduce((acc, t) => acc + t.amount, 0);
  const totalSpent = transactions.filter(t => t.type === 'Debit' && t.status === 'Success').reduce((acc, t) => acc + t.amount, 0);

  const todayStr = new Date().toISOString().substring(0, 10);
  const todayRecharge = transactions
    .filter(t => t.type === 'Credit' && t.status === 'Success' && t.date.startsWith(todayStr))
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingCount = transactions.filter(t => t.status === 'Pending').length;
  const successCount = transactions.filter(t => t.status === 'Success').length;
  const failedCount = transactions.filter(t => t.status === 'Failed').length;
  const pendingRechargesCount = rechargeRequests.filter(r => r.status === 'Pending').length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const presetsArray = quickPresetsText
      .split(',')
      .map(p => parseInt(p.trim()))
      .filter(p => !isNaN(p));

    onUpdateSettings({
      minRecharge: Number(minRecharge),
      maxRecharge: Number(maxRecharge),
      defaultQuickAmounts: presetsArray,
      walletEnabled,
      autoCreditEnabled,
      walletBonusEnabled,
      rechargeSuccessMessage: successMsg,
      rechargeFailureMessage: failureMsg,
    });
    alert('Wallet Settings updated successfully inside database!');
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionModal) return;
    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive numeric amount');
      return;
    }

    const { type, whatsapp, currentBalance } = activeActionModal;
    let newBalance = currentBalance;

    if (type === 'add') {
      newBalance = currentBalance + amount;
      onUpdateWallet(whatsapp, newBalance, 'Active', 'credit', amount);
    } else if (type === 'deduct') {
      if (currentBalance < amount) {
        alert('Deduction amount exceeds user current balance!');
        return;
      }
      newBalance = currentBalance - amount;
      onUpdateWallet(whatsapp, newBalance, 'Active', 'debit', amount);
    } else if (type === 'edit') {
      newBalance = amount;
      onUpdateWallet(whatsapp, newBalance, 'Active', 'edit', amount);
    }

    alert(`Successfully processed wallet ${type} action!`);
    setActiveActionModal(null);
    setActionAmount('');
  };

  const handleFreezeToggle = (whatsapp: string, currentStatus: 'Active' | 'Frozen') => {
    const newStatus = currentStatus === 'Active' ? 'Frozen' : 'Active';
    const targetWallet = wallets.find(w => w.whatsapp === whatsapp);
    onUpdateWallet(whatsapp, targetWallet?.balance || 0, newStatus);
    alert(`Wallet status set to: ${newStatus}`);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ wallets, transactions, walletLogs }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zyro_wallet_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Build users wallet data map
  const mappedWalletUsers = users.map((u, index) => {
    const userWallet = wallets.find(w => w.whatsapp.replace(/\s+/g, '') === u.whatsapp.replace(/\s+/g, '')) || {
      whatsapp: u.whatsapp,
      username: u.username,
      balance: 0,
      totalAdded: 0,
      totalSpent: 0,
      lastRecharge: 'N/A',
      status: 'Active' as const
    };

    return {
      userId: `USR-${1000 + index}`,
      username: u.username,
      whatsapp: u.whatsapp,
      balance: userWallet.balance,
      totalAdded: userWallet.totalAdded,
      totalSpent: userWallet.totalSpent,
      lastRecharge: userWallet.lastRecharge || 'N/A',
      status: userWallet.status,
    };
  });

  const filteredUsers = mappedWalletUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.whatsapp.includes(searchQuery)
  );

  return (
    <div className="flex-1 p-6 text-left flex flex-col gap-6 overflow-y-auto h-screen no-scrollbar">
      
      {/* Header Block */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-white font-black text-lg uppercase tracking-wider">Wallet Operations Center</h2>
          <p className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider mt-1">
            Configure default thresholds, auto-credits, and manage virtual balances
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 transition-colors"
        >
          <i className="fa-solid fa-file-export text-xs"></i>
          <span>Export All Data</span>
        </button>
      </div>

      {/* DASHBOARD STATS SECTION */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 select-none">
        {/* Card 1: Total Wallet Balance */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Total Users Balance</span>
          <span className="text-[#22c55e] font-black text-xl block mt-1">₹{totalBalance.toFixed(2)}</span>
        </div>
        {/* Card 2: Total Added */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Total Deposits (Added)</span>
          <span className="text-emerald-400 font-black text-xl block mt-1">₹{totalAdded.toFixed(2)}</span>
        </div>
        {/* Card 3: Total Money Spent */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Total Spent (Debits)</span>
          <span className="text-blue-400 font-black text-xl block mt-1">₹{totalSpent.toFixed(2)}</span>
        </div>
        {/* Card 4: Today's Recharge */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Today's Recharge</span>
          <span className="text-purple-400 font-black text-xl block mt-1">₹{todayRecharge.toFixed(2)}</span>
        </div>
        {/* Card 5: Pending Depo */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Pending deposits</span>
          <span className="text-amber-400 font-black text-xl block mt-1">{pendingCount} Txns</span>
        </div>
        {/* Card 6: Successful Depo */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Completed Depo</span>
          <span className="text-[#22c55e] font-black text-xl block mt-1">{successCount} Txns</span>
        </div>
        {/* Card 7: Failed Depo */}
        <div className="bg-[#0B1528] border border-slate-900 rounded-2xl p-4.5">
          <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-wider block">Failed deposits</span>
          <span className="text-rose-400 font-black text-xl block mt-1">{failedCount} Txns</span>
        </div>
      </section>

      {/* OPERATIONS NAVIGATION SECTION */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col gap-5">
        
        {/* Sub-Tabs Selector */}
        <div className="flex border-b border-slate-900 select-none">
          <button
            onClick={() => { setSubTab('users'); setSelectedUserHistory(null); }}
            className={`px-5 py-3 text-[10.5px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              subTab === 'users' ? 'border-[#22C55E] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-users-viewfinder mr-1.5"></i>
            <span>Wallet Users</span>
          </button>
          <button
            onClick={() => { setSubTab('transactions'); setSelectedUserHistory(null); }}
            className={`px-5 py-3 text-[10.5px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              subTab === 'transactions' ? 'border-[#22C55E] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-money-bill-transfer mr-1.5"></i>
            <span>Deposit Requests ({pendingCount})</span>
          </button>
          <button
            onClick={() => { setSubTab('recharges'); setSelectedUserHistory(null); }}
            className={`px-5 py-3 text-[10.5px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              subTab === 'recharges' ? 'border-[#22C55E] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-receipt mr-1.5 text-emerald-400"></i>
            <span>Recharge Requests ({pendingRechargesCount})</span>
          </button>
          <button
            onClick={() => { setSubTab('settings'); setSelectedUserHistory(null); }}
            className={`px-5 py-3 text-[10.5px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              subTab === 'settings' ? 'border-[#22C55E] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-sliders mr-1.5"></i>
            <span>Wallet Configuration</span>
          </button>
          <button
            onClick={() => { setSubTab('logs'); setSelectedUserHistory(null); }}
            className={`px-5 py-3 text-[10.5px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              subTab === 'logs' ? 'border-[#22C55E] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <i className="fa-solid fa-list-check mr-1.5"></i>
            <span>System Logs</span>
          </button>
        </div>

        {/* SUB-VIEW 1: WALLET USERS TABLE */}
        {subTab === 'users' && (
          <div className="flex flex-col gap-4">
            
            {/* Search Bar / Filter */}
            <div className="flex gap-3 justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search user by name or WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-slate-900/60 border border-slate-900 rounded-xl py-2 px-3 text-xs text-white font-semibold focus:outline-none focus:border-green-500 text-left"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-slate-900 rounded-xl overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-900 select-none">
                    <th className="p-3.5">User ID</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5 text-right">Wallet Balance</th>
                    <th className="p-3.5 text-right">Total Added</th>
                    <th className="p-3.5 text-right">Total Spent</th>
                    <th className="p-3.5 text-center">Last Recharge</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-bold text-xs text-slate-300">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u.whatsapp} className="hover:bg-slate-900/20">
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{u.userId}</td>
                        <td className="p-3.5 uppercase">{u.username}</td>
                        <td className="p-3.5 font-mono">{u.whatsapp}</td>
                        <td className="p-3.5 text-right text-emerald-400 font-black">₹{u.balance.toFixed(2)}</td>
                        <td className="p-3.5 text-right text-slate-400">₹{u.totalAdded.toFixed(2)}</td>
                        <td className="p-3.5 text-right text-slate-400">₹{u.totalSpent.toFixed(2)}</td>
                        <td className="p-3.5 text-center text-slate-500 font-mono text-[10px]">{u.lastRecharge}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              u.status === 'Active'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                                : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5 select-none">
                            {/* Add Balance */}
                            <button
                              onClick={() => setActiveActionModal({ type: 'add', whatsapp: u.whatsapp, username: u.username, currentBalance: u.balance })}
                              className="bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-900/40 text-emerald-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              title="Add Balance"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                            </button>
                            {/* Deduct Balance */}
                            <button
                              onClick={() => setActiveActionModal({ type: 'deduct', whatsapp: u.whatsapp, username: u.username, currentBalance: u.balance })}
                              className="bg-blue-950/50 hover:bg-blue-900/40 border border-blue-900/40 text-blue-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              title="Deduct Balance"
                            >
                              <i className="fa-solid fa-minus text-[10px]"></i>
                            </button>
                            {/* Edit Balance */}
                            <button
                              onClick={() => setActiveActionModal({ type: 'edit', whatsapp: u.whatsapp, username: u.username, currentBalance: u.balance })}
                              className="bg-slate-900 hover:bg-slate-800 text-slate-300 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              title="Set Exact Balance"
                            >
                              <i className="fa-solid fa-pen text-[10px]"></i>
                            </button>
                            {/* View History */}
                            <button
                              onClick={() => setSelectedUserHistory(u.whatsapp)}
                              className="bg-purple-950/50 hover:bg-purple-900/40 border border-purple-900/40 text-purple-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              title="Statement History"
                            >
                              <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                            </button>
                            {/* Freeze/Unfreeze Toggle */}
                            <button
                              onClick={() => handleFreezeToggle(u.whatsapp, u.status)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                                u.status === 'Active'
                                  ? 'bg-rose-950/50 hover:bg-rose-900/40 border border-rose-900/40 text-rose-400'
                                  : 'bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-900/40 text-emerald-400'
                              }`}
                              title={u.status === 'Active' ? "Freeze Account" : "Unfreeze Account"}
                            >
                              <i className={u.status === 'Active' ? "fa-solid fa-snowflake text-[10px]" : "fa-solid fa-sun text-[10px]"}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 uppercase">No customer accounts registered yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SELECTED USER TRANSACTION HISTORY SHEET (DRAWER) */}
            {selectedUserHistory && (
              <div className="mt-4 p-5 bg-slate-900/40 border border-slate-900 rounded-2xl relative select-none animate-in slide-in-from-top-3 duration-200">
                <button
                  onClick={() => setSelectedUserHistory(null)}
                  className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Close History
                </button>
                <h5 className="text-white font-black text-xs uppercase mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-[#22c55e]"></i>
                  <span>Statement Log for WhatsApp ID: {selectedUserHistory}</span>
                </h5>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-800/80 pr-1 select-text">
                  {transactions.filter(t => t.whatsapp === selectedUserHistory).length > 0 ? (
                    transactions
                      .filter(t => t.whatsapp === selectedUserHistory)
                      .map(t => (
                        <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-white font-extrabold uppercase">{t.type} via {t.paymentMethod}</span>
                            <span className="text-[10px] font-mono text-slate-500 block">{t.id} • {t.date}</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${t.type === 'Credit' ? 'text-emerald-400' : 'text-[#22c55e]'}`}>
                              {t.type === 'Credit' ? '+' : '-'}₹{t.amount}
                            </span>
                            <span className="text-[10px] text-slate-500 block">Balance After: ₹{t.balanceAfter}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-500 font-bold uppercase text-[10px] py-4">No historic statement transactions recorded for this customer yet</p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* SUB-VIEW 2: DEPOSIT REQUESTS */}
        {subTab === 'transactions' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center select-none">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Deposit Verification Queue</h4>
              <button
                onClick={onClearTransactions}
                className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-colors"
              >
                Clear Transaction Database
              </button>
            </div>

            <div className="border border-slate-900 rounded-xl overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-900 select-none">
                    <th className="p-3.5">Transaction ID</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Type</th>
                    <th className="p-3.5 text-center">Method</th>
                    <th className="p-3.5 text-center">Date & Time</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-bold text-xs text-slate-300">
                  {transactions.length > 0 ? (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/20">
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">{t.id}</td>
                        <td className="p-3.5 uppercase">{t.username}</td>
                        <td className="p-3.5 font-mono">{t.whatsapp}</td>
                        <td className="p-3.5 text-right text-white font-black">₹{t.amount}</td>
                        <td className="p-3.5 text-center text-slate-400">{t.type}</td>
                        <td className="p-3.5 text-center text-slate-400">{t.paymentMethod}</td>
                        <td className="p-3.5 text-center text-slate-500 font-mono text-[10px]">{t.date}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              t.status === 'Success'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                                : t.status === 'Pending'
                                ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                                : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5 select-none">
                            {t.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => onApproveTransaction(t.id)}
                                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-900 text-emerald-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                  title="Approve & Credit Wallet"
                                >
                                  <i className="fa-solid fa-check text-[10px]"></i>
                                </button>
                                <button
                                  onClick={() => onRejectTransaction(t.id)}
                                  className="bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                  title="Reject Transaction"
                                >
                                  <i className="fa-solid fa-xmark text-[10px]"></i>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => onDeleteTransaction(t.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                              title="Delete Log"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 uppercase">No transaction database records present</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: WALLET SETTINGS CONFIGURATION */}
        {subTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left select-none animate-in fade-in duration-200">
            
            {/* Setting: Minimum Recharge */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Minimum Recharge Amount (₹)</label>
              <input
                type="number"
                value={minRecharge}
                onChange={(e) => setMinRecharge(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Setting: Maximum Recharge */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Maximum Recharge Amount (₹)</label>
              <input
                type="number"
                value={maxRecharge}
                onChange={(e) => setMaxRecharge(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Setting: Quick presets */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Quick Preset Buttons (Comma Separated)</label>
              <input
                type="text"
                value={quickPresetsText}
                onChange={(e) => setQuickPresetsText(e.target.value)}
                placeholder="e.50, 100, 200"
                className="w-full bg-slate-900 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Setting: Success MSG */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Recharge Success Message</label>
              <input
                type="text"
                value={successMsg}
                onChange={(e) => setSuccessMsg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Setting: Failure MSG */}
            <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Recharge Failure Message</label>
              <input
                type="text"
                value={failureMsg}
                onChange={(e) => setFailureMsg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-1 md:col-span-2 py-2">
              {/* Wallet Enable */}
              <label className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walletEnabled}
                  onChange={(e) => setWalletEnabled(e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <div>
                  <span className="text-white text-xs font-black uppercase tracking-wider block">Enable Wallet System</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">Show/Hide Wallet Section</span>
                </div>
              </label>

              {/* Auto Credit */}
              <label className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreditEnabled}
                  onChange={(e) => setAutoCreditEnabled(e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <div>
                  <span className="text-white text-xs font-black uppercase tracking-wider block">Auto Credit Balance</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">Instant Approve No Review</span>
                </div>
              </label>

              {/* Bonus */}
              <label className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walletBonusEnabled}
                  onChange={(e) => setWalletBonusEnabled(e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <div>
                  <span className="text-white text-xs font-black uppercase tracking-wider block">Enable Wallet Bonus</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">Give 5% Extra On Recharges</span>
                </div>
              </label>
            </div>

            {/* Save Buttons */}
            <div className="col-span-1 md:col-span-2 pt-2">
              <button
                type="submit"
                className="bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-green-950/25 cursor-pointer transition-colors"
              >
                Save System Settings
              </button>
            </div>

          </form>
        )}

        {/* SUB-VIEW 4: SYSTEM LOGS */}
        {subTab === 'logs' && (
          <div className="flex flex-col gap-3 text-left">
            <h4 className="text-white font-black text-xs uppercase tracking-wider select-none">Wallet System Audit Trail</h4>
            <div className="bg-[#0A0F1E] border border-slate-900 rounded-xl p-4 max-h-[400px] overflow-y-auto divide-y divide-slate-900">
              {walletLogs.length > 0 ? (
                walletLogs.map((log) => (
                  <div key={log.id} className="py-2 flex justify-between items-start gap-4 text-[11px]">
                    <div className="flex-1">
                      <span className="bg-slate-900 text-slate-400 font-mono px-1.5 py-0.5 rounded text-[9px] uppercase mr-2 select-all">
                        {log.whatsapp}
                      </span>
                      <span className="text-white font-bold uppercase tracking-wide">{log.action}:</span>
                      <p className="text-slate-400 mt-1">{log.details}</p>
                    </div>
                    <span className="text-slate-600 font-mono text-[9px] select-none shrink-0">{log.timestamp}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 font-extrabold uppercase text-[10px] py-4 text-center select-none">No system security actions logged yet</p>
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW 5: WALLET RECHARGE REQUESTS */}
        {subTab === 'recharges' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <h4 className="text-white font-black text-xs uppercase tracking-wider select-none">
                Wallet Manual Recharge Verification requests
              </h4>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by UTR, User or ID..."
                    value={rechargeSearch}
                    onChange={(e) => setRechargeSearch(e.target.value)}
                    className="w-full pl-9 bg-slate-900 border border-slate-900 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-green-500 text-left"
                  />
                </div>
                <select
                  value={rechargeFilterStatus}
                  onChange={(e: any) => setRechargeFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-900 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-green-500 font-bold uppercase tracking-wide cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Recharge Table Container */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-wider select-none">
                      <th className="py-3.5 px-4">Request ID</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4">UTR Number</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Receipt</th>
                      <th className="py-3.5 px-4">Date Submitted</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300 font-semibold text-xs">
                    {rechargeRequests
                      .filter(r => {
                        const searchLower = rechargeSearch.toLowerCase().trim();
                        const matchesSearch = 
                          r.id.toLowerCase().includes(searchLower) ||
                          r.username.toLowerCase().includes(searchLower) ||
                          r.userId.includes(searchLower) ||
                          r.utrNumber.toLowerCase().includes(searchLower) ||
                          r.contactMobile.includes(searchLower);
                        
                        const matchesFilter = rechargeFilterStatus === 'All' || r.status === rechargeFilterStatus;
                        return matchesSearch && matchesFilter;
                      })
                      .length > 0 ? (
                        rechargeRequests
                          .filter(r => {
                            const searchLower = rechargeSearch.toLowerCase().trim();
                            const matchesSearch = 
                              r.id.toLowerCase().includes(searchLower) ||
                              r.username.toLowerCase().includes(searchLower) ||
                              r.userId.includes(searchLower) ||
                              r.utrNumber.toLowerCase().includes(searchLower) ||
                              r.contactMobile.includes(searchLower);
                            
                            const matchesFilter = rechargeFilterStatus === 'All' || r.status === rechargeFilterStatus;
                            return matchesSearch && matchesFilter;
                          })
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-slate-900/25 transition-colors">
                              <td className="py-3 px-4 font-mono text-[11px] text-white uppercase select-all">
                                {req.id}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="text-white font-extrabold uppercase text-[11px]">{req.username}</span>
                                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">{req.userId}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400 font-mono font-black">
                                ₹{req.rechargeAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] tracking-wide select-all text-slate-400">
                                {req.utrNumber}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                                {req.contactMobile}
                              </td>
                              <td className="py-3 px-4">
                                {req.screenshot ? (
                                  <button
                                    onClick={() => setSelectedRechargeRequest(req)}
                                    className="bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22c55e] text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded border border-[#22C55E]/10 cursor-pointer transition-colors"
                                  >
                                    <i className="fa-solid fa-image mr-1"></i>
                                    <span>View Proof</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-600 font-bold uppercase select-none">No Screenshot</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-[10px] font-mono text-slate-500">
                                {req.createdAt}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {req.status === 'Pending' && (
                                  <span className="inline-block bg-amber-500/10 text-amber-500 border border-amber-500/10 text-[9px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    Pending
                                  </span>
                                )}
                                {req.status === 'Approved' && (
                                  <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    Approved
                                  </span>
                                )}
                                {req.status === 'Rejected' && (
                                  <span className="inline-block bg-rose-500/10 text-rose-500 border border-rose-500/10 text-[9px] font-black uppercase px-2 py-0.5 rounded-full select-none">
                                    Rejected
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end items-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedRechargeRequest(req)}
                                    title="View Details"
                                    className="w-7 h-7 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-slate-800 transition-colors"
                                  >
                                    <i className="fa-solid fa-eye text-[11px]"></i>
                                  </button>
                                  {req.status === 'Pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveRechargeAction({ type: 'approve', requestId: req.id });
                                          setAdminRemarkInput('');
                                        }}
                                        title="Approve & Credit Wallet"
                                        className="w-7 h-7 rounded bg-emerald-950/40 hover:bg-emerald-950 text-emerald-400 flex items-center justify-center cursor-pointer border border-emerald-900/50 transition-colors"
                                      >
                                        <i className="fa-solid fa-check text-[11px]"></i>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveRechargeAction({ type: 'reject', requestId: req.id });
                                          setAdminRemarkInput('');
                                        }}
                                        title="Reject Payment"
                                        className="w-7 h-7 rounded bg-rose-950/40 hover:bg-rose-950 text-rose-400 flex items-center justify-center cursor-pointer border border-rose-900/50 transition-colors"
                                      >
                                        <i className="fa-solid fa-ban text-[11px]"></i>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => onDeleteRechargeRequest?.(req.id)}
                                    title="Delete Record"
                                    className="w-7 h-7 rounded bg-slate-900 hover:bg-rose-950 hover:text-rose-400 text-slate-500 flex items-center justify-center cursor-pointer border border-slate-800 hover:border-rose-900/50 transition-colors"
                                  >
                                    <i className="fa-regular fa-trash-can text-[11px]"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500 font-extrabold uppercase text-[10px] tracking-wider select-none">
                            No recharge requests matching the selection found
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ADMIN ACTION DIALOG/MODAL */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-200">
          <div className="bg-slate-950 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-900 overflow-hidden text-slate-300">
            
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">
                {activeActionModal.type === 'add' ? 'Credit Wallet' : activeActionModal.type === 'deduct' ? 'Deduct Wallet' : 'Set Exact Balance'}
              </h4>
              <button
                onClick={() => { setActiveActionModal(null); setActionAmount(''); }}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-5 flex flex-col gap-4 text-left">
              <div>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase">Selected User:</p>
                <h5 className="text-white font-black text-sm uppercase mt-0.5">{activeActionModal.username}</h5>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{activeActionModal.whatsapp}</span>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase">Current Balance:</p>
                <span className="text-emerald-400 font-black text-sm block mt-0.5">₹{activeActionModal.currentBalance.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                  {activeActionModal.type === 'edit' ? 'New Target Balance' : 'Amount (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-900 border border-slate-900 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-xl text-[10px] text-slate-400 leading-relaxed font-semibold">
                Proceeding will instantly apply changes to this user's wallet state and commit the transaction in the logs.
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => { setActiveActionModal(null); setActionAmount(''); }}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer shadow-md shadow-green-950/20"
                >
                  Confirm Action
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* RECHARGE REQUEST DETAILS MODAL */}
      {selectedRechargeRequest && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-900 overflow-hidden text-slate-300 text-left">
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-receipt text-emerald-400"></i>
                <h4 className="text-white font-black text-xs uppercase tracking-wider">
                  Recharge Request Details
                </h4>
              </div>
              <button
                onClick={() => setSelectedRechargeRequest(null)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
              {/* Top Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Request ID</span>
                  <span className="text-white font-mono font-bold text-xs uppercase block select-all mt-0.5">{selectedRechargeRequest.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Status</span>
                  <div className="mt-1">
                    {selectedRechargeRequest.status === 'Pending' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/10 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Pending Verification</span>}
                    {selectedRechargeRequest.status === 'Approved' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Approved & Credited</span>}
                    {selectedRechargeRequest.status === 'Rejected' && <span className="bg-rose-500/10 text-rose-500 border border-rose-500/10 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Rejected / Declined</span>}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Request Amount</span>
                  <span className="text-emerald-400 font-black text-sm block mt-0.5">₹{selectedRechargeRequest.rechargeAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Submitted Date</span>
                  <span className="text-slate-400 font-mono text-[11px] block mt-1">{selectedRechargeRequest.createdAt}</span>
                </div>
              </div>

              {/* User and Payment details */}
              <div className="flex flex-col gap-3">
                <h5 className="text-white font-black text-[10px] uppercase tracking-wider border-b border-slate-900 pb-1.5">User & Verification Info</h5>
                
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Customer Name</span>
                    <span className="text-slate-300 uppercase font-black text-[11px] mt-0.5 block">{selectedRechargeRequest.username}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">WhatsApp Number</span>
                    <span className="text-slate-300 font-mono mt-0.5 block select-all">{selectedRechargeRequest.userId}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">UTR / Transaction ID</span>
                    <span className="text-white font-mono font-bold select-all mt-0.5 block">{selectedRechargeRequest.utrNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Contact Mobile</span>
                    <span className="text-slate-300 font-mono mt-0.5 block select-all">{selectedRechargeRequest.contactMobile}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Payment Method</span>
                    <span className="text-slate-300 uppercase font-bold text-[10px] mt-0.5 block">{selectedRechargeRequest.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Remarks block */}
              {selectedRechargeRequest.remarks && (
                <div className="bg-slate-900/20 p-3.5 rounded-xl border border-slate-900 text-xs">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">User Remarks:</span>
                  <p className="text-slate-400 mt-1 italic leading-relaxed">"{selectedRechargeRequest.remarks}"</p>
                </div>
              )}

              {/* Admin response log */}
              {selectedRechargeRequest.status !== 'Pending' && (
                <div className="bg-[#0B1528] p-3.5 rounded-xl border border-slate-900 text-xs flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Admin Processing Log:</span>
                  {selectedRechargeRequest.approvedAt && (
                    <p className="text-slate-300">Approved Date: <span className="font-mono text-slate-400">{selectedRechargeRequest.approvedAt}</span></p>
                  )}
                  {selectedRechargeRequest.adminRemarks && (
                    <p className="text-slate-300">Admin Remarks: <span className="font-bold text-white">"{selectedRechargeRequest.adminRemarks}"</span></p>
                  )}
                </div>
              )}

              {/* Screenshot block if present */}
              {selectedRechargeRequest.screenshot && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Payment Proof Screenshot:</span>
                  <div className="border border-slate-900 bg-slate-950/60 p-2 rounded-xl flex items-center justify-center overflow-hidden max-h-[300px]">
                    <img
                      src={selectedRechargeRequest.screenshot}
                      alt="Payment Receipt Screenshot"
                      className="max-w-full max-h-[280px] object-contain rounded-lg hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Action shortcuts in details view if pending */}
              {selectedRechargeRequest.status === 'Pending' && (
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setActiveRechargeAction({ type: 'reject', requestId: selectedRechargeRequest.id });
                      setSelectedRechargeRequest(null);
                    }}
                    className="flex-1 bg-rose-950/40 hover:bg-rose-950 border border-rose-900/50 hover:border-rose-800 text-rose-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer transition-colors"
                  >
                    <i className="fa-solid fa-ban mr-1.5"></i>
                    <span>Reject Request</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveRechargeAction({ type: 'approve', requestId: selectedRechargeRequest.id });
                      setSelectedRechargeRequest(null);
                    }}
                    className="flex-1 bg-[#22C55E] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer shadow-lg shadow-green-950/20 transition-colors"
                  >
                    <i className="fa-solid fa-check mr-1.5"></i>
                    <span>Approve & Credit</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 px-5 py-3.5 border-t border-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedRechargeRequest(null)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-400 font-black text-xs uppercase tracking-wider py-2 px-4.5 rounded-xl border border-slate-800 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECHARGE PROCESS MODAL (APPROVE/REJECT) */}
      {activeRechargeAction && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 rounded-2xl w-full max-w-md shadow-2xl border border-slate-900 overflow-hidden text-slate-300 text-left">
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">
                {activeRechargeAction.type === 'approve' ? 'Approve Payment & Credit Wallet' : 'Reject Recharge Request'}
              </h4>
              <button
                onClick={() => { setActiveRechargeAction(null); setAdminRemarkInput(''); }}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (activeRechargeAction.type === 'approve') {
                  onApproveRechargeRequest?.(activeRechargeAction.requestId, adminRemarkInput);
                } else {
                  if (!adminRemarkInput.trim()) {
                    alert('Rejection reason is required!');
                    return;
                  }
                  onRejectRechargeRequest?.(activeRechargeAction.requestId, adminRemarkInput);
                }
                setActiveRechargeAction(null);
                setAdminRemarkInput('');
              }}
              className="p-5 flex flex-col gap-4 text-left"
            >
              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-900 text-xs leading-relaxed">
                <p className="text-slate-400">
                  {activeRechargeAction.type === 'approve' 
                    ? 'Verifying this payment will instantly credit the requested recharge amount (plus 5% bonus, if enabled) to the user\'s wallet and create a successful transaction record.'
                    : 'Declining this payment request will mark it as Rejected. No wallet balance changes will be applied, and the user will see the rejection status along with your remarks.'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                  {activeRechargeAction.type === 'approve' ? 'Admin Remarks (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  required={activeRechargeAction.type === 'reject'}
                  value={adminRemarkInput}
                  onChange={(e) => setAdminRemarkInput(e.target.value)}
                  placeholder={activeRechargeAction.type === 'approve' ? 'Enter any internal approval notes' : 'Enter why this request is being rejected/declined...'}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-900 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => { setActiveRechargeAction(null); setAdminRemarkInput(''); }}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl text-center cursor-pointer shadow-lg transition-colors ${
                    activeRechargeAction.type === 'approve' 
                      ? 'bg-[#22C55E] hover:bg-[#1fbd58] shadow-green-950/20' 
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
                  }`}
                >
                  {activeRechargeAction.type === 'approve' ? 'Confirm Approval' : 'Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
