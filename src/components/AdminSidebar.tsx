import React from 'react';
import { SiteSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onViewSite: () => void;
  settings?: SiteSettings;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout, onViewSite, settings }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
    { id: 'services', label: 'Services', icon: 'fa-solid fa-layer-group' },
    { id: 'plans', label: 'Plans', icon: 'fa-solid fa-cubes' },
    { id: 'orders', label: 'Orders', icon: 'fa-solid fa-cart-shopping' },
    { id: 'wallet', label: 'Wallet', icon: 'fa-solid fa-wallet' },
    { id: 'banners', label: 'Banners', icon: 'fa-solid fa-image' },
    { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear' },
  ];

  return (
    <aside className="w-64 bg-[#0A0F1E] border-r border-slate-900 flex flex-col h-screen text-slate-400 select-none shrink-0">
      
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-900">
        <div className="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-green-950/20 overflow-hidden shrink-0">
          {settings?.websiteLogoUrl ? (
            <img
              src={settings.websiteLogoUrl}
              alt={settings.brandName || "Logo"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            settings?.brandName ? settings.brandName.substring(0, 2).toUpperCase() : 'ZH'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-white font-black text-[13px] tracking-wide uppercase truncate leading-none">
              {settings?.brandName || "ZYRO HUB™"}
            </h1>
            {/* Target Check Icon top right of box */}
            <span className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center text-white text-[9px]">
              <i className="fa-solid fa-check"></i>
            </span>
          </div>
          <p className="text-slate-600 font-extrabold text-[9px] uppercase tracking-wider mt-1">
            Control Center
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>

        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-green-950/20 font-black'
                  : 'hover:bg-slate-900/60 hover:text-slate-200 text-slate-500'
              }`}
            >
              <i className={`${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-500'}`}></i>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-900 flex flex-col gap-1">
        
        {/* View Site */}
        <button
          onClick={onViewSite}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-900/60 hover:text-slate-200 text-slate-500 transition-all duration-200"
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-xs text-slate-500"></i>
          <span>View Site</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-rose-950/20 hover:text-rose-400 text-slate-500 transition-all duration-200"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-xs text-slate-500"></i>
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}
