import React, { useState, useEffect } from 'react';

interface PaymentRedirectorProps {
  url: string;
  amount: number;
  customerName: string;
  customerMobile: string;
  orderId?: string;
  onCancel: () => void;
}

export default function PaymentRedirectorOverlay({
  url,
  amount,
  customerName,
  customerMobile,
  orderId,
  onCancel
}: PaymentRedirectorProps) {
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar fills over 3000ms
    const intervalTime = 30; // 30ms interval
    const totalTime = 3000;  // 3s total
    const step = (intervalTime / totalTime) * 100;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    // Countdown from 3 to 1, then redirect at 0
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          // Auto-redirect
          window.location.href = url;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(countdownTimer);
    };
  }, [url]);

  const handleManualProceed = () => {
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 select-none animate-in fade-in duration-300">
      <div className="bg-[#1C2541] rounded-[32px] w-full max-w-md shadow-2xl border border-slate-800 overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
        
        {/* Animated SSL Secure Header */}
        <div className="flex items-center justify-between text-slate-400 text-xs font-black uppercase tracking-widest pb-4 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            SECURE ROUTING
          </span>
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-lock text-emerald-400"></i>
            SSL 256-BIT
          </span>
        </div>

        {/* Lock Icon & Countdown Loader */}
        <div className="my-6 relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-900 shadow-inner">
            <i className="fa-solid fa-shield-halved text-emerald-400 text-4xl animate-pulse"></i>
            
            {/* Tiny countdown bubble */}
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-[#1C2541] shadow">
              {countdown}s
            </div>
          </div>
        </div>

        {/* Dynamic Titles */}
        <h3 className="text-white font-extrabold text-lg uppercase tracking-tight leading-snug">
          Redirecting to Gateway
        </h3>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1.5">
          <span>DO NOT CLOSE OR REFRESH</span>
          <span className="text-slate-600">•</span>
          <span className="text-teal-400">ZAPUPI AUTO-GATEWAY</span>
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 mt-5 overflow-hidden border border-slate-700/50">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Payment Detail Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl w-full my-5 text-left flex flex-col gap-3 shadow-inner">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-slate-800/50">
            <span>Amount To Pay</span>
            <span className="text-white text-sm font-extrabold text-emerald-400">₹{amount}</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-500 uppercase">Customer Name</span>
              <span className="text-slate-300 font-extrabold">{customerName}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-500 uppercase">Contact Mobile</span>
              <span className="text-slate-300 font-mono">{customerMobile}</span>
            </div>
            {orderId && (
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 uppercase">Order Reference</span>
                <span className="text-teal-400 font-mono font-extrabold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 select-all">{orderId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Proceed Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleManualProceed}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-to-bracket text-xs"></i>
            <span>Proceed Now ({countdown}s)</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-400 hover:text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel & Go Back
          </button>
        </div>

        {/* Security assurance */}
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-1">
          <i className="fa-solid fa-shield-halved text-emerald-500/60"></i>
          SECURE ENCRYPTED GATEWAY DIRECT DIRECTORY
        </p>
      </div>
    </div>
  );
}
