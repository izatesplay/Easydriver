import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus, Request, STATUS_COLORS, STATUS_LABELS, SERVICE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, ServiceType } from '../types';
import { Calendar, User, Clock, CheckCircle2, AlertCircle, FileText, Smartphone, Ban, ShieldAlert, Key, MessageCircle, RefreshCw, Star, CheckCircle, Eye, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface MyRequestsProps {
  onNavigateToAuth?: () => void;
}

export const MyRequests: React.FC<MyRequestsProps> = ({ onNavigateToAuth }) => {
  const { currentUser, requests, updateRequest, addReview } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [quickViewRequest, setQuickViewRequest] = useState<Request | null>(null);
  const [datePreset, setDatePreset] = useState<'all' | '30days' | '90days' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Rating states per completed request id
  const [ratingStars, setRatingStars] = useState<Record<string, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<string, string>>({});
  const [ratingFeedbackErrors, setRatingFeedbackErrors] = useState<Record<string, string>>({});
  const [ratingSuccess, setRatingSuccess] = useState<Record<string, boolean>>({});

  const handleReviewSubmit = (req: Request) => {
    const stars = ratingStars[req.id] || 5;
    const comment = ratingComments[req.id] || '';
    
    if (comment.trim().length < 5) {
      setRatingFeedbackErrors(prev => ({
        ...prev,
        [req.id]: 'لطفاً حداقل یک نظر کوتاه (بیشتر از ۵ کاراکتر) بنویسید.'
      }));
      return;
    }

    setRatingFeedbackErrors(prev => ({ ...prev, [req.id]: '' }));

    // 1. Store visual feedback in My Requests of this user
    updateRequest({
      ...req,
      rating: stars,
      ratingComment: comment.trim(),
      ratedAt: new Date().toISOString()
    });

    // 2. Add review in general reviews list mapped to this technician
    addReview({
      customerName: currentUser?.fullName || req.fullName,
      rating: stars,
      comment: comment.trim(),
      serviceType: SERVICE_LABELS[req.serviceType],
      technicianId: req.assignedToId,
      technicianName: req.assignedToName,
      isApproved: true, // Autoapprove verified customer rating!
    });

    setRatingSuccess(prev => ({ ...prev, [req.id]: true }));
  };

  // Guard: Check auth
  if (!currentUser) {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">نیاز به ورود جهت پیگیری</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              جهت مشاهده تاریخچه درخواست‌ها و رهگیری لحظه‌ای وضعیت تخصیص تکنسین، لطفاً وارد حساب خود شوید.
            </p>
          </div>
          <div className="pt-2">
            {onNavigateToAuth ? (
              <button
                onClick={onNavigateToAuth}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Key className="h-4 w-4" />
                <span>انتقال به پرتال ورود و ثبت‌نام</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 font-normal">لطفاً از دکمه بالا برای ورود به پرتال اقدام فرستید.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter requests submitted by this logged-in user
  const myRequests = requests.filter(r => r.createdBy === currentUser.id);

  const filteredRequests = myRequests.filter((r) => {
    // 1. Filter by status tab
    if (filter === 'active' && (r.status === 'completed' || r.status === 'cancelled')) return false;
    if (filter === 'completed' && r.status !== 'completed') return false;

    // 2. Filter by service type category
    if (selectedServiceType !== 'all' && r.serviceType !== selectedServiceType) return false;

    // 3. Filter by date registration
    const reqTime = new Date(r.createdDate).getTime();
    if (datePreset === '30days') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (reqTime < thirtyDaysAgo) return false;
    } else if (datePreset === '90days') {
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      if (reqTime < ninetyDaysAgo) return false;
    } else if (datePreset === 'custom') {
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (reqTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).getTime();
        const endDayTime = end + 24 * 60 * 60 * 1000; // till end of the day
        if (reqTime > endDayTime) return false;
      }
    }

    return true;
  });

  // Calculate statistics for the Recharts Pie Chart
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved' || r.status === 'assigned').length;
  const inProgressCount = myRequests.filter(r => r.status === 'in_progress').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;
  const cancelledCount = myRequests.filter(r => r.status === 'cancelled').length;

  const chartData = [
    { name: 'در انتظار بررسی', value: pendingCount, color: '#f59e0b' },
    { name: 'تایید شده', value: approvedCount, color: '#3b82f6' },
    { name: 'در حال انجام', value: inProgressCount, color: '#a855f7' },
    { name: 'تکمیل شده', value: completedCount, color: '#10b981' },
    { name: 'لغو شده', value: cancelledCount, color: '#f43f5e' },
  ].filter(item => item.value > 0);

  // Sort according to user preference (newest first / oldest first)
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const timeA = new Date(a.createdDate).getTime();
    const timeB = new Date(b.createdDate).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Calculate timelines / progress
  const getProgressPercentage = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 10;
      case 'approved': return 35;
      case 'assigned': return 55;
      case 'in_progress': return 75;
      case 'completed': return 100;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const getStepStatus = (currentStatus: RequestStatus, step: 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed') => {
    if (currentStatus === 'cancelled') return 'cancelled';
    
    const stepsOrder = ['pending', 'approved', 'assigned', 'in_progress', 'completed'];
    const currentIndex = stepsOrder.indexOf(currentStatus);
    const stepIndex = stepsOrder.indexOf(step);

    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const [requestToCancel, setRequestToCancel] = useState<Request | null>(null);

  const handleCancel = (req: Request) => {
    setRequestToCancel(req);
  };

  const confirmCancelRequest = () => {
    if (requestToCancel) {
      updateRequest({
        ...requestToCancel,
        status: 'cancelled',
      });
      setRequestToCancel(null);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header information */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider block">رهگیری هوشمند EasyDriver</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">لیست و پیگیری درخواست‌های من</h1>
          </div>

          {/* Quick tab filters */}
          <div className="flex bg-slate-200/60 p-1.5 rounded-xl gap-1 shrink-0 w-fit">
            {(['all', 'active', 'completed'] as const).map((tab) => {
              const labels = { all: 'همه', active: 'فعال و جاری', completed: 'کامل شده' };
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-900'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bento Board: Quick Statistics Graphic + Detailed Filters list */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          
          {/* Right: Pie Chart Distribution Visual card */}
          <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-indigo-600 font-bold block mb-1">توزیع وضعیت درخواست‌ها</span>
              <h3 className="text-xs font-black text-slate-800 mb-3 block">آمار کلی خدمات شما</h3>
              
              {chartData.length > 0 ? (
                <div className="h-[145px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} عدد`, 'تعداد']} 
                        contentStyle={{ 
                          fontSize: '10px', 
                          fontFamily: 'Vazirmatn, sans-serif',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'right'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center percentage/sum label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                    <span className="text-[10px] text-slate-400 font-bold">مجموع کل</span>
                    <span className="text-sm font-black text-slate-800 font-mono">{myRequests.length}</span>
                  </div>
                </div>
              ) : (
                <div className="h-[145px] flex items-center justify-center text-center">
                  <p className="text-[10px] text-slate-400 font-medium">داده‌ای برای نمایش وجود ندارد.</p>
                </div>
              )}
            </div>

            {/* Custom readable legend details */}
            {chartData.length > 0 && (
              <div className="flex flex-wrap gap-x-2.5 gap-y-1 justify-center mt-3 border-t border-slate-100 pt-3">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[9px] font-black text-slate-600">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.name}:</span>
                    <span className="font-mono text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Left: Interactive Multi-axis Filters box */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
            
            {/* Service Type category filters row */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-450 font-bold block flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-indigo-500" />
                <span>دسته‌بندی موضوعی نوع خدمت:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'تمامی سرویس‌ها' },
                  { id: 'driver_install', label: 'درایورها' },
                  { id: 'software_install', label: 'نصب نرم‌افزار' },
                  { id: 'anydesk_support', label: 'پشتیبانی AnyDesk' }
                ].map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceType(service.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xxs font-extrabold transition-all border cursor-pointer ${
                      selectedServiceType === service.id
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-black'
                        : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-150'
                    }`}
                  >
                    {service.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Preset Selection row */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-450 font-bold block select-none">بازه زمانی ثبت:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'همه زمان‌ها' },
                  { id: '30days', label: '۳۰ روز اخیر' },
                  { id: '90days', label: '۹۰ روز اخیر' },
                  { id: 'custom', label: 'بازه دلخواه...' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setDatePreset(preset.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xxs font-extrabold transition-all border cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-indigo-50 border-indigo-250 text-indigo-700 font-black'
                        : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-150'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting order & layout adjustments */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">مرتب‌سازی انتشار:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`px-2.5 py-1.5 rounded-lg text-xxs font-extrabold transition-all border cursor-pointer ${
                      sortOrder === 'desc'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    جدیدترین‌ها نخست
                  </button>
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`px-2.5 py-1.5 rounded-lg text-xxs font-extrabold transition-all border cursor-pointer ${
                      sortOrder === 'asc'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    قدیمی‌ترین‌ها نخست
                  </button>
                </div>
              </div>
            </div>

            {/* Conditional Custom Date Selector Inputs */}
            <AnimatePresence>
              {datePreset === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden grid grid-cols-2 gap-3 pt-2"
                >
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block">شروع:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xxs font-semibold outline-none focus:border-indigo-400 text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block">پایان:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xxs font-semibold outline-none focus:border-indigo-400 text-slate-700"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* Empty state conditional */}
        {sortedRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-450 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">هیچ درخواست فعالی یافت نشد</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {myRequests.length === 0 
                  ? 'هنوز هیچ درخواست خدماتی ثبت نکرده‌اید. با مراجعه به بخش ثبت درخواست خدمات، کامپیوتر خود را رونق دهید!'
                  : 'هیچ درخواستی در وضعیت فیلتر شده پیدا نشد.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedRequests.map((req) => {
              const cancelAllowed = req.status === 'pending' || req.status === 'approved';
              return (
                <div key={req.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-right">
                  
                  {/* Top Header Capsule */}
                  <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-150 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                          # {req.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_COLORS[req.status]}`}>
                          {STATUS_LABELS[req.status]}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[req.priority]}`}>
                          اولویت {PRIORITY_LABELS[req.priority]}
                        </span>
                        <button
                          onClick={() => setQuickViewRequest(req)}
                          type="button"
                          className="px-2.5 py-0.5 text-indigo-650 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md text-[10px] font-bold tracking-tight transition-all flex items-center gap-1 cursor-pointer"
                          title="مشاهده سریع اطلاعات فنی"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-500" />
                          <span>مشاهده سریع</span>
                        </button>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {SERVICE_LABELS[req.serviceType]}
                      </h3>
                    </div>

                    <div className="text-left">
                      <span className="block text-[10px] text-slate-400">تاریخ ثبت درخواست</span>
                      <span className="block text-xs font-mono font-bold text-slate-700 mt-1">
                        {new Date(req.createdDate).toLocaleDateString('fa-IR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Body Info row */}
                  <div className="p-5 sm:p-6 space-y-6">
                    
                    {/* Visual progress stepper (except for cancelled icon) */}
                    {req.status !== 'cancelled' ? (
                      <div className="space-y-4">
                        <div className="relative h-1 bg-slate-100 rounded-full">
                          {/* Inner loader bar */}
                          <div
                            className="absolute top-0 right-0 h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${getProgressPercentage(req.status)}%` }}
                          />
                        </div>

                        {/* Interactive Steps indicators */}
                        <div className="grid grid-cols-5 gap-2 text-center text-[9px] sm:text-xxs font-black text-slate-400">
                          
                          <div className={`space-y-1.5 ${getStepStatus(req.status, 'pending') !== 'pending' ? 'text-indigo-650' : ''}`}>
                            <span className={`block h-3.5 w-3.5 rounded-full mx-auto border-2 ${
                              getStepStatus(req.status, 'pending') === 'done'
                                ? 'bg-indigo-600 border-indigo-600'
                                : getStepStatus(req.status, 'pending') === 'active'
                                ? 'bg-white border-indigo-600'
                                : 'bg-white border-slate-200'
                            }`} />
                            <span className="block font-bold">ثبت اولیه</span>
                          </div>

                          <div className={`space-y-1.5 ${getStepStatus(req.status, 'approved') !== 'pending' ? 'text-indigo-650' : ''}`}>
                            <span className={`block h-3.5 w-3.5 rounded-full mx-auto border-2 ${
                              getStepStatus(req.status, 'approved') === 'done'
                                ? 'bg-indigo-600 border-indigo-600'
                                : getStepStatus(req.status, 'approved') === 'active'
                                ? 'bg-white border-indigo-600'
                                : 'bg-white border-slate-200'
                            }`} />
                            <span className="block font-bold">تایید مدیر</span>
                          </div>

                          <div className={`space-y-1.5 ${getStepStatus(req.status, 'assigned') !== 'pending' ? 'text-indigo-650' : ''}`}>
                            <span className={`block h-3.5 w-3.5 rounded-full mx-auto border-2 ${
                              getStepStatus(req.status, 'assigned') === 'done'
                                ? 'bg-indigo-600 border-indigo-600'
                                : getStepStatus(req.status, 'assigned') === 'active'
                                ? 'bg-white border-indigo-600'
                                : 'bg-white border-slate-200'
                            }`} />
                            <span className="block font-bold">ارجاع متخصص</span>
                          </div>

                          <div className={`space-y-1.5 ${getStepStatus(req.status, 'in_progress') !== 'pending' ? 'text-indigo-650' : ''}`}>
                            <span className={`block h-3.5 w-3.5 rounded-full mx-auto border-2 ${
                              getStepStatus(req.status, 'in_progress') === 'done'
                                ? 'bg-indigo-600 border-indigo-600'
                                : getStepStatus(req.status, 'in_progress') === 'active'
                                ? 'bg-white border-indigo-600'
                                : 'bg-white border-slate-200'
                            }`} />
                            <span className="block font-bold">در حال انجام ریموت</span>
                          </div>

                          <div className={`space-y-1.5 ${getStepStatus(req.status, 'completed') !== 'pending' ? 'text-indigo-650' : ''}`}>
                            <span className={`block h-3.5 w-3.5 rounded-full mx-auto border-2 ${
                              getStepStatus(req.status, 'completed') === 'done'
                                ? 'bg-emerald-600 border-emerald-600'
                                : getStepStatus(req.status, 'completed') === 'active'
                                ? 'bg-white border-emerald-600'
                                : 'bg-white border-slate-200'
                            }`} />
                            <span className="block font-bold">کامل شد</span>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-bold leading-relaxed">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>این درخواست خدمات فنی بنا به درخواست کاربر یا تداخل، با موفقیت لغو شد.</span>
                      </div>
                    )}

                    {/* Desc and technician assignments info list */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                      
                      {/* Left: Desc user + Notes admin */}
                      <div className="md:col-span-7 space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">شرح مشکل سیستم ثبت شده:</span>
                          <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
                            {req.description}
                          </p>
                        </div>

                        {req.adminNotes && (
                          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1 text-xs">
                            <span className="font-bold text-blue-700 flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>یادداشت کارشناس و هماهنگی‌های ریموت:</span>
                            </span>
                            <p className="text-slate-650 font-normal leading-relaxed">
                              {req.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Assigned technician attributes if any */}
                      <div className="md:col-span-5 bg-slate-50/40 border border-slate-100 p-4 rounded-2xl space-y-3 shrink-0">
                        <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">هماهنگی تکنسین</h4>

                        {req.assignedToName ? (
                          <div className="space-y-2.5 text-xs text-slate-600">
                            
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                <User className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-bold">{req.assignedToName}</span>
                            </div>

                            {req.scheduledDate && (
                              <div className="flex items-center gap-2 text-[11px]">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>زمان شروع: {new Date(req.scheduledDate).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})} - {new Date(req.scheduledDate).toLocaleDateString('fa-IR')}</span>
                              </div>
                            )}

                            {req.status === 'completed' ? (
                              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                                {req.rating ? (
                                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-850">
                                      <span>ثبت بازخورد شما با موفقیت</span>
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className={`h-3 w-3 ${
                                              s <= req.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    {req.ratingComment && (
                                      <p className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100/50 font-normal">
                                        {req.ratingComment}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 bg-slate-100/20 p-2.5 border border-slate-200/45 rounded-xl">
                                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                                      خدمت نصب با موفقیت پایان یافته است. با امتیازدهی به این تکنسین ما را در ارتقای کیفیت یاری فرمایید:
                                    </p>
                                    
                                    <div className="flex justify-center gap-1.5 pt-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() => {
                                            setRatingStars((prev) => ({ ...prev, [req.id]: star }));
                                          }}
                                          className="hover:scale-115 transition-transform text-slate-200 hover:text-amber-400 cursor-pointer"
                                        >
                                          <Star
                                            className={`h-5 w-5 ${
                                              star <= (ratingStars[req.id] !== undefined ? ratingStars[req.id] : 5)
                                                ? 'text-amber-400 fill-amber-400'
                                                : 'text-slate-200'
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>

                                    <textarea
                                      rows={2}
                                      value={ratingComments[req.id] || ''}
                                      onChange={(e) => {
                                        setRatingComments((prev) => ({ ...prev, [req.id]: e.target.value }));
                                      }}
                                      placeholder="نظر عادلانه شما درباره اخلاق و تخصص تکنسین..."
                                      className="w-full p-2 bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-[10px] outline-none resize-none"
                                    />

                                    {ratingFeedbackErrors[req.id] && (
                                      <p className="text-[9px] text-rose-600 font-bold">{ratingFeedbackErrors[req.id]}</p>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleReviewSubmit(req)}
                                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle className="h-3 w-3 animate-pulse" />
                                      <span>ثبت امتیاز و نظر</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-100">
                                کارشناس در زمان مقرر جهت دریافت آی‌دی AnyDesk با شما تماس خواهد گرفت یا از طریق بخش تیکت‌ها پیام می‌فرستد.
                              </p>
                            )}

                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span>تکنسینی هنوز اختصاص داده نشده است...</span>
                          </div>
                        )}

                      </div>

                    </div>

                    {/* Bottom CTA to Cancel if pending */}
                    {cancelAllowed && (
                      <div className="flex justify-end pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleCancel(req)}
                          className="px-3.5 py-2 hover:bg-rose-50 border border-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-xxs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>لغو این درخواست</span>
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Quick View Details Modal Popup Dialog */}
      <AnimatePresence>
        {quickViewRequest && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative z-10 text-right font-sans"
              dir="rtl"
            >
              {/* Header section with brand banner */}
              <div className="p-5 bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono bg-white/10 text-indigo-200 px-2 py-0.5 rounded-md font-bold">
                      درخواست #{quickViewRequest.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border bg-white/15 border-white/20 text-indigo-100`}>
                      {STATUS_LABELS[quickViewRequest.status]}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black mt-1">
                    {SERVICE_LABELS[quickViewRequest.serviceType]}
                  </h3>
                </div>
                <button
                  onClick={() => setQuickViewRequest(null)}
                  className="p-1 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  بستن
                </button>
              </div>

              {/* Informative Body Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                    <span className="text-[10px] text-slate-400 font-bold block">وضعیت اجرایی:</span>
                    <span className={`inline-block text-[11px] font-black`}>
                      {STATUS_LABELS[quickViewRequest.status]}
                    </span>
                  </div>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                    <span className="text-[10px] text-slate-400 font-bold block">اولویت فنی:</span>
                    <span className={`inline-block text-[11px] font-black text-rose-700`}>
                      {PRIORITY_LABELS[quickViewRequest.priority]}
                    </span>
                  </div>
                </div>

                {/* Main troubleshooting description */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  <span className="text-[10px] text-indigo-650 font-bold block">شرح مشکل سیستم ثبت شده:</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {quickViewRequest.description}
                  </p>
                </div>

                {/* Support contact info */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-indigo-50/20 p-3.5 rounded-2xl border border-indigo-150/40">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">نام متقاضی:</span>
                    <span className="text-slate-800 font-bold">{quickViewRequest.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">شماره همراه تماس:</span>
                    <span className="text-slate-803 font-bold font-mono">{quickViewRequest.phone}</span>
                  </div>
                </div>

                {/* Notes by assigned administrator/technician */}
                {quickViewRequest.adminNotes ? (
                  <div className="space-y-1.5 bg-blue-50/40 p-4 border border-blue-100 rounded-2xl">
                    <span className="text-[10px] text-blue-700 font-bold block flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>یادداشت‌ها و هماهنگی‌های کارشناس ریموت:</span>
                    </span>
                    <p className="text-xs text-slate-650 font-normal leading-relaxed">
                      {quickViewRequest.adminNotes}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">هنوز یادداشتی از سمت مدیر ثبت نشده است.</span>
                  </div>
                )}

                {/* Step chronological Logs */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-805 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span>سوابق رهگیری زمانی درخواست:</span>
                  </h4>
                  <div className="space-y-2 text-xxs text-slate-550 font-bold font-mono">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span>📅 ثبت نهایی در سیستم:</span>
                      <span>{new Date(quickViewRequest.createdDate).toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span>⚡ آخرین بروزرسانی پلتفرم:</span>
                      <span>{new Date(quickViewRequest.updatedDate).toLocaleString('fa-IR')}</span>
                    </div>
                    {quickViewRequest.scheduledDate && (
                      <div className="flex justify-between items-center bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100/50">
                        <span>⏰ زمان هماهنگ‌شده کارشناس:</span>
                        <span className="text-indigo-950 font-extrabold">{new Date(quickViewRequest.scheduledDate).toLocaleString('fa-IR')}</span>
                      </div>
                    )}
                    {quickViewRequest.assignedToName && (
                      <div className="flex justify-between items-center bg-emerald-50/20 p-2.5 rounded-xl border border-emerald-100/50">
                        <span>🛠️ تکنسین فنی مسئول:</span>
                        <span className="text-emerald-800 font-extrabold">{quickViewRequest.assignedToName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-100/50 border-t border-slate-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQuickViewRequest(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  فهمیدم، بستن جزئیات
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Cancel Request Modal */}
        {requestToCancel && (
          <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRequestToCancel(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-sm w-full overflow-hidden relative z-10 text-right font-sans p-6 space-y-5"
              dir="rtl"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Ban className="h-6 w-6" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-base font-extrabold text-slate-900">تایید لغو درخواست خدمات</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  آیا از لغو درخواست خدمات فنی برای <span className="font-extrabold text-slate-800">«{SERVICE_LABELS[requestToCancel.serviceType]}»</span> مطمئن هستید؟ این اقدام غیرقابل بازگشت است.
                </p>
              </div>

              <div className="flex gap-3 text-xs font-bold pt-2">
                <button
                  type="button"
                  onClick={confirmCancelRequest}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10 text-center"
                >
                  بله، لغو شود
                </button>
                <button
                  type="button"
                  onClick={() => setRequestToCancel(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer text-center font-normal"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
