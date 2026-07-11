import React, { useState } from 'react';
import { Plan, Service } from '../types';
import { storeVideo } from '../lib/videoStorage';

interface PlansProps {
  plans: Plan[];
  services: Service[];
  onAddPlan: (plan: Omit<Plan, 'id'>) => void;
  onEditPlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
  onLogActivity: (action: string, details: string) => void;
  renderServiceIcon: (type: string, className?: string) => React.ReactNode;
}

export default function AdminPlans({
  plans,
  services,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onLogActivity,
  renderServiceIcon
}: PlansProps) {
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Filter Selection
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<number | 'All'>('All');

  // Plan Form Fields
  const [serviceId, setServiceId] = useState<number>(services[0]?.id || 1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('7 DAYS');
  const [duration, setDuration] = useState('7 DAYS');
  const [price, setPrice] = useState<number>(250);
  const [oldPrice, setOldPrice] = useState<number>(400);
  const [qty, setQty] = useState<number>(7);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Video properties state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [videoFileSize, setVideoFileSize] = useState('');
  const [videoFrameRate, setVideoFrameRate] = useState('30 FPS');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFileSizeOption, setSelectedFileSizeOption] = useState<'1.5 GB' | '1 GB'>('1.5 GB');

  // Bulk Edit Fields
  const [bulkServiceId, setBulkServiceId] = useState<number | 'All'>('All');
  const [bulkStatus, setBulkStatus] = useState<'' | 'Active' | 'Inactive'>('');
  const [bulkPriceChange, setBulkPriceChange] = useState<number>(0);
  const [bulkPriceType, setBulkPriceType] = useState<'Flat' | 'Percentage'>('Flat');

  // Open add plan modal
  const handleOpenAdd = () => {
    setEditingPlan(null);
    setServiceId(services[0]?.id || 1);
    setName('');
    setCategory('7 DAYS');
    setDuration('7 DAYS');
    setPrice(250);
    setOldPrice(400);
    setQty(7);
    setStatus('Active');
    setVideoUrl('');
    setVideoFileName('');
    setVideoFileSize('');
    setVideoFrameRate('30 FPS');
    setIsUploading(false);
    setUploadProgress(null);
    setSelectedFileSizeOption('1.5 GB');
    setShowModal(true);
  };

  // Open edit plan modal
  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setServiceId(plan.serviceId);
    setName(plan.name);
    setCategory(plan.category);
    setDuration(plan.duration);
    setPrice(plan.price);
    setOldPrice(plan.oldPrice);
    setQty(plan.qty);
    setStatus(plan.status);
    setVideoUrl(plan.videoUrl || '');
    setVideoFileName(plan.videoFileName || '');
    setVideoFileSize(plan.videoFileSize || '');
    setVideoFrameRate(plan.videoFrameRate || '30 FPS');
    setIsUploading(false);
    setUploadProgress(null);
    setSelectedFileSizeOption((plan.videoFileSize === '1 GB' ? '1 GB' : '1.5 GB') as any);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      alert('Please wait for the video to finish uploading first!');
      return;
    }
    const serviceName = services.find(s => s.id === serviceId)?.name || 'UNKNOWN';

    if (editingPlan) {
      onEditPlan({
        ...editingPlan,
        serviceId,
        name: name || serviceName,
        category,
        duration,
        price,
        oldPrice,
        qty,
        status,
        videoUrl,
        videoFileName,
        videoFileSize,
        videoFrameRate,
      });
      onLogActivity('Edit Plan', `Updated plan "${name || serviceName}" price to ₹${price}`);
    } else {
      const generatedId = `plan-${Date.now()}`;
      onAddPlan({
        serviceId,
        name: name || serviceName,
        category,
        duration,
        price,
        oldPrice,
        qty,
        status,
        videoUrl,
        videoFileName,
        videoFileSize,
        videoFrameRate,
      });
      onLogActivity('Add Plan', `Created new plan under service "${serviceName}"`);
    }
    setShowModal(false);
  };

  // Handle Bulk Edit Apply
  const handleApplyBulk = (e: React.FormEvent) => {
    e.preventDefault();
    let count = 0;

    plans.forEach(plan => {
      // Filter by service
      if (bulkServiceId === 'All' || plan.serviceId === bulkServiceId) {
        let updatedPlan = { ...plan };

        // Apply status bulk change
        if (bulkStatus) {
          updatedPlan.status = bulkStatus;
        }

        // Apply price adjustments
        if (bulkPriceChange !== 0) {
          if (bulkPriceType === 'Flat') {
            updatedPlan.price = Math.max(0, updatedPlan.price + bulkPriceChange);
            updatedPlan.oldPrice = Math.max(0, updatedPlan.oldPrice + bulkPriceChange);
          } else {
            const ratio = 1 + (bulkPriceChange / 100);
            updatedPlan.price = Math.round(Math.max(0, updatedPlan.price * ratio));
            updatedPlan.oldPrice = Math.round(Math.max(0, updatedPlan.oldPrice * ratio));
          }
        }

        onEditPlan(updatedPlan);
        count++;
      }
    });

    onLogActivity('Bulk Edit', `Applied bulk edits to ${count} packages`);
    setShowBulkModal(false);
    setBulkStatus('');
    setBulkPriceChange(0);
  };

  // Quick toggle plan status
  const handleQuickStatusToggle = (plan: Plan) => {
    const nextStatus = plan.status === 'Active' ? 'Inactive' : 'Active';
    onEditPlan({ ...plan, status: nextStatus });
    onLogActivity('Toggle Plan Status', `Toggled plan status for ${plan.id} to ${nextStatus}`);
  };

  // Video Upload Simulation Handler
  const handleFakeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ONE_MB = 1024 * 1024;
    const ONE_POINT_FIVE_GB = 1.5 * 1024 * 1024 * 1024;

    if (file.size < ONE_MB) {
      alert(`Upload failed: Videos must be between 1 MB and 1.5 GB. Your selected file is too small (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    if (file.size > ONE_POINT_FIVE_GB) {
      alert(`Upload failed: Videos larger than 1.5 GB cannot be uploaded. Your selected file is too large (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB).`);
      return;
    }

    // Determine size label dynamically
    const sizeInMB = file.size / (1024 * 1024);
    const formattedSize = sizeInMB >= 1024 
      ? `${(sizeInMB / 1024).toFixed(2)} GB` 
      : `${sizeInMB.toFixed(1)} MB`;

    setIsUploading(true);
    setUploadProgress(0);
    setVideoFileName(file.name);
    setVideoFileSize(formattedSize);

    // Simulate chunked upload progress for the selected large video size
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 8;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(null);
          
          // Generate a local object URL from the actual video file, or fallback to default mixkit video
          let localUrl = '';
          try {
            localUrl = 'video-file-' + file.name;
            storeVideo(localUrl, file);
          } catch (err) {
            localUrl = 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4';
          }
          setVideoUrl(localUrl);
          alert(`Successfully uploaded and processed ${formattedSize} video: ${file.name}`);
        }, 500);
      }
      setUploadProgress(currentProgress);
    }, 150);
  };

  // Filtered plans
  const filteredPlans = plans.filter(p => selectedServiceFilter === 'All' || p.serviceId === selectedServiceFilter);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
      
      {/* Title Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 font-black text-2xl tracking-tight uppercase">
            Plans Management
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            Manage pricing, packages, categories, and inventory caps
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3 px-4.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-list-check text-xs"></i>
            <span>Bulk Edit</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="bg-[#22c55e] hover:bg-[#1fbd58] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-100 cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Add Plan</span>
          </button>
        </div>
      </div>

      {/* Filter Selector & Quick Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-filter text-slate-400 text-xs"></i>
          <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Filter Service:</span>
          <select
            value={selectedServiceFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedServiceFilter(val === 'All' ? 'All' : parseInt(val));
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Services</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          Showing {filteredPlans.length} plans of {plans.length} total
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Service</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Plan Details</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Category</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-right">Price</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPlans.map((plan) => {
                const svc = services.find(s => s.id === plan.serviceId);
                return (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Service Name & Icon */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                          {svc ? renderServiceIcon(svc.iconType) : <div className="w-full h-full bg-slate-100" />}
                        </div>
                        <span className="font-extrabold text-slate-800 uppercase tracking-wide truncate max-w-[150px]">
                          {svc ? svc.name : 'Unknown Service'}
                        </span>
                      </div>
                    </td>

                    {/* Plan Details & Qty */}
                    <td className="p-4">
                      <div className="font-bold text-slate-700 uppercase line-clamp-1">{plan.name}</div>
                      <div className="text-slate-400 text-[10px] font-semibold mt-0.5 uppercase tracking-wider">Qty: {plan.qty}</div>
                      {plan.videoUrl && (
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit tracking-wider">
                            <i className="fa-solid fa-video text-[8px]"></i>
                            <span>Video {plan.videoFileSize ? `(${plan.videoFileSize})` : 'Active'}</span>
                          </div>
                          {plan.videoFrameRate && (
                            <div className="flex items-center gap-1 text-[8px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit tracking-wide">
                              <i className="fa-solid fa-bolt text-[7px] text-amber-500 animate-pulse"></i>
                              <span>{plan.videoFrameRate} Rendering</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category (Duration) */}
                    <td className="p-4">
                      <span className="inline-block bg-slate-100 text-slate-600 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                        {plan.category}
                      </span>
                    </td>

                    {/* Price & Old Price */}
                    <td className="p-4 text-right">
                      <div className="font-black text-emerald-600 text-sm">₹{plan.price}</div>
                      <div className="text-slate-400 text-[10px] font-bold line-through mt-0.5">₹{plan.oldPrice}</div>
                    </td>

                    {/* Status with quick toggle button */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleQuickStatusToggle(plan)}
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[9px] uppercase cursor-pointer transition-colors ${
                          plan.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {plan.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(plan)}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Edit Plan"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this plan?')) {
                              onDeletePlan(plan.id);
                              onLogActivity('Delete Plan', `Removed plan ID ${plan.id}`);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete Plan"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">
                    No plans found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {editingPlan ? 'Edit Pricing Plan' : 'Add New Plan Option'}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4.5 no-scrollbar">
              
              {/* Parent Service Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Belongs To Service Category
                </label>
                <select
                  required
                  value={serviceId}
                  onChange={(e) => setServiceId(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-semibold focus:outline-none focus:border-green-500 focus:bg-white"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Plan Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Plan Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DRIPCLIENT PROXY NON ROOT PANEL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-semibold focus:outline-none focus:border-green-500 focus:bg-white uppercase"
                />
              </div>

              {/* Price and Old Price Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-sm font-bold focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Old/Strike Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={oldPrice}
                    onChange={(e) => setOldPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration and Quantity Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Duration / category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setDuration(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-xs font-bold uppercase"
                  >
                    <option value="3 DAYS">3 DAYS</option>
                    <option value="7 DAYS">7 DAYS</option>
                    <option value="14 DAYS">14 DAYS</option>
                    <option value="15 DAYS">15 DAYS</option>
                    <option value="30 DAYS">30 DAYS</option>
                    <option value="365 DAYS">365 DAYS</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Quantity / Counts
                  </label>
                  <input
                    type="number"
                    required
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Active Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Video Playback & Upload Section */}
              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col gap-3.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-black text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-circle-play text-indigo-500"></i>
                  <span>Plan Video Attachment</span>
                </div>

                {/* Video URL Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Option A: Video URL / Link
                  </label>
                  <input
                    type="url"
                    value={videoUrl.startsWith('video-file-') ? '' : videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      if (e.target.value && !e.target.value.startsWith('blob:')) {
                        // Reset simulated file if pasting direct URL
                        setVideoFileName('');
                        setVideoFileSize('');
                      }
                    }}
                    placeholder="https://example.com/demo-video.mp4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-xs font-semibold focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                    Supports any direct MP4, OGG, WEBM or streamable video URL
                  </span>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3">
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                  <span className="text-slate-300 font-black text-[9px] uppercase tracking-wider">OR</span>
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                </div>

                {/* Video Upload Options */}
                <div className="flex flex-col gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      Option B: Upload Video File
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Upload Size:</span>
                      <select
                        value={selectedFileSizeOption}
                        onChange={(e) => setSelectedFileSizeOption(e.target.value as any)}
                        disabled={isUploading}
                        className="bg-white border border-slate-200 rounded-lg text-[9px] font-extrabold px-1.5 py-0.5 text-slate-700"
                      >
                        <option value="1.5 GB">1.5 GB</option>
                        <option value="1 GB">1 GB</option>
                      </select>
                    </div>
                  </div>

                  {isUploading ? (
                    <div className="flex flex-col gap-2 py-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                        <span className="animate-pulse flex items-center gap-1">
                          <i className="fa-solid fa-spinner animate-spin text-indigo-500"></i>
                          Uploading {selectedFileSizeOption} Video Chunk...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        id="plan-video-upload"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFakeUpload}
                      />
                      <label
                        htmlFor="plan-video-upload"
                        className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/50 p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-lg"></i>
                        <span className="text-slate-600 font-extrabold text-[11px] uppercase tracking-wide">
                          Choose Video File
                        </span>
                        <span className="text-slate-400 text-[9px] font-medium uppercase tracking-wider">
                          Accepts video files between 1 MB and 1.5 GB in size
                        </span>
                      </label>
                    </div>
                  )}

                  {videoFileName && (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-[10px] font-bold mt-1">
                      <div className="flex items-center gap-1.5 text-slate-700 truncate max-w-[180px]">
                        <i className="fa-solid fa-file-video text-indigo-500"></i>
                        <span className="truncate">{videoFileName}</span>
                      </div>
                      <span className="text-slate-400 shrink-0 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {videoFileSize || selectedFileSizeOption}
                      </span>
                    </div>
                  )}
                </div>

                {/* Video Frame Rate Setup */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Option C: Video Playback Frame Rate
                  </label>
                  <select
                    value={videoFrameRate}
                    onChange={(e) => setVideoFrameRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-xs font-semibold focus:outline-none"
                  >
                    <option value="24 FPS">24 FPS (Cinematic / Film)</option>
                    <option value="30 FPS">30 FPS (Standard Web)</option>
                    <option value="60 FPS">60 FPS (Ultra Smooth / High FPS)</option>
                    <option value="90 FPS">90 FPS (Pro Gaming Display)</option>
                    <option value="120 FPS">120 FPS (Extreme Esports Grade)</option>
                  </select>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                    Sets the active frame rate overlay displayed on the video player container for end-users
                  </span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase py-3 px-4 rounded-xl text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase py-3 px-4 rounded-xl text-center shadow-sm"
                >
                  Save Plan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                Bulk Update Engine
              </span>
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer text-white"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleApplyBulk} className="p-5 flex flex-col gap-4.5 overflow-y-auto no-scrollbar">
              
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed font-semibold">
                <i className="fa-solid fa-triangle-exclamation text-base mt-0.5"></i>
                <span>Bulk updates are applied globally to all matched pricing structures instantly! This cannot be undone automatically.</span>
              </div>

              {/* Target Service */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Target Service Group
                </label>
                <select
                  value={bulkServiceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkServiceId(val === 'All' ? 'All' : parseInt(val));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-bold"
                >
                  <option value="All">All Services</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Update Override */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Bulk Override Status
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 text-sm font-bold"
                >
                  <option value="">-- Leave Unchanged --</option>
                  <option value="Active">Set All to Active</option>
                  <option value="Inactive">Set All to Inactive</option>
                </select>
              </div>

              {/* Pricing Adjustments */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Adjust Prices By
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={bulkPriceChange}
                    onChange={(e) => setBulkPriceChange(parseInt(e.target.value) || 0)}
                    placeholder="e.g. -50 or 10"
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-sm font-bold text-center"
                  />
                  <select
                    value={bulkPriceType}
                    onChange={(e) => setBulkPriceType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold text-center"
                  >
                    <option value="Flat">₹ Flat</option>
                    <option value="Percentage">% Percent</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide text-center">
                  Negative values decrease prices, positive values increase prices.
                </span>
              </div>

              {/* Controls */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-xl text-center uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#22c55e] hover:bg-[#1fbd58] text-white font-bold text-xs py-3 rounded-xl text-center uppercase shadow-md shadow-green-100"
                >
                  Apply Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
