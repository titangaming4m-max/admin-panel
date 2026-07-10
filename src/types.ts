export interface Plan {
  id: string;
  serviceId: number;
  name: string; // Plan name (e.g., DRIPCLIENT PROXY NON ROOT PANEL)
  category: string; // duration (e.g., 7 DAYS, 14 DAYS, 30 DAYS, 365 DAYS)
  duration: string; // e.g., "7 Days"
  price: number;
  oldPrice: number;
  qty: number;
  status: 'Active' | 'Inactive';
}

export interface Service {
  id: number;
  name: string;
  subtitle: string;
  iconType: string; // e.g. "guild_glorry", "dripclient", "prime_hook", "hg_cheat", "instagram", "youtube", "telegram", or a base64 / URL string
  verified: boolean;
  status: 'Enabled' | 'Disabled';
  order: number;
}

export interface Order {
  id: string; // e.g. ORD-10023
  customerName: string;
  whatsapp: string;
  serviceId: number;
  planId: string;
  serviceName: string;
  planName: string;
  duration: string;
  transactionId: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Paid' | 'Pending Verification' | 'Rejected';
  paymentMethod?: string;
  date: string;
}

export interface Banner {
  id: string;
  image: string; // base64 or URL
  type: 'homepage' | 'offer' | 'popup';
  status: 'Enabled' | 'Disabled';
  order: number;
}

export interface SiteSettings {
  // Brand & Headings
  brandName: string;
  servicesTitle: string;
  homepageSubHeading: string;

  // WhatsApp Settings
  supportNumber: string;
  supportButtonText: string;
  joinGroupUrl: string;
  joinButtonText: string;
  buyButtonText: string;

  // Payment Gateway
  upiId: string;
  payeeName: string;
  upiButtonText: string;
  qrImageUrl: string;

  // Announcement Bar
  announcementText: string;
  announcementBgColor: string;
  announcementTextColor: string;
  announcementEnabled: boolean;

  // Live Users Counter
  minUsers: number;
  maxUsers: number;
  randomUsersEnabled: boolean;
  autoRefreshEnabled: boolean;

  // Extra Settings
  websiteLogoUrl: string;
  faviconUrl: string;
  websiteTitle: string;
  metaDescription: string;
  footerText: string;
  instagramUrl: string;
  youtubeUrl: string;
  telegramUrl: string;
  supportEmail: string;
  themeColor: string;
  themeMode: 'light' | 'dark';
  maintenanceMode: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Wallet {
  whatsapp: string;
  username: string;
  balance: number;
  totalAdded: number;
  totalSpent: number;
  lastRecharge: string;
  status: 'Active' | 'Frozen';
}

export interface WalletTransaction {
  id: string;
  whatsapp: string;
  username: string;
  amount: number;
  type: 'Credit' | 'Debit';
  paymentMethod: string;
  status: 'Success' | 'Failed' | 'Pending';
  balanceAfter: number;
  date: string;
}

export interface WalletSettings {
  minRecharge: number;
  maxRecharge: number;
  defaultQuickAmounts: number[];
  walletEnabled: boolean;
  autoCreditEnabled: boolean;
  walletBonusEnabled: boolean;
  rechargeSuccessMessage: string;
  rechargeFailureMessage: string;
}

export interface WalletLog {
  id: string;
  whatsapp: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface WalletRechargeRequest {
  id: string;
  userId: string; // will store the whatsapp number as identifier
  username: string; // user's name
  rechargeAmount: number;
  utrNumber: string;
  contactMobile: string;
  paymentMethod: string; // 'UPI' or 'QR'
  remarks?: string;
  adminRemarks?: string;
  screenshot?: string; // base64 representation of payment screenshot
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

