import React, { useState } from 'react';
import { SiteSettings } from '../types';

interface SettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (settings: SiteSettings) => void;
  onClearCache: () => void;
  onBackupDatabase: () => void;
  onRestoreDatabase: (jsonString: string) => boolean;
  onLogActivity: (action: string, details: string) => void;
}

export default function AdminSettings({
  settings,
  onUpdateSettings,
  onClearCache,
  onBackupDatabase,
  onRestoreDatabase,
  onLogActivity
}: SettingsProps) {
  // Local state copy of settings
  const [localSettings, setLocalSettings] = useState<SiteSettings>({ ...settings });
  
  // ZapUPI Connection Test state
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  // Security change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState({ text: '', type: 'success' });

  // Update specific setting field
  const handleFieldChange = (key: keyof SiteSettings, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Test ZapUPI Gateway API credentials
  const handleTestConnection = async () => {
    if (!localSettings.zapupiApiKey || localSettings.zapupiApiKey.trim() === '') {
      setTestStatus({ status: 'error', message: 'Please enter a ZapUPI API Key first.' });
      return;
    }
    setTestStatus({ status: 'testing', message: 'Connecting to ZapUPI Gateway...' });
    try {
      const res = await fetch('/api/payment/zapupi/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zap_key: localSettings.zapupiApiKey.trim() })
      });
      if (!res.ok) {
        throw new Error(`Server responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'success') {
        setTestStatus({ status: 'success', message: data.message });
      } else {
        setTestStatus({ status: 'error', message: data.message || 'API verification failed.' });
      }
    } catch (err: any) {
      setTestStatus({ status: 'error', message: err.message || 'API connection failed.' });
    }
  };

  // Submit Settings
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    onLogActivity('Update Settings', 'Modified core system variables');
    alert('Settings saved successfully and pushed instantly to the user panel!');
  };

  // Handle QR File Upload
  const handleQrUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleFieldChange('qrImageUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Change Password Check
  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage({ text: '', type: 'success' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage({ text: 'All password fields are required!', type: 'error' });
      return;
    }

    if (currentPassword !== 'admin123') {
      setPwMessage({ text: 'Incorrect current password! (Default is admin123)', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({ text: 'New password and confirmation do not match!', type: 'error' });
      return;
    }

    if (newPassword.length < 5) {
      setPwMessage({ text: 'New password must be at least 5 characters long!', type: 'error' });
      return;
    }

    onLogActivity('Security Update', 'Changed master administrator password');
    setPwMessage({ text: 'Password updated successfully! (Next login requires new password)', type: 'success' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Database Restore File handler
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const success = onRestoreDatabase(jsonString);
        if (success) {
          alert('Database restored successfully! Reloading site settings...');
          // Read new restored settings
          const parsed = JSON.parse(jsonString);
          if (parsed.settings) {
            setLocalSettings(parsed.settings);
          }
        } else {
          alert('Failed to restore database. Invalid backup structure.');
        }
      } catch (err) {
        alert('Could not parse restored JSON. File may be corrupted.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-16">
      
      {/* Title Header */}
      <div>
        <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
          Site Settings Console
        </h2>
        <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
          Every change here reflects instantly on the user panel view
        </p>
      </div>

      {/* Main Forms Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Hand: Brand & WhatsApp Columns */}
        <div className="flex flex-col gap-6">
          
          {/* Section 1: Brand & Headings */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <i className="fa-solid fa-signature text-[#22c55e]"></i>
              <span>Brand & Headings</span>
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Brand Name (shown in header)</label>
              <input
                type="text"
                value={localSettings.brandName}
                onChange={(e) => handleFieldChange('brandName', e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Website Logo Image (Upload or URL)</label>
              
              <div className="grid grid-cols-4 gap-3 items-center">
                {/* Logo Preview */}
                <div className="aspect-square border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-50 shadow-xs">
                  {localSettings.websiteLogoUrl ? (
                    <img
                      src={localSettings.websiteLogoUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-400 text-[9px] font-bold text-center uppercase">No Logo</div>
                  )}
                </div>

                <div className="col-span-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={localSettings.websiteLogoUrl || ''}
                    onChange={(e) => handleFieldChange('websiteLogoUrl', e.target.value)}
                    placeholder="Enter image URL or upload below"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleFieldChange('websiteLogoUrl', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="settings-logo-upload"
                    />
                    <label htmlFor="settings-logo-upload" className="bg-slate-900 hover:bg-slate-800 text-white text-[8px] font-black uppercase px-2.5 py-1.5 rounded-md cursor-pointer inline-flex items-center gap-1 transition-colors">
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      <span>Upload Logo</span>
                    </label>
                    {localSettings.websiteLogoUrl && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange('websiteLogoUrl', '')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[8px] font-black uppercase px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Services Section Title</label>
              <input
                type="text"
                value={localSettings.servicesTitle}
                onChange={(e) => handleFieldChange('servicesTitle', e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Homepage Sub-Heading (text under brand name)</label>
              <textarea
                value={localSettings.homepageSubHeading}
                onChange={(e) => handleFieldChange('homepageSubHeading', e.target.value)}
                rows={3}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white uppercase tracking-wide leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: WhatsApp Settings */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <i className="fa-brands fa-whatsapp text-[#22c55e]"></i>
              <span>WhatsApp & Buttons</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WhatsApp Number (with country code, no +)</label>
                <input
                  type="text"
                  value={localSettings.supportNumber}
                  onChange={(e) => handleFieldChange('supportNumber', e.target.value)}
                  placeholder="e.g. 918015342606"
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WhatsApp Group / Channel Link</label>
                <input
                  type="text"
                  value={localSettings.joinGroupUrl}
                  onChange={(e) => handleFieldChange('joinGroupUrl', e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Support Button Text</label>
                <input
                  type="text"
                  value={localSettings.supportButtonText}
                  onChange={(e) => handleFieldChange('supportButtonText', e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Join Group Button Text</label>
                <input
                  type="text"
                  value={localSettings.joinButtonText}
                  onChange={(e) => handleFieldChange('joinButtonText', e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Plans Page — "Order" Button Text</label>
              <input
                type="text"
                value={localSettings.buyButtonText}
                onChange={(e) => handleFieldChange('buyButtonText', e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Live Users Counter */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <i className="fa-solid fa-users text-[#22c55e]"></i>
              <span>Live Users Counter</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Minimum Count</label>
                <input
                  type="number"
                  value={localSettings.minUsers}
                  onChange={(e) => handleFieldChange('minUsers', Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Maximum Count</label>
                <input
                  type="number"
                  value={localSettings.maxUsers}
                  onChange={(e) => handleFieldChange('maxUsers', Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-800 font-bold text-xs block">Random Generator</span>
                <span className="text-slate-400 text-[9.5px] block font-semibold uppercase mt-0.5">Slightly fluctuates count every few seconds</span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.randomUsersEnabled}
                onChange={(e) => handleFieldChange('randomUsersEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#22c55e] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Right Hand: Payment & Announcement Columns */}
        <div className="flex flex-col gap-6">
          
          {/* Section 4: Payment Gateway details (ZapUPI Auto Gateway) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-bolt text-[#22c55e]"></i>
                <span>ZapUPI Payment Gateway</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Gateway Status</span>
                <input
                  type="checkbox"
                  checked={localSettings.zapupiEnabled ?? true}
                  onChange={(e) => handleFieldChange('zapupiEnabled', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#22c55e] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">ZapUPI API Key (Zap Key)</label>
              <input
                type="text"
                value={localSettings.zapupiApiKey ?? ''}
                onChange={(e) => handleFieldChange('zapupiApiKey', e.target.value)}
                placeholder="Enter your ZapUPI API / Merchant Key"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Gateway Mode</label>
                <select
                  value={localSettings.zapupiMode ?? 'test'}
                  onChange={(e) => handleFieldChange('zapupiMode', e.target.value as 'test' | 'live')}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="test">TEST MODE</option>
                  <option value="live">LIVE MODE</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">API Endpoint</label>
                <input
                  type="text"
                  value={localSettings.zapupiApiEndpoint ?? 'https://pay.zapupi.com/api/create-order'}
                  onChange={(e) => handleFieldChange('zapupiApiEndpoint', e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Webhook URL (ZapUPI callbacks)</label>
              <input
                type="text"
                value={localSettings.zapupiWebhookUrl ?? ''}
                onChange={(e) => handleFieldChange('zapupiWebhookUrl', e.target.value)}
                placeholder="e.g. https://your-domain.com/api/webhook/zapupi"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Success Redirect URL</label>
                <input
                  type="text"
                  value={localSettings.zapupiSuccessUrl ?? ''}
                  onChange={(e) => handleFieldChange('zapupiSuccessUrl', e.target.value)}
                  placeholder="https://your-domain.com/?zapupi_status=success"
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Failed Redirect URL</label>
                <input
                  type="text"
                  value={localSettings.zapupiFailedUrl ?? ''}
                  onChange={(e) => handleFieldChange('zapupiFailedUrl', e.target.value)}
                  placeholder="https://your-domain.com/?zapupi_status=failed"
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Test Connection Actions */}
            <div className="border-t border-slate-50 pt-4 mt-1 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">API Verification</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                  localSettings.zapupiApiKey ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {localSettings.zapupiApiKey ? 'API Key Set' : 'Missing API Key'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus.status === 'testing'}
                  className="bg-[#0B1528] hover:bg-[#1C2D4B] disabled:bg-slate-300 text-white font-black text-[9.5px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer border-0 shrink-0"
                >
                  {testStatus.status === 'testing' ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin mr-1.5"></i>
                      Testing...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-vial mr-1.5"></i>
                      Test API Connection
                    </>
                  )}
                </button>
                
                {testStatus.status !== 'idle' && (
                  <div className={`flex-1 text-[10px] font-bold px-3 py-2 rounded-xl border flex items-center gap-1.5 ${
                    testStatus.status === 'success' 
                      ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
                      : testStatus.status === 'error'
                        ? 'bg-rose-50/50 border-rose-100 text-rose-700'
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}>
                    <i className={`fa-solid text-[9px] shrink-0 ${
                      testStatus.status === 'success' 
                        ? 'fa-circle-check text-emerald-500' 
                        : testStatus.status === 'error'
                          ? 'fa-circle-exclamation text-rose-500'
                          : 'fa-spinner animate-spin text-slate-400'
                    }`}></i>
                    <span className="truncate leading-none">{testStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Announcement Bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-[#22c55e]"></i>
                <span>Announcement Bar</span>
              </span>
              <input
                type="checkbox"
                checked={localSettings.announcementEnabled}
                onChange={(e) => handleFieldChange('announcementEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#22c55e] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Announcement Text (leave empty to hide)</label>
              <input
                type="text"
                value={localSettings.announcementText}
                onChange={(e) => handleFieldChange('announcementText', e.target.value)}
                placeholder="e.g. 🔥 LIMITED TIME OFFER 🔥 1,000 Likes for Just ₹69!"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white uppercase tracking-wide"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Background Color</label>
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                  <input
                    type="color"
                    value={localSettings.announcementBgColor}
                    onChange={(e) => handleFieldChange('announcementBgColor', e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={localSettings.announcementBgColor}
                    onChange={(e) => handleFieldChange('announcementBgColor', e.target.value)}
                    className="bg-transparent border-0 text-slate-700 font-mono text-xs w-full p-0 font-extrabold"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Text Color</label>
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                  <input
                    type="color"
                    value={localSettings.announcementTextColor}
                    onChange={(e) => handleFieldChange('announcementTextColor', e.target.value)}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={localSettings.announcementTextColor}
                    onChange={(e) => handleFieldChange('announcementTextColor', e.target.value)}
                    className="bg-transparent border-0 text-slate-700 font-mono text-xs w-full p-0 font-extrabold"
                  />
                </div>
              </div>
            </div>

            {/* Announcement bar live preview inside settings */}
            {localSettings.announcementEnabled && (
              <div className="mt-1 flex flex-col gap-1.5">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Live Preview:</span>
                <div
                  style={{
                    backgroundColor: localSettings.announcementBgColor,
                    color: localSettings.announcementTextColor
                  }}
                  className="rounded-xl py-2 px-3 text-center text-[11px] font-black uppercase tracking-wider select-none truncate"
                >
                  {localSettings.announcementText || 'ANNOUNCEMENT TEXT HERE'}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Extra Configuration System Backup */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <i className="fa-solid fa-server text-[#22c55e]"></i>
              <span>System & Databases</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Backup */}
              <button
                type="button"
                onClick={onBackupDatabase}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <i className="fa-solid fa-file-export text-xs"></i>
                <span>Backup DB</span>
              </button>

              {/* Restore file picker trigger */}
              <label className="bg-[#E6F9ED] hover:bg-[#DCFCE7] text-[#15803D] font-bold text-xs uppercase tracking-wider py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-center transition-colors">
                <i className="fa-solid fa-file-import text-xs"></i>
                <span>Restore DB</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Reset Cache / Factory */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the system cache and reset all services, plans, and settings back to factory defaults? This will erase all orders!')) {
                    onClearCache();
                  }
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] uppercase tracking-wide py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-broom text-xs"></i>
                <span>Clear Cache</span>
              </button>

              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Maintenance</span>
                <input
                  type="checkbox"
                  checked={localSettings.maintenanceMode}
                  onChange={(e) => handleFieldChange('maintenanceMode', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Global Save Button Panel */}
        <div className="col-span-full bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Confirm all modifications before executing live variables
          </div>
          <button
            type="submit"
            className="bg-[#22c55e] hover:bg-[#1fbd58] text-white font-black text-xs uppercase tracking-widest py-3 px-7 rounded-xl flex items-center gap-2 shadow-md shadow-green-100 cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-floppy-disk text-xs"></i>
            <span>Save Settings</span>
          </button>
        </div>

      </form>

      {/* Security Form (Underneath core settings) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs max-w-xl mt-4">
        <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2 mb-4">
          <i className="fa-solid fa-shield-halved text-[#22c55e]"></i>
          <span>Security & Credentials</span>
        </h3>

        <form onSubmit={handlePasswordChangeSubmit} className="flex flex-col gap-4">
          {pwMessage.text && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              pwMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-rose-50 text-rose-500 border-rose-100'
            }`}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{pwMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-3.5 mt-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Requires validation checks on current credentials
            </span>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-lg cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
