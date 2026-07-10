import React, { useState } from 'react';
import { Order } from '../types';

interface OrdersProps {
  orders: Order[];
  onUpdateOrderStatus: (id: string, status: Order['status']) => void;
  onDeleteOrder: (id: string) => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function AdminOrders({
  orders,
  onUpdateOrderStatus,
  onDeleteOrder,
  onLogActivity
}: OrdersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Wallet' | 'UPI' | 'Pending' | 'Paid' | 'Rejected' | 'Processing' | 'Completed' | 'Cancelled' | 'Pending Verification'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & Search Logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.whatsapp.includes(search) ||
      order.transactionId.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All'
        ? true
        : statusFilter === 'Pending'
        ? (order.status === 'Pending' || order.status === 'Pending Verification')
        : statusFilter === 'Paid'
        ? (order.status === 'Paid' || order.status === 'Completed')
        : statusFilter === 'Wallet'
        ? (order.paymentMethod?.toLowerCase() === 'wallet')
        : statusFilter === 'UPI'
        ? (order.paymentMethod?.toLowerCase() === 'upi')
        : statusFilter === 'Rejected'
        ? (order.status === 'Cancelled' || order.status === 'Rejected')
        : order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    const headers = ['Order ID', 'Customer Name', 'WhatsApp', 'Service', 'Plan', 'Transaction ID', 'Amount', 'Payment Method', 'Status', 'Date'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.customerName,
      o.whatsapp,
      o.serviceName,
      o.planName,
      o.transactionId,
      o.amount,
      o.paymentMethod || 'N/A',
      o.status,
      o.date
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zyrohub_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onLogActivity('Export Orders', `Downloaded CSV spreadsheet of ${filteredOrders.length} orders`);
  };

  const statusTabs: { id: 'All' | 'Pending' | 'Paid' | 'Wallet' | 'UPI' | 'Rejected'; label: string; count: number }[] = [
    { id: 'All', label: 'All', count: orders.length },
    { id: 'Pending', label: 'Pending', count: orders.filter(o => o.status === 'Pending' || o.status === 'Pending Verification').length },
    { id: 'Paid', label: 'Paid', count: orders.filter(o => o.status === 'Paid' || o.status === 'Completed').length },
    { id: 'Wallet', label: 'Wallet', count: orders.filter(o => o.paymentMethod?.toLowerCase() === 'wallet').length },
    { id: 'UPI', label: 'UPI', count: orders.filter(o => o.paymentMethod?.toLowerCase() === 'upi').length },
    { id: 'Rejected', label: 'Rejected', count: orders.filter(o => o.status === 'Cancelled' || o.status === 'Rejected').length }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
      
      {/* Header and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
            Orders Management
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            Review and fulfill customer transactions with live verification checks
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <i className="fa-solid fa-file-csv text-sm"></i>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tabs list exactly like the screenshot */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 no-scrollbar select-none">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4.5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                isActive
                  ? 'border-[#22c55e] text-slate-800 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black ${
                isActive ? 'bg-[#E6F9ED] text-[#22c55e]' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <i className="fa-solid fa-magnifying-glass text-xs"></i>
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search customer name, WhatsApp number, transaction ID, or order ID..."
          className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-10 pr-4 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#22c55e] shadow-xs"
        />
      </div>

      {/* Orders Grid Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">ID & Date</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Customer Contact</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Service details</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Payment Method</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Txn ID</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-right">Price</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-right w-44">Quick Fulfill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* ID & Date */}
                  <td className="p-4">
                    <span className="font-extrabold text-slate-800 block text-xs">{order.id}</span>
                    <span className="text-slate-400 font-mono text-[9px] block mt-0.5">{order.date}</span>
                  </td>

                  {/* Customer Contact */}
                  <td className="p-4">
                    <span className="font-bold text-slate-800 block uppercase">{order.customerName}</span>
                    <a
                      href={`https://wa.me/${order.whatsapp.replace(/\+/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline font-bold text-[10px] tracking-wider mt-0.5 flex items-center gap-1"
                    >
                      <i className="fa-brands fa-whatsapp text-xs"></i>
                      <span>{order.whatsapp}</span>
                    </a>
                  </td>

                  {/* Service details */}
                  <td className="p-4">
                    <span className="font-bold text-slate-800 block uppercase line-clamp-1 max-w-[180px]">
                      {order.serviceName}
                    </span>
                    <span className="inline-block bg-slate-100 text-slate-600 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase mt-1">
                      {order.planName}
                    </span>
                  </td>

                  {/* Payment Method */}
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      order.paymentMethod?.toLowerCase() === 'wallet'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : order.paymentMethod?.toLowerCase() === 'upi'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {order.paymentMethod || 'N/A'}
                    </span>
                  </td>

                  {/* Txn ID */}
                  <td className="p-4 font-mono text-slate-500 font-semibold select-all">
                    {order.transactionId}
                  </td>

                  {/* Price */}
                  <td className="p-4 text-right font-black text-slate-800 text-sm">
                    ₹{order.amount}
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full font-bold text-[9px] uppercase ${
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

                  {/* Quick Fulfill Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* Approve button (Transitions to Processing) */}
                      {(order.status === 'Pending' || order.status === 'Pending Verification') && (
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'Processing');
                            onLogActivity('Approve Order', `Set order ${order.id} status to Processing`);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-600 font-extrabold px-2.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                          title="Set to Processing"
                        >
                          Approve
                        </button>
                      )}

                      {/* Complete button */}
                      {(order.status === 'Pending' || order.status === 'Pending Verification' || order.status === 'Processing' || order.status === 'Paid') && (
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'Completed');
                            onLogActivity('Complete Order', `Marked order ${order.id} as Completed`);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-extrabold px-2.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                          title="Complete/Deliver Order"
                        >
                          Deliver
                        </button>
                      )}

                      {/* Cancel/Reject button */}
                      {(order.status === 'Pending' || order.status === 'Pending Verification' || order.status === 'Processing' || order.status === 'Paid') && (
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'Cancelled');
                            onLogActivity('Cancel Order', `Cancelled order ${order.id}`);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-500 font-extrabold px-2.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                          title="Cancel/Reject Order"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Delete permanently */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete order "${order.id}"?`)) {
                            onDeleteOrder(order.id);
                            onLogActivity('Delete Order', `Permanently deleted order ${order.id}`);
                          }
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="Delete permanently"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>

                    </div>
                  </td>

                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                    No orders matching your search and filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs select-none">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold uppercase text-slate-500 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-bold text-slate-600 uppercase">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold uppercase text-slate-500 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
