import React, { useState } from 'react';
import { Banner } from '../types';

interface BannersProps {
  banners: Banner[];
  onAddBanner: (banner: Omit<Banner, 'id'>) => void;
  onEditBanner: (banner: Banner) => void;
  onDeleteBanner: (id: string) => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function AdminBanners({
  banners,
  onAddBanner,
  onEditBanner,
  onDeleteBanner,
  onLogActivity
}: BannersProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Form Fields
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'homepage' | 'offer' | 'popup'>('homepage');
  const [status, setStatus] = useState<'Enabled' | 'Disabled'>('Enabled');
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert('Please upload an image first!');
      return;
    }

    onAddBanner({
      image: imageUrl,
      type,
      status,
      order: banners.length + 1
    });

    onLogActivity('Add Banner', `Uploaded new "${type}" banner`);
    setShowModal(false);
    setImageUrl('');
  };

  const handleQuickStatusToggle = (ban: Banner) => {
    const nextStatus = ban.status === 'Enabled' ? 'Disabled' : 'Enabled';
    onEditBanner({ ...ban, status: nextStatus });
    onLogActivity('Toggle Banner', `Set banner status to ${nextStatus}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
            Banners Management
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            Control promotional slider slides, marketing flyers, and welcome popups
          </p>
        </div>
        <button
          onClick={() => {
            setImageUrl('');
            setType('homepage');
            setStatus('Enabled');
            setShowModal(true);
          }}
          className="bg-[#22c55e] hover:bg-[#1fbd58] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Add Banner</span>
        </button>
      </div>

      {/* Banners Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {banners.map((ban) => (
          <div
            key={ban.id}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs flex flex-col group relative"
          >
            {/* Banner Preview Frame */}
            <div className="aspect-video w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
              <img
                src={ban.image}
                alt="Banner slide"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="bg-slate-900/80 backdrop-blur-xs text-white font-bold text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-md">
                  {ban.type}
                </span>
                <span className={`font-bold text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-md ${
                  ban.status === 'Enabled' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                }`}>
                  {ban.status}
                </span>
              </div>
            </div>

            {/* Banner Info Details */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Banner Identifier</span>
                <span className="text-slate-700 font-extrabold text-xs block mt-0.5">{ban.id}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Status Toggle */}
                <button
                  onClick={() => handleQuickStatusToggle(ban)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase cursor-pointer transition-colors ${
                    ban.status === 'Enabled'
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {ban.status === 'Enabled' ? 'Disable' : 'Enable'}
                </button>
                {/* Delete button */}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this banner slide?')) {
                      onDeleteBanner(ban.id);
                      onLogActivity('Delete Banner', `Deleted banner ${ban.id}`);
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Delete Banner"
                >
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
            </div>

          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-full py-16 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
            <i className="fa-solid fa-images text-slate-300 text-4xl"></i>
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
              No banners yet. Create one to display promotions to users.
            </p>
          </div>
        )}
      </div>

      {/* Add Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                Create New Promotional Banner
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4.5 overflow-y-auto no-scrollbar">
              
              {/* Type Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Banner Placement Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-bold"
                >
                  <option value="homepage">Homepage Banner Carousel</option>
                  <option value="offer">Special Offer Header Slider</option>
                  <option value="popup">Welcome Modal Popup</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Initial Status State
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-bold"
                >
                  <option value="Enabled">Enabled (Active)</option>
                  <option value="Disabled">Disabled (Hidden)</option>
                </select>
              </div>

              {/* File Upload Dropzone */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Upload Image Media
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    dragOver ? 'border-green-500 bg-green-50/30' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {imageUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={imageUrl}
                        alt="banner preview"
                        className="w-full max-h-32 object-contain rounded-lg border border-slate-200 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-[10px] text-rose-500 hover:underline font-bold uppercase tracking-wider mt-1"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-2xl mb-2"></i>
                      <span className="text-slate-700 font-extrabold text-xs uppercase block">Drag & Drop Banner Image</span>
                      <span className="text-slate-400 text-[9px] font-semibold block mt-0.5 uppercase">Recommended: 16:9 Aspect Ratio</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                        className="hidden"
                        id="banner-file-upload"
                      />
                      <label
                        htmlFor="banner-file-upload"
                        className="mt-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase px-4 py-2 rounded-lg cursor-pointer shadow-sm"
                      >
                        Select Image File
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Form Controls */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-xl text-center uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl text-center uppercase shadow-sm"
                >
                  Publish Banner
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
