import { Service, Plan, SiteSettings, Order, Banner, ActivityLog } from './types';

export const INITIAL_SERVICES: Service[] = [
  {
    id: 1,
    name: 'GUILD GLORRY',
    subtitle: 'GUILD GLORRY',
    iconType: 'guild_glorry',
    verified: false,
    status: 'Enabled',
    order: 1
  },
  {
    id: 2,
    name: 'DRIPCLIENT PROXY NON ROOT PANEL',
    subtitle: 'DRIPCLIENT PROXY',
    iconType: 'dripclient',
    verified: true,
    status: 'Enabled',
    order: 2
  },
  {
    id: 3,
    name: 'PRIME HOOK NON ROOT PANEL',
    subtitle: 'NON ROOT PANEL',
    iconType: 'prime_hook',
    verified: false,
    status: 'Enabled',
    order: 3
  },
  {
    id: 4,
    name: 'HG CHEAT NON ROOT PANEL',
    subtitle: 'NON ROOT PANEL',
    iconType: 'hg_cheat',
    verified: true,
    status: 'Enabled',
    order: 4
  },
  {
    id: 5,
    name: 'INSTAGRAM',
    subtitle: 'INSTAGRAM',
    iconType: 'instagram',
    verified: true,
    status: 'Enabled',
    order: 5
  },
  {
    id: 6,
    name: 'YOUTUBE CHANNEL',
    subtitle: 'YOUTUBE CHANNEL',
    iconType: 'youtube',
    verified: false,
    status: 'Enabled',
    order: 6
  },
  {
    id: 7,
    name: 'TELEGRAM SERVICE',
    subtitle: 'TELEGRAM',
    iconType: 'telegram',
    verified: false,
    status: 'Enabled',
    order: 7
  }
];

export const INITIAL_PLANS: Plan[] = [
  // GUILD GLORRY
  { id: 'gg-7', serviceId: 1, name: 'GUILD GLORRY 7 DAYS', category: '7 DAYS', duration: '7 DAYS', price: 150, oldPrice: 250, qty: 7, status: 'Active', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', videoFileName: 'guild_glorry_demo.mp4', videoFileSize: '1 GB', videoFrameRate: '30 FPS' },
  { id: 'gg-14', serviceId: 1, name: 'GUILD GLORRY 14 DAYS', category: '14 DAYS', duration: '14 DAYS', price: 280, oldPrice: 450, qty: 14, status: 'Active' },
  { id: 'gg-30', serviceId: 1, name: 'GUILD GLORRY 30 DAYS', category: '30 DAYS', duration: '30 DAYS', price: 500, oldPrice: 800, qty: 30, status: 'Active' },
  { id: 'gg-365', serviceId: 1, name: 'GUILD GLORRY 365 DAYS', category: '365 DAYS', duration: '365 DAYS', price: 1200, oldPrice: 2000, qty: 365, status: 'Active' },
  
  // DRIPCLIENT PROXY
  { id: 'dc-7', serviceId: 2, name: 'DRIPCLIENT PROXY NON ROOT PANEL', category: '7 DAYS', duration: '7 DAYS', price: 250, oldPrice: 400, qty: 7, status: 'Active', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4', videoFileName: 'dripclient_proxy_hq.mp4', videoFileSize: '1.5 GB', videoFrameRate: '60 FPS' },
  { id: 'dc-14', serviceId: 2, name: 'DRIPCLIENT PROXY NON ROOT PANEL', category: '14 DAYS', duration: '14 DAYS', price: 500, oldPrice: 700, qty: 14, status: 'Active' },
  { id: 'dc-30', serviceId: 2, name: 'DRIPCLIENT PROXY NON ROOT PANEL', category: '30 DAYS', duration: '30 DAYS', price: 800, oldPrice: 1200, qty: 30, status: 'Active' },
  { id: 'dc-365', serviceId: 2, name: 'DRIPCLIENT PROXY NON ROOT PANEL', category: '365 DAYS', duration: '365 DAYS', price: 1800, oldPrice: 3000, qty: 365, status: 'Active' },

  // PRIME HOOK
  { id: 'ph-3', serviceId: 3, name: 'PRIME HOOK NON ROOT PANEL', category: '3 DAYS', duration: '3 DAYS', price: 150, oldPrice: 250, qty: 3, status: 'Active', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', videoFileName: 'primehook_demo.mp4', videoFileSize: '1.5 GB', videoFrameRate: '60 FPS' },
  { id: 'ph-7', serviceId: 3, name: 'PRIME HOOK NON ROOT PANEL', category: '7 DAYS', duration: '7 DAYS', price: 250, oldPrice: 400, qty: 7, status: 'Active' },
  { id: 'ph-15', serviceId: 3, name: 'PRIME HOOK NON ROOT PANEL', category: '15 DAYS', duration: '15 DAYS', price: 499, oldPrice: 799, qty: 15, status: 'Active' },

  // HG CHEAT
  { id: 'hg-7', serviceId: 4, name: 'HG CHEAT NON ROOT PANEL', category: '7 DAYS', duration: '7 DAYS', price: 250, oldPrice: 400, qty: 7, status: 'Active', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', videoFileName: 'hgcheat_intro.mp4', videoFileSize: '1 GB', videoFrameRate: '30 FPS' },
  { id: 'hg-15', serviceId: 4, name: 'HG CHEAT NON ROOT PANEL', category: '15 DAYS', duration: '15 DAYS', price: 499, oldPrice: 799, qty: 15, status: 'Active' },
  { id: 'hg-30', serviceId: 4, name: 'HG CHEAT NON ROOT PANEL', category: '30 DAYS', duration: '30 DAYS', price: 799, oldPrice: 999, qty: 30, status: 'Active' },

  // INSTAGRAM
  { id: 'ig-1k', serviceId: 5, name: 'INSTAGRAM LIKES', category: '7 DAYS', duration: '7 DAYS', price: 69, oldPrice: 120, qty: 1000, status: 'Active' },
  { id: 'ig-5k', serviceId: 5, name: 'INSTAGRAM LIKES', category: '14 DAYS', duration: '14 DAYS', price: 249, oldPrice: 450, qty: 5000, status: 'Active' },
  { id: 'ig-10k', serviceId: 5, name: 'INSTAGRAM LIKES', category: '30 DAYS', duration: '30 DAYS', price: 399, oldPrice: 750, qty: 10000, status: 'Active' }
];

export const INITIAL_SETTINGS: SiteSettings = {
  brandName: 'DORA AD ADMIN PANEL 1™',
  servicesTitle: 'Our Services',
  homepageSubHeading: 'JOIN TO WHATSAPP CHANNEL SCREENSHOT ADMIN MOBILE NUMBER SEND 1000 VIEWS FREE',
  
  supportNumber: '+91 8015342606',
  supportButtonText: '24×7 Customer Support',
  joinGroupUrl: 'https://whatsapp.com/channel/0029Vb8PQhx4o7qeJIWgV',
  joinButtonText: 'Join Our WhatsApp Group / Channel',
  buyButtonText: 'BUY NOW',

  upiId: 'Sundar20266@oksbi',
  payeeName: 'DORAAD ADMIN PANEL',
  upiButtonText: 'Pay via UPI / QR Code',
  qrImageUrl: 'https://i.postimg.cc/gk1nJWcx/IMG-20260708-142226-050.jpg',

  // ZapUPI Settings
  zapupiApiKey: '',
  zapupiSuccessUrl: 'http://localhost:3000/?zapupi_status=success',
  zapupiFailedUrl: 'http://localhost:3000/?zapupi_status=failed',
  zapupiWebhookUrl: 'http://localhost:3000/api/webhook/zapupi',
  zapupiEnabled: true,
  zapupiMode: 'test',
  zapupiApiEndpoint: 'https://pay.zapupi.com/api/create-order',

  announcementText: '🔥 LIMITED TIME OFFER 🔥 1,000 Likes for Just ₹69!',
  announcementBgColor: '#2ce157',
  announcementTextColor: '#ffffff',
  announcementEnabled: true,

  minUsers: 850,
  maxUsers: 920,
  randomUsersEnabled: true,
  autoRefreshEnabled: true,

  websiteLogoUrl: '',
  faviconUrl: '',
  websiteTitle: 'ZYRO HUB™',
  metaDescription: 'Get premium proxy, panel hack, hook panels and social growth services instantly.',
  footerText: '© Dora Ad Admin Panel • All Rights Reserved',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
  telegramUrl: 'https://t.me',
  supportEmail: 'support@zyrohub.com',
  themeColor: '#22c55e',
  themeMode: 'light',
  maintenanceMode: false
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-10024',
    customerName: 'Rahul Sharma',
    whatsapp: '+919876543210',
    serviceId: 2,
    planId: 'dc-7',
    serviceName: 'DRIPCLIENT PROXY NON ROOT PANEL',
    planName: '7 DAYS PLAN',
    duration: '7 DAYS',
    transactionId: 'TXN98725123912',
    amount: 250,
    status: 'Completed',
    date: '2026-07-09 14:23:12'
  },
  {
    id: 'ORD-10025',
    customerName: 'Amit Patel',
    whatsapp: '+918882233441',
    serviceId: 5,
    planId: 'ig-1k',
    serviceName: 'INSTAGRAM',
    planName: '1,000 LIKES',
    duration: '7 DAYS',
    transactionId: 'TXN01294812304',
    amount: 69,
    status: 'Processing',
    date: '2026-07-09 17:45:01'
  },
  {
    id: 'ORD-10026',
    customerName: 'Vikram Singh',
    whatsapp: '+919900887766',
    serviceId: 3,
    planId: 'ph-7',
    serviceName: 'PRIME HOOK NON ROOT PANEL',
    planName: '7 DAYS PLAN',
    duration: '7 DAYS',
    transactionId: 'TXN44558811223',
    amount: 250,
    status: 'Pending',
    date: '2026-07-09 18:12:44'
  }
];

export const INITIAL_BANNERS: Banner[] = [
  {
    id: 'ban-1',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    type: 'homepage',
    status: 'Enabled',
    order: 1
  }
];

export const INITIAL_ACTIVITIES: ActivityLog[] = [
  { id: 'act-1', action: 'Login Success', details: 'Admin logged in from IP 192.168.1.1', timestamp: '2026-07-09 18:00:12' },
  { id: 'act-2', action: 'Update Price', details: 'Changed Instagram 1k Likes price to ₹69', timestamp: '2026-07-09 18:05:45' },
  { id: 'act-3', action: 'Add Service', details: 'Added Telegram Service category', timestamp: '2026-07-09 18:10:00' }
];
