import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus, Request, STATUS_COLORS, STATUS_LABELS, SERVICE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import { Calendar, User, Clock, CheckCircle2, AlertCircle, FileText, Smartphone, Ban, ShieldAlert, Key, MessageCircle, RefreshCw, Star, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const MyRequests: React.FC = () => {
  const { currentUser, requests, switchRole, updateRequest, addReview } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

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
            <button
              onClick={() => switchRole('customer')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>ورود فوری به عنوان مشتری</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter requests submitted by this logged-in user
  const myRequests = requests.filter(r => r.createdBy === currentUser.id);

  const filteredRequests = myRequests.filter((r) => {
    if (filter === 'active') return r.status !== 'completed' && r.status !== 'cancelled';
    if (filter === 'completed') return r.status === 'completed';
    return true; // all
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

  const handleCancel = (req: Request) => {
    if (window.confirm('آیا از لغو این درخواست خدمات فنی مایلید؟')) {
      updateRequest({
        ...req,
        status: 'cancelled',
      });
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

        {/* Empty state conditional */}
        {filteredRequests.length === 0 ? (
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
            {filteredRequests.map((req) => {
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
    </div>
  );
};
