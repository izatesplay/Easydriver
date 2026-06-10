import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceType, RequestPriority, SERVICE_LABELS, PRIORITY_LABELS } from '../types';
import { Sparkles, CheckCircle2, FileText, Smartphone, User, ArrowLeft, Send, AlertCircle, Search, Cpu, Check, Loader2, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface NewRequestProps {
  setActiveTab: (tab: string) => void;
}

export const NewRequest: React.FC<NewRequestProps> = ({ setActiveTab }) => {
  const { currentUser, addRequest } = useApp();

  // Primary fields matching the backend model
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [serviceType, setServiceType] = useState<ServiceType>('driver_install');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [description, setDescription] = useState('');

  // Live Catalog Driver recommendation states
  const [searchModel, setSearchModel] = useState('');
  const [driverSuggestions, setDriverSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  // Validation feedback states
  const [touched, setTouched] = useState<Record<string, boolean>>({
    fullName: false,
    phone: false,
    description: false,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');

  // Keep fields synced with authenticated user profile
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Debounced search for compatible drivers
  useEffect(() => {
    if (!searchModel.trim()) {
      setDriverSuggestions([]);
      return;
    }

    setIsSearching(true);
    const delayTimer = setTimeout(() => {
      fetch(`/api/compatible-drivers?model=${encodeURIComponent(searchModel)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setDriverSuggestions(data);
          }
        })
        .catch((err) => console.error('Driver catalog fetch failed:', err))
        .finally(() => setIsSearching(false));
    }, 450);

    return () => clearTimeout(delayTimer);
  }, [searchModel]);

  // Client validation functions
  const validateFullName = () => {
    if (!fullName.trim()) return 'وارد کردن نام و نام خانوادگی الزامی است';
    if (fullName.trim().length < 3) return 'نام باید حداقل شامل ۳ کاراکتر باشد';
    return '';
  };

  const validatePhone = () => {
    if (!phone.trim()) return 'وارد کردن شماره همراه الزامی است';
    if (!/^09\d{9}$/.test(phone.trim())) return 'فرمت صحیح شماره همراه: 09123456789';
    return '';
  };

  const validateDescription = () => {
    if (!description.trim()) return 'ثبت شرح مشکل یا اطلاعات سخت افزاری الزامی است';
    if (description.trim().length < 15) return `توضیحات بسیار کوتاه است. حداقل ۱۵ کاراکتر بنویسید (در حال حاضر: ${description.trim().length} حرف)`;
    return '';
  };

  const isFormValid = !validateFullName() && !validatePhone() && !validateDescription();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Touch all inputs
    setTouched({ fullName: true, phone: true, description: true });

    if (!currentUser) {
      setErrorMsg('برای ثبت درخواست خدمات ابتدا باید وارد پورتال کاربری خود شوید.');
      return;
    }

    if (!isFormValid) {
      setErrorMsg('لطفاً اطلاعات فرم را به صورت صحیح تکمیل کنید تا خطاهای قرمز برطرف شوند.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Submit via shared Context and backend
      const result = await addRequest({
        fullName: fullName.trim(),
        phone: phone.trim(),
        serviceType,
        priority,
        description: description.trim(),
      });

      if (result && result.id) {
        setCreatedId(result.id);
        setSuccess(true);
        setDescription('');
        setSelectedDriver(null);
        setSearchModel('');
        setTouched({ fullName: false, phone: false, description: false });
      } else {
        throw new Error('خطا در دریافت شناسه رهگیری از سمت سرور');
      }
    } catch (err: any) {
      console.error('Request submission failed:', err);
      setErrorMsg('ارسال درخواست به سرور با خطا مواجه شد. لطفا اتصال اینترنت خود را بررسی نموده و مجددا تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login view fallback
  if (!currentUser) {
    return (
      <div className="font-sans min-h-[60vh] flex items-center justify-center p-6 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">عدم احراز هویت کاربری</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              جهت حفظ امنیت اطلاعات رایانه شما و هماهنگی دقیق تکنسین‌ها، برای ایجاد فاکتور و تخصیص کارشناس خدمات ابتدا باید ثبت‌نام نموده یا وارد حساب کاربری خود شوید.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('auth')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/10"
          >
            ورود یا عضویت فوری در سیستم
          </button>
        </div>
      </div>
    );
  }

  // Success view block
  if (success) {
    return (
      <div className="font-sans min-h-[60vh] flex items-center justify-center p-6 bg-slate-50" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">سفارش شما با موفقیت ثبت گردید!</h2>
            <div className="py-2.5 px-4 bg-slate-100 rounded-xl inline-flex flex-col gap-1 mx-auto">
              <span className="text-[10px] text-slate-400 font-bold block">کد رهگیری اختصاصی:</span>
              <span className="font-mono text-sm font-black text-slate-800 tracking-wider">{createdId}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pt-3">
              کارشناسان ارشد ایزی‌درایور بلافاصله اطلاعات ثبت شده را بررسی کرده، مجوز شروع به کار صادر می‌نمایند و پس از تطابق دقیق، ماهرترین تکنسین را به سیستم شما ارجاع خواهند داد. مراحل انجام کار به صورت لحظه‌ای در برگه «پیگیری درخواست‌ها» قابل مشاهده خواهد بود.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              onClick={() => setActiveTab('my-requests')}
              className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              پیگیری درخواست
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            >
              ثبت درخواست جدید
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-10" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header Breadcrumbs */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-650">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider block">سفارش آنی خدمات از راه دور</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">فرم و مشخصات ثبت درخواست جدید</h1>
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-all cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xxs"
          >
            <span>بازگشت به خانه</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Main Body Card Grid */}
        <div className="bg-white rounded-3xl border border-slate-250 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Informational guide column */}
          <div className="md:col-span-4 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between text-right space-y-8">
            <div className="space-y-4">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl inline-block w-fit">
                <Info className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="font-bold text-base text-white">راهنمای مراحل ارجاع</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                پلتفرم تخصصی EasyDriver با اتصال مستقیم مشتریان به تکنیسین‌های فنی، عیب‌یابی درایورها و پیکربندی ویندوز را به صورت تضمینی انجام می‌دهد. شماره موبایل ثبت شده صرفا جهت هماهنگی تماس و تبادل کدهای اتصال ایمن از طریق ریموت دسکتاپ به کار گرفته خواهد شد.
              </p>
            </div>

            <div className="space-y-3.5 pt-6 border-t border-slate-800 text-[10px] text-slate-400 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>بررسی اولیه اپراتور در کمتر از ۲۰ دقیقه</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>بهره‌مندی از مجرب‌ترین تکنسین‌های کل کشور</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>تضمین بازگشت کامل وجه در صورت برطرف نشدن ایراد</span>
              </div>
            </div>
          </div>

          {/* Actual Form wrapper code */}
          <div className="md:col-span-8 p-6 sm:p-8">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* User Identity & Phone info row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full name input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-405" />
                    <span>نام و نام خانوادگی متقاضی</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setTouched((prev) => ({ ...prev, fullName: true }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                    placeholder="مثال: سعید رستمی"
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none border transition-all ${
                      touched.fullName && validateFullName()
                        ? 'border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-50/30 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                  {touched.fullName && validateFullName() && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{validateFullName()}</span>
                    </p>
                  )}
                </div>

                {/* Contact phone input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-slate-405" />
                    <span>شماره همراه (جهت هماهنگی فنی)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setTouched((prev) => ({ ...prev, phone: true }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                    placeholder="مثال: 09121234567"
                    className={`w-full px-4 py-3 rounded-xl text-xs text-left outline-none border font-mono transition-all ${
                      touched.phone && validatePhone()
                        ? 'border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-50/30 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                  {touched.phone && validatePhone() && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{validatePhone()}</span>
                    </p>
                  )}
                </div>

              </div>

              {/* Service Selection Picker list */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">نوع خدمات ریموت مورد نیاز</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`p-3 rounded-xl border text-right text-xs transition-all flex items-center gap-3 cursor-pointer ${
                        serviceType === type
                          ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 font-bold ring-1 ring-indigo-500/10'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${serviceType === type ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{SERVICE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority pickers row */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">اولویت انجام فرآیند</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PRIORITY_LABELS) as RequestPriority[]).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`py-2.5 rounded-xl border text-center text-xs transition-all font-bold cursor-pointer ${
                        priority === prio
                          ? 'border-indigo-600 bg-indigo-55/30 text-indigo-700'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      {PRIORITY_LABELS[prio]}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE DRIVER INTEGRATION RECOMMENDATION ASSISTANT */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3 shadow-xxs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Search className="h-4 w-4 text-indigo-600 animate-pulse" />
                    <span className="text-xs font-extrabold">پیشنهاد هوشمند کاتالوگ سخت‌افزار ایزی‌درایور (انتخابی)</span>
                  </div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">بایگانی مرجع</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchModel}
                    onChange={(e) => setSearchModel(e.target.value)}
                    placeholder="مدل سخت‌افزار مانند: NVIDIA RTX 4070, Realtek Audio, HP ScanJet..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                  />
                  <div className="absolute left-3 top-3.5 flex items-center">
                    {isSearching ? (
                      <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Suggestions drop card menu lists */}
                {driverSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 p-2 text-right">
                    <span className="p-1.5 text-[9px] text-indigo-700 font-black block bg-indigo-50/50 rounded-lg mb-1 leading-none">تطابق‌های شناسایی شده در کاتالوگ:</span>
                    {driverSuggestions.map((drv) => (
                      <button
                        key={drv.id}
                        type="button"
                        onClick={() => {
                          setSelectedDriver(drv);
                          setSearchModel('');
                          setDriverSuggestions([]);

                          // Feed metadata nicely into description text block
                          const generatedTextStr = `🔧 درخواست پیکربندی نصب هوشمند درایور:\n` +
                            `• مدل قطعه سخت افزاری: ${drv.hardwareModel}\n` +
                            `• بسته‌بندی شناسایی شده: ${drv.name} (نسخه: ${drv.version})\n` +
                            `• ظرفیت حجم: ${drv.size} | میزان تطابق سازنده: ${drv.compatibility}\n` +
                            `• شاخه قطعات: ${drv.category}\n` +
                            `-----------------------------------------------------\n` +
                            `شرح تداخل‌ها و ایرادی که مایلم برطرف شود: `;

                          setDescription(generatedTextStr + (description.includes("درخواست پیکربندی نصب هوشمند") ? "" : description));
                        }}
                        className="w-full text-right p-2.5 hover:bg-slate-50 rounded-xl flex flex-col gap-1 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <strong className="text-xs text-slate-800 font-black flex items-center gap-1.5">
                            <Cpu className="h-3.5 w-3.5 text-indigo-550 shrink-0" />
                            {drv.name}
                          </strong>
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{drv.compatibility}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium flex justify-between items-center pr-5">
                          <span>سخت‌افزار هدف: {drv.hardwareModel}</span>
                          <span className="font-mono text-slate-400">{drv.size} | v{drv.version}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected preview layout */}
                {selectedDriver && (
                  <div className="mt-2.5 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between gap-3 text-emerald-900">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-500 text-white rounded-lg">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="text-right">
                        <strong className="text-[11px] font-black block text-emerald-950">مدل درایور {selectedDriver.name} متصل شد.</strong>
                        <span className="text-[10px] text-emerald-700 font-bold">پارامترهای نصب سخت‌افزار هدف به توضیحات درخواست الحاق گردید.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver(null);
                        setDescription('');
                      }}
                      className="text-[10px] text-rose-650 font-black hover:underline shrink-0"
                    >
                      لغو الحاق
                    </button>
                  </div>
                )}
              </div>

              {/* Explain Problem Description Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-405" />
                    <span>شرح مشکل سیستم و مدل‌های فرعی قطعات</span>
                  </label>
                  <span className={`text-[9px] font-bold ${description.trim().length >= 15 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {description.trim().length} / ۱۵ کاراکتر حداقل
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setTouched((prev) => ({ ...prev, description: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                  placeholder="مشکل سیستم، علائم تداخل، کدهای ارور یا قطعه مورد نظر برای راه‌اندازی را با جزئیات بنویسید (حداقل ۱۵ حرف)"
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl text-xs outline-none border leading-relaxed transition-all ${
                    touched.description && validateDescription()
                      ? 'border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-50/30 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
                {touched.description && validateDescription() && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{validateDescription()}</span>
                  </p>
                )}
              </div>

              {/* Submit Action button CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className={`w-full py-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  !isFormValid
                    ? 'bg-slate-205 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/10 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>در حال ثبت فایل پرونده...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 rotate-180" />
                    <span>ثبت سفارش و ارسال به صف ارزیابی سیستم</span>
                  </>
                )}
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
