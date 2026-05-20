import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, MessageSquare, AlertCircle, Sparkles, UserCheck, Heart, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Reviews: React.FC = () => {
  const { currentUser, reviews, addReview, switchRole } = useApp();

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [serviceType, setServiceType] = useState('anydesk_support');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Success state feedback
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Extract only approved reviews
  const approvedReviews = reviews.filter((r) => r.isApproved);

  const serviceLabels: Record<string, string> = {
    driver_install: 'نصب و بروزرسانی درایور',
    software_install: 'نصب نرم‌افزار تخصصی و عمومی',
    anydesk_support: 'پشتیبانی فنی از راه دور (AnyDesk)',
    other: 'سایر خدمات پشتیبانی',
  };

  // Stats calculators
  const averageRating = approvedReviews.length > 0
    ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
    : '5.0';

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = approvedReviews.filter((r) => r.rating === stars).length;
    const pct = approvedReviews.length > 0 ? (count / approvedReviews.length) * 100 : 0;
    return { stars, count, pct };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('جهت ثبت نظر ابتدا وارد حساب خود شوید.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setError('متن نظر شما باید حداقل ۱۰ کاراکتر باشد.');
      return;
    }

    setError('');
    
    // Add review
    addReview({
      customerName: currentUser.fullName,
      rating,
      comment,
      serviceType: serviceLabels[serviceType] || 'دیگر خدمات',
    });

    setSuccess(true);
    setComment('');
    setRating(5);
  };

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Page Title */}
        <div className="space-y-1 mb-10">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">تجربه واقعی مشتریان ایزی‌درایور</span>
          <h1 className="text-2xl font-black text-slate-900">نظرات و امتیازات مشتریان</h1>
        </div>

        {/* 1. Market Statistics Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
          
          {/* average score card */}
          <div className="md:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center space-y-3">
            <span className="text-xs text-slate-400 font-bold block">میانگین رضایت‌مندی</span>
            <div className="text-5xl font-black text-slate-900 leading-none">{averageRating}</div>
            
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4.5 w-4.5 ${
                    s <= Math.round(Number(averageRating))
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              بر پایه {approvedReviews.length} نظر تأیید شده توسط سیستم فیدبک ایزی‌درایور.
            </p>
          </div>

          {/* distribution bar card */}
          <div className="md:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-3.5 text-xs text-slate-500">
            <h3 className="font-bold text-slate-800 text-xs">توزیع امتیاز نظرات</h3>
            
            <div className="space-y-2.5">
              {distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-left font-mono font-bold text-slate-700">{d.stars} ستاره</span>
                  <div className="grow h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-slate-400 text-[10px] text-right">{d.count} نظر</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 2. Interactive Review Submission Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-10 text-right">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-850">ثبت دیدگاه یا بازخورد جدید</h3>
          </div>

          {/* If user not logged in, show elegant placeholder block to force login */}
          {!currentUser ? (
            <div className="p-6 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-4">
              <p className="text-xs text-slate-500">
                دیدگاه شما برای بهبود کیفیت خدمات تکنسین‌ها بسیار حیاتی است. جهت ثبت امتیاز و بازخورد لطفاً وارد حساب خود شوید.
              </p>
              <button
                onClick={() => switchRole('customer')}
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xxs font-bold shadow-md shadow-indigo-600/15 cursor-pointer"
              >
                ورود سریع با عنوان مشتری
              </button>
            </div>
          ) : success ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-3"
              >
                <div className="inline-flex p-2 bg-emerald-100 text-emerald-600 rounded-full">
                  <Heart className="h-5 w-5 fill-emerald-500" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">دیدگاه شما با موفقیت دریافت شد!</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  سپاس از حضور شما؛ دیدگاه شما ثبت گردید و پس از تأیید مدیریت ایزی‌درایور جهت نمایش عمومی در سایت بارگذاری خواهد شد.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xxs font-black transition-all cursor-pointer"
                >
                  ثبت بازخورد دیگر
                </button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl text-xs font-bold font-sans">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Visual hoverable star rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">امتیاز شما به کیفیت کار تکنسین (۱ تا ۵)</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 hover:scale-115 transition-transform text-slate-200 hover:text-amber-400 cursor-pointer"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= (hoverRating !== null ? hoverRating : rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Service type connection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">نوع خدمات دریافتی</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl text-xs outline-none"
                  >
                    {Object.entries(serviceLabels).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Text comment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">شرح دقیق رضایتمندی یا انتقاد سازنده</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="تجربه خود از برخورد تکنسین، سرعت انجام ریموت و حل قطعی مشکل سخت‌افزاری کامپیوترتان را بفرستید..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl text-xs outline-none leading-relaxed"
                />
              </div>

              {/* Submit btn */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="h-4 w-4 rotate-180" />
                  <span>ثبت و ذخیره دیدگاه</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* 3. Approved Reviews List */}
        <div className="space-y-4 text-right">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-850 pb-2 border-b border-slate-200">دیدگاه‌های ثبت‌شده هموطنان</h3>

          {approvedReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              هنوز هیچ دیدگاهی ثبت و تایید نشده است. شما اولین نفر باشید!
            </div>
          ) : (
            <div className="space-y-4">
              {approvedReviews.map((rev) => (
                <div key={rev.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex gap-4 shrink-0">
                  
                  {/* Left avatar placeholder */}
                  <div className="hidden sm:flex h-10 w-10 bg-slate-50 text-indigo-500 rounded-full items-center justify-center border border-slate-100 font-bold text-sm shrink-0 uppercase select-none">
                    {rev.customerName.charAt(0)}
                  </div>

                  {/* Right content details */}
                  <div className="grow space-y-2 text-xs">
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <strong className="block text-slate-850 font-extrabold">{rev.customerName}</strong>
                        {rev.serviceType && (
                          <span className="block text-[10px] text-slate-400">نوع خدمت: <span className="font-semibold text-slate-600">{rev.serviceType}</span></span>
                        )}
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-150'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-normal pt-1.5 border-t border-slate-50">
                      {rev.comment}
                    </p>

                    <span className="block text-[9px] text-slate-400 text-left">
                      ارسال شده در: {new Date(rev.createdDate).toLocaleDateString('fa-IR')}
                    </span>

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
