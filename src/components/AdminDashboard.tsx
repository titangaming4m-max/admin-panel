import React from 'react';
import { Order, ActivityLog } from '../types';

interface DashboardProps {
  orders: Order[];
  activityLogs: ActivityLog[];
  onTabChange: (tab: string) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export default function AdminDashboard({ orders, activityLogs, onTabChange, onUpdateOrderStatus }: DashboardProps) {
  // Calculations
  const completedOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Paid');
  const processingOrders = orders.filter(o => o.status === 'Processing' || o.status === 'Pending' || o.status === 'Pending Verification');
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled');

  const totalRevenue = completedOrders.reduce((acc, order) => acc + order.amount, 0);
  const totalOrdersCount = orders.length;

  const stats = [
    {
      id: 'rev',
      label: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      icon: 'fa-solid fa-indian-rupee-sign',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'ord',
      label: 'Total Orders',
      value: totalOrdersCount,
      icon: 'fa-solid fa-cart-shopping',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'proc',
      label: 'Processing',
      value: processingOrders.length,
      icon: 'fa-solid fa-spinner animate-spin-slow',
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'canc',
      label: 'Cancelled',
      value: cancelledOrders.length,
      icon: 'fa-solid fa-circle-xmark',
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
      
      {/* Title Header */}
      <div>
        <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
          Dashboard Overview
        </h2>
        <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
          Live statistics and recent customer interactions
        </p>
      </div>

      {/* Grid of 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-xs"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg border ${stat.color}`}>
              <i className={stat.icon}></i>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-slate-900 font-black text-xl tracking-tight mt-0.5">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table (Col span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wide">
              Recent Orders Table
            </h3>
            <button
              onClick={() => onTabChange('orders')}
              className="text-xs text-green-600 hover:text-green-700 font-bold uppercase tracking-wider"
            >
              Manage All Orders →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Customer</th>
                  <th className="p-3.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Service Details</th>
                  <th className="p-3.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Price</th>
                  <th className="p-3.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 line-clamp-1">{order.customerName}</div>
                      <div className="text-slate-400 text-[10px] font-mono mt-0.5">{order.whatsapp}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-700 uppercase line-clamp-1">{order.serviceName}</div>
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-0.5">{order.duration}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      ₹{order.amount}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          order.status === 'Completed' || order.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-600'
                            : order.status === 'Processing'
                            ? 'bg-purple-50 text-purple-600'
                            : order.status === 'Pending' || order.status === 'Pending Verification'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold">
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log (Col span 1) */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4.5 border-b border-slate-100">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wide">
              Recent Activity Logs
            </h3>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[320px] no-scrollbar">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex gap-3 border-l-2 border-slate-200 pl-3.5 py-0.5">
                <div className="flex-1">
                  <p className="text-slate-800 font-bold text-xs uppercase tracking-wide">
                    {log.action}
                  </p>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                    {log.details}
                  </p>
                  <span className="text-slate-400 font-mono text-[9px] block mt-1">
                    {log.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-semibold text-xs">
                No activities logged yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
