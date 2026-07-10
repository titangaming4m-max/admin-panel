import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminServices from './AdminServices';
import AdminPlans from './AdminPlans';
import AdminOrders from './AdminOrders';
import AdminBanners from './AdminBanners';
import AdminSettings from './AdminSettings';
import AdminLogin from './AdminLogin';
import AdminWallet from './AdminWallet';

import { Service, Plan, Order, Banner, SiteSettings, ActivityLog, Wallet, WalletTransaction, WalletSettings, WalletLog, WalletRechargeRequest } from '../types';

interface AdminConsoleProps {
  services: Service[];
  plans: Plan[];
  orders: Order[];
  banners: Banner[];
  settings: SiteSettings;
  activityLogs: ActivityLog[];
  
  users: { username: string; whatsapp: string; dateJoined: string }[];
  wallets: Wallet[];
  transactions: WalletTransaction[];
  walletSettings: WalletSettings;
  walletLogs: WalletLog[];
  rechargeRequests?: WalletRechargeRequest[];
  onUpdateWallet: (whatsapp: string, balance: number, status: 'Active' | 'Frozen', type?: 'credit' | 'debit' | 'edit', amt?: number) => void;
  onUpdateWalletSettings: (settings: WalletSettings) => void;
  onApproveTransaction: (txnId: string) => void;
  onRejectTransaction: (txnId: string) => void;
  onDeleteTransaction: (txnId: string) => void;
  onClearTransactions: () => void;
  onApproveRechargeRequest?: (id: string, adminRemarks?: string) => void;
  onRejectRechargeRequest?: (id: string, adminRemarks: string) => void;
  onDeleteRechargeRequest?: (id: string) => void;
  
  onAddService: (service: Omit<Service, 'id'>) => void;
  onEditService: (service: Service) => void;
  onDeleteService: (id: number) => void;
  onReorderServices: (reorderedList: Service[]) => void;
  
  onAddPlan: (plan: Omit<Plan, 'id'>) => void;
  onEditPlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
  
  onUpdateOrderStatus: (id: string, status: Order['status']) => void;
  onDeleteOrder: (id: string) => void;
  
  onAddBanner: (banner: Omit<Banner, 'id'>) => void;
  onEditBanner: (banner: Banner) => void;
  onDeleteBanner: (id: string) => void;
  
  onUpdateSettings: (settings: SiteSettings) => void;
  onClearCache: () => void;
  onBackupDatabase: () => void;
  onRestoreDatabase: (jsonString: string) => boolean;
  onLogActivity: (action: string, details: string) => void;
  onCloseAdmin: () => void;
  
  renderServiceIcon: (type: string, className?: string) => React.ReactNode;
}

export default function AdminConsole({
  services,
  plans,
  orders,
  banners,
  settings,
  activityLogs,
  users,
  wallets,
  transactions,
  walletSettings,
  walletLogs,
  rechargeRequests = [],
  onUpdateWallet,
  onUpdateWalletSettings,
  onApproveTransaction,
  onRejectTransaction,
  onDeleteTransaction,
  onClearTransactions,
  onApproveRechargeRequest,
  onRejectRechargeRequest,
  onDeleteRechargeRequest,
  onAddService,
  onEditService,
  onDeleteService,
  onReorderServices,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAddBanner,
  onEditBanner,
  onDeleteBanner,
  onUpdateSettings,
  onClearCache,
  onBackupDatabase,
  onRestoreDatabase,
  onLogActivity,
  onCloseAdmin,
  renderServiceIcon
}: AdminConsoleProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('admin_session') === 'active';
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle successful login
  const handleLogin = (password: string) => {
    sessionStorage.setItem('admin_session', 'active');
    setIsLoggedIn(true);
    onLogActivity('Admin Login', 'Authorized administrator login session established');
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    setIsLoggedIn(false);
    onLogActivity('Admin Logout', 'Active session terminated securely');
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          onViewSite={onCloseAdmin}
          settings={settings}
        />
      </div>

      {/* Mobile Drawer Sidebar Backing */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          onLogout={handleLogout}
          onViewSite={onCloseAdmin}
          settings={settings}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top bar */}
        <header className="h-16 bg-[#0A0F1E] border-b border-slate-900 px-6 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 cursor-pointer"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-white font-extrabold text-xs uppercase tracking-widest">
                System Live Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Site Direct Action Button */}
            <button
              onClick={onCloseAdmin}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-[#22c55e] font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500/10"
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              <span>View Live Site</span>
            </button>

            {/* Admin Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-extrabold text-xs shadow-inner">
                A
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-white font-extrabold text-xs uppercase">Administrator</p>
                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Master controls</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic active tab workspace */}
        <main className="flex-1 p-6 overflow-hidden flex flex-col">
          {activeTab === 'dashboard' && (
            <AdminDashboard
              orders={orders}
              activityLogs={activityLogs}
              onTabChange={setActiveTab}
              onUpdateOrderStatus={onUpdateOrderStatus}
            />
          )}

          {activeTab === 'services' && (
            <AdminServices
              services={services}
              onAddService={onAddService}
              onEditService={onEditService}
              onDeleteService={onDeleteService}
              onReorderServices={onReorderServices}
              onLogActivity={onLogActivity}
              renderServiceIcon={renderServiceIcon}
            />
          )}

          {activeTab === 'plans' && (
            <AdminPlans
              plans={plans}
              services={services}
              onAddPlan={onAddPlan}
              onEditPlan={onEditPlan}
              onDeletePlan={onDeletePlan}
              onLogActivity={onLogActivity}
              renderServiceIcon={renderServiceIcon}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrders
              orders={orders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onDeleteOrder={onDeleteOrder}
              onLogActivity={onLogActivity}
            />
          )}

          {activeTab === 'wallet' && (
            <AdminWallet
              users={users}
              wallets={wallets}
              transactions={transactions}
              walletSettings={walletSettings}
              walletLogs={walletLogs}
              rechargeRequests={rechargeRequests}
              onUpdateWallet={onUpdateWallet}
              onUpdateSettings={onUpdateWalletSettings}
              onApproveTransaction={onApproveTransaction}
              onRejectTransaction={onRejectTransaction}
              onDeleteTransaction={onDeleteTransaction}
              onClearTransactions={onClearTransactions}
              onApproveRechargeRequest={onApproveRechargeRequest}
              onRejectRechargeRequest={onRejectRechargeRequest}
              onDeleteRechargeRequest={onDeleteRechargeRequest}
            />
          )}

          {activeTab === 'banners' && (
            <AdminBanners
              banners={banners}
              onAddBanner={onAddBanner}
              onEditBanner={onEditBanner}
              onDeleteBanner={onDeleteBanner}
              onLogActivity={onLogActivity}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettings
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onClearCache={onClearCache}
              onBackupDatabase={onBackupDatabase}
              onRestoreDatabase={onRestoreDatabase}
              onLogActivity={onLogActivity}
            />
          )}
        </main>

      </div>

    </div>
  );
}
