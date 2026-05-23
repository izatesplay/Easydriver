import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceType, RequestPriority, SERVICE_LABELS, PRIORITY_LABELS } from '../types';
import { Sparkles, CheckCircle2, CheckCircle, FileText, Smartphone, User, ArrowLeft, Send, ShieldAlert, Key, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface NewRequestProps {
  setActiveTab: (tab: string) => void;
}

export const NewRequest: React.FC<NewRequestProps> = ({ setActiveTab }) => {
  const { currentUser, addRequest } = useApp();

  // Form states
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [serviceType, setServiceType] = useState<ServiceType>('driver_install');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [description, setDescription] = useState('');
  
  // Real-time tracking of touched inputs for custom feedback
  const [touched, setTouched] = useState<Record<string, boolean>>({
    fullName: false,
    phone: false,
    description: false,
  });

  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  // Auto-sync form if user switches roles while on this tab
  React.useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Real-time error checkers
  const getFullNameError = () => {
    if (!touched.fullName) return '';
    if (!fullName.trim()) return 'وارد کردن نام و نام خانوادگی الزامی است.';
    if (fullName.trim().length < 3) return 'نام وارد شده بسیار کوتاه است. حداقل باید شامل ۳ کاراکتر باشد.';
    return '';
  };

  const getPhoneError = () => {
    if (!touched.phone) return '';
    if (!phone.trim()) return 'شماره تماس هماهنگی الزامی است.';
    if (!/^09\d{9}$/.test(phone.trim())) return 'شماره همراه معتبر نیست. مثال صحیح: 09121234567 (شروع با ۰۹ و شامل ۱۱ رقم)';
    return '';
  };

  const getDescriptionError = () => {
    if (!touched.description) return '';
    if (!description.trim()) return 'نوشتن شرح مشکل یا مدل دقیق سخت‌افزار الزامی است.';
    if (description.trim().length < 15) {
      return `شرح مشکل خیلی کوتاه است. حداقل ۱۵ حرف بنویسید (در حال حاضر: ${description.trim().length} حرف، نیاز به حداقل ${15 - description.trim().length} حرف دیگر داریم).`;
    }
    return '';
  };

  const isFormValid = !getFullNameError() && !getPhoneError() && !getDescriptionError() && fullName.trim().length >= 3 && /^09\d{9}$/.test(phone.trim()) && description.trim().length >= 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('جهت ثبت درخواست ابتدا باید وارد حساب کاربری شوید.');
      return;
    }

    // Touch all fields to make validation errors appear immediately if they clicked send early
    setTouched({
      fullName: true,
      phone: true,
      description: true,
    });

    const isNameInvalid = !fullName.trim() || fullName.trim().length < 3;
    const isPhoneInvalid = !phone.trim() || !/^09\d{9}$/.test(phone.trim());
    const isDescInvalid = !description.trim() || description.trim().length < 15;

    if (isNameInvalid || isPhoneInvalid || isDescInvalid) {
      setError('لطفاً ابتدا خطاهای ورودی را برطرف کرده و مجدداً جهت ارسال کلیک کنید.');
      return;
    }

    setError('');
    
    // Call Context action
    const req = addRequest({
      fullName,
      phone,
      serviceType,
      priority,
      description,
    });

    setSubmittedId(req.id);
    setSuccess(true);
    setDescription('');
    setTouched({
      fullName: false,
      phone: false,
      description: false,
    });
  };

  // If user is not logged in, render a gorgeous prompt to log in or simulate click role
  if (!currentUser) {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">نیاز به ورود به حساب کاربری</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              جهت حفظ امنیت رایانه شما و هماهنگی دقیق تکنسین‌های ایزی‌درایور، برای ثبت درخواست خدمات باید سیستم شما احراز هویت شده باشد.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setActiveTab('auth');
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>انتقال به پرتال ورود و ثبت‌نام</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render dynamic success view!
  if (success) {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-3xl border border-emerald-100 p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto inline-flex">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">سفارش شما با موفقیت ثبت شد!</h2>
            <p className="text-xs text-slate-500 font-medium">آیدی پیگیری درخواست: <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-1 rounded-md">{submittedId}</span></p>
            <p className="text-xs text-slate-500 leading-relaxed pt-2 max-w-md mx-auto">
              مدیریت ایزی‌درایور بلافاصله درخواست شما را بررسی کرده و پس از تأیید، ماهرترین تکنسین را شناسایی و تخصیص خواهد داد. جزئیات به صورت زنده در پنل «پیگیری درخواست‌ها» قرار می‌گیرد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 max-w-sm mx-auto">
            <button
              onClick={() => setActiveTab('my-requests')}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              پیگیری درخواست زنده
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            >
              ثبت درخواست دیگر
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb back / Page title info */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">سفارش آسان خدمات ریموت</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">فرم ثبت درخواست خدمات فنی</h1>
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>بازگشت به خانه</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Core Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Informational sidebar for design craftsmanship */}
          <div className="md:col-span-4 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between text-right space-y-8">
            <div className="space-y-4">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl inline-block w-fit">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-white">نحوه ارتباط کارشناس</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                پس از ثبت نهایی اطلاعات سخت‌افزاری در فرم روبرو، درخواست به کارشناسان مربوط به هر برند ارجاع داده می‌شود. شماره تماس شما صرفاً جهت هماهنگی ساعت دقیق اتصال و ارسال پسورد انی‌دسک استفاده خواهد شد.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800 text-[10px] text-slate-400">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>بررسی در کمتر از ۳۰ دقیقه</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>تکنسین‌های تایید هویت شده</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>برگشت کامل وجه در صورت عدم نصب</span>
              </p>
            </div>
          </div>

          {/* Form container */}
          <div className="md:col-span-8 p-6 sm:p-8 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error handle label */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form elements grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full name input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>نام و نام خانوادگی</span>
                    </label>
                    {touched.fullName && (
                      <span className={`text-[9px] font-bold flex items-center gap-1 ${fullName.trim().length >= 3 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fullName.trim().length >= 3 ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>تایید شد</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>نادرست</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setTouched(prev => ({ ...prev, fullName: true }));
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                    placeholder="مثال: سعید رستمی"
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 ${
                      touched.fullName
                        ? getFullNameError()
                          ? 'bg-rose-50/20 border border-rose-450 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/15'
                          : 'bg-emerald-50/10 border border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/15'
                        : 'bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {getFullNameError() && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getFullNameError()}</span>
                    </p>
                  )}
                </div>

                {/* Phone contact input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                      <span>شماره تماس موبایل (جهت هماهنگی)</span>
                    </label>
                    {touched.phone && (
                      <span className={`text-[9px] font-bold flex items-center gap-1 ${/^09\d{9}$/.test(phone.trim()) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {/^09\d{9}$/.test(phone.trim()) ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>تایید شد</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>نامعتبر</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setTouched(prev => ({ ...prev, phone: true }));
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                    placeholder="مثال: 09121234567"
                    className={`w-full px-4 py-3 rounded-xl text-xs text-left outline-none transition-all placeholder:text-slate-405 font-mono ${
                      touched.phone
                        ? getPhoneError()
                          ? 'bg-rose-50/20 border border-rose-450 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/15'
                          : 'bg-emerald-50/10 border border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/15'
                        : 'bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                  {getPhoneError() && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{getPhoneError()}</span>
                    </p>
                  )}
                </div>

              </div>

              {/* Service selection list picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نوع خدمت مورد نیاز</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`p-3 rounded-xl border text-right text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                        serviceType === type
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-1 ring-blue-500/25'
                          : 'border-slate-150 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${serviceType === type ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      <span>{SERVICE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority selection list */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اولویت انجام درخواست</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PRIORITY_LABELS) as RequestPriority[]).map((prior) => (
                    <button
                      key={prior}
                      type="button"
                      onClick={() => setPriority(prior)}
                      className={`p-2.5 rounded-xl border text-center text-xs transition-all font-semibold cursor-pointer ${
                        priority === prior
                          ? 'border-indigo-650 bg-indigo-50/50 text-indigo-700 font-bold ring-1 ring-indigo-505/25'
                          : 'border-slate-150 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      {PRIORITY_LABELS[prior]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed description textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>توضیحات تکمیلی و مدل دقیق سخت‌افزار</span>
                  </label>
                  <span className={`text-[10px] font-bold ${description.trim().length >= 15 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {description.trim().length} / ۱۵ کاراکتر
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setTouched(prev => ({ ...prev, description: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                  placeholder="مدل مادربرد یا کارت گرافیک خود، مشخصات مشکل و تداخل به وجود آمده را تا حد ممکن با جزئیات وارد کنید (حداقل ۱۵ کاراکتر)"
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 leading-relaxed ${
                    touched.description
                      ? getDescriptionError()
                        ? 'bg-rose-50/20 border border-rose-450 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/15'
                        : 'bg-emerald-50/10 border border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/15'
                      : 'bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white'
                  }`}
                />
                {getDescriptionError() && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{getDescriptionError()}</span>
                  </p>
                )}
              </div>

              {/* Submit CTA action row */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={touched.fullName || touched.phone || touched.description ? !isFormValid : false}
                  className={`w-full py-3.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg ${
                    (touched.fullName || touched.phone || touched.description) && !isFormValid
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  <Send className="h-4 w-4 rotate-180" />
                  <span>ثبت و ارسال نهایی درخواست</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
