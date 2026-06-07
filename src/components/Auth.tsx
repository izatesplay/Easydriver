import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { User, Mail, Phone, Lock, Sparkles, Key, CheckCircle, ArrowLeft, Shield, Hammer, Users } from 'lucide-react';
import { motion } from 'motion/react';

const INITIAL_REGISTERED_USERS = [
  {
    id: 'user-customer',
    fullName: 'سعید رستمی',
    email: 'saeed@customer.ir',
    phone: '09121234567',
    role: 'customer',
    password: '123',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'tech-1',
    fullName: 'مهندس نوید مرادی',
    email: 'navid@easydriver.ir',
    phone: '09123456789',
    role: 'technician',
    password: '123',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'admin-1',
    fullName: 'مدیر کل ایزی‌درایور (امین)',
    email: 'izatesplay@gmail.com',
    phone: '09386561626',
    role: 'admin',
    password: '09386561626mM@',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
  }
];

interface AuthProps {
  onSuccess?: () => void;
  setActiveTab?: (tab: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, setActiveTab }) => {
  const { login, addTechnician, technicians, loadFreshData } = useApp();
  const [activeMode, setActiveMode] = useState<'login' | 'signup'>('login');
  
  // Signup State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('customer');
  const [password, setPassword] = useState('');
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('customer');

  // Success Notification state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Helper to load/save registered users list
  const getRegisteredUsers = (): any[] => {
    const stored = localStorage.getItem('ed_registered_users');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return INITIAL_REGISTERED_USERS;
      }
    }
    localStorage.setItem('ed_registered_users', JSON.stringify(INITIAL_REGISTERED_USERS));
    return INITIAL_REGISTERED_USERS;
  };

  // Handles actual login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginIdentifier.trim()) {
      setErrorMsg('لطفاً ایمیل یا شماره موبایل را وارد فرمایید.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('لطفاً رمز عبور را وارد فرمایید.');
      return;
    }

    const selectedRole = loginRole;
    const registered = getRegisteredUsers();

    // Find if user is registered for the specified role
    const matchedUser = registered.find(
      (u) =>
        u.role === selectedRole &&
        (u.email.trim().toLowerCase() === loginIdentifier.trim().toLowerCase() ||
         u.phone.trim() === loginIdentifier.trim())
    );

    if (!matchedUser) {
      setErrorMsg('تطابق ناموفق: حساب کاربری با این ایمیل یا موبایل در نقش انتخاب شده یافت نشد.');
      return;
    }

    if (matchedUser.password !== loginPassword) {
      setErrorMsg('رمز عبور وارد شده اشتباه است. لطفاً مجدداً بررسی فرمایید.');
      return;
    }

    // Verify Technician active status
    if (selectedRole === 'technician') {
      const activeTech = (technicians || []).find((t) => t.id === matchedUser.id || t.email?.toLowerCase() === matchedUser.email?.toLowerCase());
      if (!activeTech || !activeTech.isActive) {
        setErrorMsg('حساب کاربری تکنسینی شما هنوز توسط مدیریت ریموت تایید و فعال نگردیده است. مقتضی است منتظر تایید اولیه بمانید.');
        return;
      }
    }

    setSuccessMsg(`خوش آمدید، جناب ${matchedUser.fullName}! ورود موفقیت‌آمیز بود.`);
    setShowSuccess(true);

    setTimeout(() => {
      login(matchedUser.email, matchedUser.fullName, selectedRole, {
        id: matchedUser.id,
        phone: matchedUser.phone,
        avatarUrl: matchedUser.avatarUrl,
      });
      if (onSuccess) onSuccess();
      if (setActiveTab) {
        if (selectedRole === 'admin') setActiveTab('admin-dashboard');
        else if (selectedRole === 'technician') setActiveTab('tech-dashboard');
        else setActiveTab('home');
      }
    }, 1200);
  };

  // Handles actual signup submission
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('لطفاً تمامی فیلدها را با مقادیر معتبر تکمیل نمایید.');
      return;
    }

    if (signupRole === 'admin') {
      setErrorMsg('غیرمجاز: امکان عضویت به عنوان مدیر کل در فرم عمومی وجود ندارد.');
      return;
    }

    const registered = getRegisteredUsers();

    // Check if duplicate email or phone exists
    const duplicate = registered.find(
      (u) =>
        u.email.trim().toLowerCase() === email.trim().toLowerCase() ||
        u.phone.trim() === phone.trim()
    );

    if (duplicate) {
      setErrorMsg('خطا در ثبت‌نام: یک حساب کاربری با همین ایمیل یا شماره موبایل قبلاً ثبت شده است.');
      return;
    }

    const newRegisteredId = signupRole === 'technician' ? `tech-${Date.now()}` : `user-${Date.now()}`;
    const newRegisteredUser = {
      id: newRegisteredId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: signupRole,
      password: password,
      isActive: signupRole === 'technician' ? false : true,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName.trim())}`,
    };

    // Save to registered users DB
    const updatedList = [...registered, newRegisteredUser];
    localStorage.setItem('ed_registered_users', JSON.stringify(updatedList));

    // Also persist in the backend database (MySQL or Local JSON backup)
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newRegisteredId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: signupRole,
        password: password,
        avatarUrl: newRegisteredUser.avatarUrl,
        isActive: signupRole === 'technician' ? false : true,
      })
    })
    .then(() => {
      if (loadFreshData) loadFreshData();
    })
    .catch(err => console.error("Error writing user to backend DB:", err));

    if (signupRole === 'technician') {
      // Register in technicians collection as inactive
      addTechnician({
        id: newRegisteredId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        specialty: 'all',
        isActive: false,
        completedTasks: 0,
        points: 0,
        certificationLevel: 'Junior'
      });

      setSuccessMsg(`ثبت‌نام شما با عنوان تکنسین «${fullName}» با موفقیت انجام شد. حساب شما غیرفعال است و پس از تایید مدیریت فعال خواهد شد.`);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setActiveMode('login');
        setLoginRole('technician');
        setLoginIdentifier(email.trim().toLowerCase());
        setLoginPassword('');
      }, 3500);
    } else {
      setSuccessMsg(`حساب کاربری شما با عنوان «${fullName}» در نقش مشتری با موفقیت ساخته شد.`);
      setShowSuccess(true);

      setTimeout(() => {
        login(newRegisteredUser.email, newRegisteredUser.fullName, signupRole, {
          id: newRegisteredUser.id,
          phone: newRegisteredUser.phone,
          avatarUrl: newRegisteredUser.avatarUrl,
        });
        if (onSuccess) onSuccess();
        if (setActiveTab) {
          setActiveTab('home');
        }
      }, 1200);
    }
  };

  return (
    <div className="font-sans min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50 text-right" dir="rtl">
      
      {/* Absolute Success Backdrop popup overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-base font-black text-slate-900">انتقال آنی به پرتال کاربری</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">{successMsg}</p>
            <div className="w-8 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full animate-bounce mt-4" />
          </motion.div>
        </div>
      )}

      {/* Main Form container grid */}
      <div className="max-w-5xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left column info decor panel (hidden on small) */}
        <div className="lg:col-span-5 bg-gradient-to-tr from-blue-900 via-indigo-900 to-slate-950 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl" />
          
          <div className="space-y-3 relative z-10">
            <span className="text-[10px] tracking-widest font-black text-blue-400 uppercase">سیستم یکپارچه نصب درایور</span>
            <h2 className="text-2xl font-black leading-tight">پرتال متمرکز مشتریان و تکنسین‌ها</h2>
            <p className="text-xs font-normal text-slate-300 leading-relaxed">
              با ایجاد حساب کاربری در EasyDriver، گام بلندی در تسهیل نصب‌های ریموت خود بردارید. به سرعت مشخصات رایانه خود را برای کارشناسان ریموت ارسال کنید.
            </p>
          </div>

          <div className="space-y-4 pt-12 relative z-10">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 text-xs leading-relaxed font-normal">
              <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <strong className="block font-bold text-slate-100">دریافت آنی پشتیبانی</strong>
                <span className="text-[11px] text-slate-350">پس از ورود می‌توانید در کمتر از ۳ دقیقه تیکت یا درخواست اورژانسی با کد آنی‌دسک ثبت کنید.</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 text-xs leading-relaxed font-normal">
              <Key className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-bold text-slate-100">امنیت هویت کاربران</strong>
                <span className="text-[11px] text-slate-350">اطلاعات اتصال، تلفن‌ها و یادداشت‌های سیستم، صرفاً برای تکنسین ارجاع‌شده امن می‌ماند.</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono tracking-widest pt-8 border-t border-white/5 uppercase">
            EasyDriver Remote Center v2.5
          </div>
        </div>

        {/* Right column Form wizard control */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          
          {/* Tabs header */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
            <button
              onClick={() => setActiveMode('login')}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'login'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ورود سریع کاربران
            </button>
            <button
              onClick={() => setActiveMode('signup')}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'signup'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ثبت‌نام همکار یا مشتری جدید
            </button>
          </div>

          {/* Form switch views */}
          <div>
            {activeMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-950">به پرتال EasyDriver وارد شوید</h3>
                  <p className="text-xs text-slate-400">اطلاعات کاربری شخصی خود را در کادرهای زیر بنویسید</p>
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold leading-relaxed text-right"
                  >
                    {errorMsg}
                  </motion.div>
                )}

                <div className="space-y-4">
                  {/* Email & Phone */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">شماره موبایل یا ایمیل حساب کاربری</label>
                    <div className="relative flex items-center">
                      <div className="absolute right-3.5 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="example@easydriver.ir یا شماره تلفن"
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Password mock */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">رمز عبور اختصاصی (در صورت داشتن)</label>
                    <div className="relative flex items-center">
                      <div className="absolute right-3.5 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Test Switch Role */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-500 block">انتخاب نقش کاربری ورودی:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'customer', name: 'مشتری عادی', icon: Users, color: 'hover:border-blue-500' },
                        { id: 'technician', name: 'تکنسین فنی', icon: Hammer, color: 'hover:border-purple-500' },
                        { id: 'admin', name: 'مدیر کل (Admin)', icon: Shield, color: 'hover:border-rose-500' },
                      ].map((rl) => (
                        <button
                          key={rl.id}
                          type="button"
                          onClick={() => setLoginRole(rl.id as UserRole)}
                          className={`p-2.5 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            loginRole === rl.id
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <rl.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{rl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-xl shadow-blue-500/15 cursor-pointer"
                >
                  تایید و ورود آنلاین به حساب
                </button>

              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-950">عضویت در سامانه همکاران و مشتریان جدید</h3>
                  <p className="text-xs text-slate-400">کادرهای زیر را طبق اصول فیلدها تکمیل نمایید</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">نام و نام خانوادگی گرانقدر</label>
                    <div className="relative flex items-center">
                      <div className="absolute right-3.5 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: آرش علیزاده"
                        className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">شماره موبایل فعال</label>
                    <div className="relative flex items-center">
                      <div className="absolute right-3.5 text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09123456789"
                        className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">آدرس پست الکترونیکی (ایمیل)</label>
                  <div className="relative flex items-center">
                    <div className="absolute right-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arash@gmail.com"
                      className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password signup */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">رمز عبور امنیتی برای ورود بعدی</label>
                  <div className="relative flex items-center">
                    <div className="absolute right-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Choose role for signup */}
                <div className="space-y-1.5 pt-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">لطفاً نقش کاربری خودتان را تعیین فرمایید:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'customer', title: 'مشتری متقاضی خدمت نصب', desc: 'نیاز به آپدیت سیستم ها دارم', icon: Users },
                      { id: 'technician', title: 'تکنسین ریموت و ای‌دی پی‌سی', desc: 'نصب‌های تخصصی را بلد هستم', icon: Hammer },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setSignupRole(btn.id as UserRole)}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                          signupRole === btn.id
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <btn.icon className="h-4 w-4 shrink-0" />
                          <span className="font-extrabold text-[11px]">{btn.title}</span>
                        </div>
                        <p className={`text-[9px] mt-1 ${signupRole === btn.id ? 'text-slate-350' : 'text-slate-400'}`}>{btn.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-xl shadow-blue-500/15 cursor-pointer mt-2"
                >
                  تکمیل عضویت و ساخت فوری حساب
                </button>
              </form>
            )}
          </div>

          {/* Go Back Trigger link */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('home')}
              className="mt-6 text-[11px] text-slate-400 hover:text-slate-950 font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer mx-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>بازگشت به صحنه اصلی سایت ایزی‌درایور</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
