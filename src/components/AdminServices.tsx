import React, { useState } from 'react';
import { Service } from '../types';

interface ServicesProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => void;
  onEditService: (service: Service) => void;
  onDeleteService: (id: number) => void;
  onReorderServices: (reorderedList: Service[]) => void;
  onLogActivity: (action: string, details: string) => void;
  renderServiceIcon: (type: string, className?: string) => React.ReactNode;
}

export default function AdminServices({
  services,
  onAddService,
  onEditService,
  onDeleteService,
  onReorderServices,
  onLogActivity,
  renderServiceIcon
}: ServicesProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [iconType, setIconType] = useState('dripclient');
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState<'Enabled' | 'Disabled'>('Enabled');
  const [customImageBase64, setCustomImageBase64] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setSubtitle('');
    setIconType('dripclient');
    setVerified(false);
    setStatus('Enabled');
    setCustomImageBase64('');
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setSubtitle(service.subtitle);
    setVerified(service.verified);
    setStatus(service.status);
    
    if (service.iconType.startsWith('data:image') || service.iconType.startsWith('http')) {
      setIconType('custom');
      setCustomImageBase64(service.iconType);
    } else {
      setIconType(service.iconType);
      setCustomImageBase64('');
    }
    setShowModal(true);
  };

  // Handle local File Conversion to Base64
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File is too large! Please upload an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomImageBase64(reader.result as string);
      setIconType('custom');
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
    const finalIcon = iconType === 'custom' ? customImageBase64 : iconType;

    if (editingService) {
      onEditService({
        ...editingService,
        name,
        subtitle,
        iconType: finalIcon,
        verified,
        status,
      });
      onLogActivity('Edit Service', `Updated service "${name}"`);
    } else {
      onAddService({
        name,
        subtitle,
        iconType: finalIcon,
        verified,
        status,
        order: services.length + 1,
      });
      onLogActivity('Add Service', `Created new service "${name}"`);
    }
    setShowModal(false);
  };

  // Quick sorting up/down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newList = [...services];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    // Swap
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Fix order property
    const fixedList = newList.map((svc, i) => ({ ...svc, order: i + 1 }));
    onReorderServices(fixedList);
    onLogActivity('Reorder Services', `Sorted services hierarchy`);
  };

  // Toggle quick properties
  const handleQuickStatusToggle = (svc: Service) => {
    const nextStatus = svc.status === 'Enabled' ? 'Disabled' : 'Enabled';
    onEditService({ ...svc, status: nextStatus });
    onLogActivity('Toggle Status', `Set service "${svc.name}" to ${nextStatus}`);
  };

  const handleQuickVerifiedToggle = (svc: Service) => {
    onEditService({ ...svc, verified: !svc.verified });
    onLogActivity('Toggle Badge', `Toggled verified icon on "${svc.name}"`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
      
      {/* Title Header with Add Service Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
            Services Management
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            Manage the parent service categories shown on the user panel
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#22c55e] hover:bg-[#1fbd58] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 cursor-pointer self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Add Service</span>
        </button>
      </div>

      {/* Services Table List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider w-16 text-center">Order</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider w-24">Image/Icon</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Service Name</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Subtitle</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">Verified</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {services.map((svc, index) => (
                <tr key={svc.id} className="hover:bg-slate-50/50 transition-colors">
                  
                  {/* Sorting / Order arrows */}
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-green-500 disabled:opacity-30 cursor-pointer text-[10px]"
                        title="Move Up"
                      >
                        <i className="fa-solid fa-chevron-up"></i>
                      </button>
                      <span className="font-extrabold text-slate-700">{svc.order}</span>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === services.length - 1}
                        className="text-slate-400 hover:text-green-500 disabled:opacity-30 cursor-pointer text-[10px]"
                        title="Move Down"
                      >
                        <i className="fa-solid fa-chevron-down"></i>
                      </button>
                    </div>
                  </td>

                  {/* Icon Image */}
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner flex items-center justify-center bg-slate-50">
                      {renderServiceIcon(svc.iconType)}
                    </div>
                  </td>

                  {/* Name and Quick Badge */}
                  <td className="p-4 font-extrabold text-slate-800 uppercase tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <span>{svc.name}</span>
                      {svc.verified && (
                        <span className="w-4 h-4 bg-emerald-500 rounded text-white flex items-center justify-center text-[8px]" title="Verified">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Subtitle */}
                  <td className="p-4 text-slate-500 uppercase tracking-wide font-medium">
                    {svc.subtitle}
                  </td>

                  {/* Quick Verified Toggle */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleQuickVerifiedToggle(svc)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                        svc.verified
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                      }`}
                      title="Toggle Verified Badge"
                    >
                      <i className="fa-solid fa-square-check text-sm"></i>
                    </button>
                  </td>

                  {/* Quick Status Toggle */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleQuickStatusToggle(svc)}
                      className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase cursor-pointer transition-colors ${
                        svc.status === 'Enabled'
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {svc.status}
                    </button>
                  </td>

                  {/* Edit / Delete actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(svc)}
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="Edit Service"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${svc.name}"? This will delete associated plans!`)) {
                            onDeleteService(svc.id);
                            onLogActivity('Delete Service', `Removed service id ${svc.id}`);
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="Delete Service"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                    No services found. Click Add Service to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {editingService ? 'Edit Service Panel' : 'Create New Service'}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4.5 no-scrollbar">
              
              {/* Service Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DRIPCLIENT PROXY NON ROOT PANEL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Subtitle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Subtitle Text
                </label>
                <input
                  type="text"
                  required
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. DRIPCLIENT PROXY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Verified & Enabled Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-700 font-bold text-xs">Verified Badge</span>
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="rounded border-slate-300 text-green-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-700 font-bold text-xs">Enabled Status</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Enabled' | 'Disabled')}
                    className="bg-transparent border-0 text-slate-800 font-bold text-xs focus:outline-none focus:ring-0 pr-1 py-0 cursor-pointer"
                  >
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Image / Icon Selector */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Service Image / Icon Source
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${
                    iconType !== 'custom' ? 'border-green-500 bg-green-50/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="icon_src"
                      checked={iconType !== 'custom'}
                      onChange={() => setIconType('dripclient')}
                      className="hidden"
                    />
                    <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                      <i className="fa-solid fa-shapes"></i>
                    </div>
                    <span className="text-slate-700 font-bold text-xs">Standard Presets</span>
                  </label>

                  <label className={`border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${
                    iconType === 'custom' ? 'border-green-500 bg-green-50/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="icon_src"
                      checked={iconType === 'custom'}
                      onChange={() => setIconType('custom')}
                      className="hidden"
                    />
                    <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white text-[10px]">
                      <i className="fa-solid fa-upload"></i>
                    </div>
                    <span className="text-slate-700 font-bold text-xs">Custom Upload</span>
                  </label>
                </div>

                {/* Preset List Dropdown if Selected */}
                {iconType !== 'custom' && (
                  <select
                    value={iconType}
                    onChange={(e) => setIconType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-bold uppercase cursor-pointer focus:outline-none"
                  >
                    <option value="dripclient">Dripclient Proxy Icon</option>
                    <option value="guild_glorry">Guild Glorry Shield</option>
                    <option value="prime_hook">Prime Hook Console</option>
                    <option value="hg_cheat">HG Cheat Target</option>
                    <option value="instagram">Instagram Brand Color</option>
                    <option value="youtube">YouTube Red Icon</option>
                    <option value="telegram">Telegram Blue Logo</option>
                  </select>
                )}

                {/* File Dropzone if Custom is Selected */}
                {iconType === 'custom' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                      dragOver ? 'border-green-500 bg-green-50/30' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {customImageBase64 ? (
                      <div className="flex items-center gap-3 w-full">
                        <img
                          src={customImageBase64}
                          alt="preview"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs"
                        />
                        <div className="flex-1 text-left">
                          <span className="text-slate-800 font-bold text-xs block truncate uppercase">Custom Uploaded File</span>
                          <button
                            type="button"
                            onClick={() => setCustomImageBase64('')}
                            className="text-[10px] text-rose-500 hover:underline font-bold uppercase tracking-wider"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-xl mb-1.5"></i>
                        <span className="text-slate-700 font-extrabold text-xs uppercase block">Drag & Drop Image File</span>
                        <span className="text-slate-400 text-[9px] font-semibold block mt-0.5 uppercase">Supports PNG, JPG, WEBP (Max 2MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                          className="hidden"
                          id="service-file-upload"
                        />
                        <label
                          htmlFor="service-file-upload"
                          className="mt-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Select File
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Save Controls Footer */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase py-3 px-4 rounded-xl text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase py-3 px-4 rounded-xl text-center cursor-pointer shadow-sm"
                >
                  Save Settings
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
