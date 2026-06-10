import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { Eye, EyeOff, Save, Key, Mail, User as UserIcon, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { currentUser, saveUser } = useApp();
  
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setEmail(currentUser.email || '');
      setAvatarUrl(currentUser.avatarUrl || '');
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <p className="text-xs text-slate-500 font-bold">بخش پروفایل نیاز به ورود دارد.</p>
      </div>
    );
  }

  // Convert uploaded image file to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('سایز فایل تصویر نباید بیشتر از ۲ مگابایت باشد.');
      setSuccessMsg('');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      setErrorMsg('');
    };
    reader.onerror = () => {
      setErrorMsg('خطا در خواندن فایل تصویر.');
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('لطفاً نام کامل و ایمیل خود را به طور کامل وارد نمایید.');
      setSuccessMsg('');
      return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl.startsWith('data:image/')) {
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `profile_${currentUser.id}.png`,
              base64Data: avatarUrl
            })
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.success) {
            finalAvatarUrl = uploadData.url;
            setAvatarUrl(uploadData.url); // update state preview/url to point to static URL
          }
        } catch (uploadErr) {
          console.error('Failed to upload avatar image, falling back to base64:', uploadErr);
        }
      }

      const payload: Partial<User> & { password?: string; isActive?: boolean } = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: currentUser.phone || '09120000000',
        role: currentUser.role,
        avatarUrl: finalAvatarUrl,
        isActive: true,
      };

      if (password.trim() !== '') {
        payload.password = password.trim();
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Successfully updated profile, synchronise local state user using context
        const updatedUser: User = {
          ...currentUser,
          fullName: fullName.trim(),
          email: email.trim(),
          avatarUrl: finalAvatarUrl,
        };
        saveUser(updatedUser);
        setSuccessMsg('پروفایل کاربری شما با موفقیت بروزرسانی شد.');
        setPassword(''); // Clear secret input
      } else {
        setErrorMsg(data.error || 'خطا در ذخیره‌سازی اطلاعات پروفایل.');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setErrorMsg('خطای ارتباط با سرور. لطفاً پورت شبکه خود را بازبینی فرمایید.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="font-sans max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm" dir="rtl">
      {/* Visual top banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-8 text-white relative">
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl border-2 border-white/20 overflow-hidden shadow flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow cursor-pointer transition-all flex items-center justify-center">
              <Camera className="h-3.5 w-3.5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black">{fullName || 'پروفایل کاربری'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {currentUser.role === 'admin' ? 'مدیریت کل سیستم' : 'تکنسین ارشد خدمات ریموت'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 space-y-6">
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Name input */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 block">نام کامل و نام خانوادگی</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: علیرضا مرادی"
              className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-normal text-right"
              required
            />
          </div>
        </div>

        {/* Email input */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 block">آدرس ایمیل</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@easydriver.ir"
              className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-normal text-left font-mono"
              required
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 block">رمز عبور جدید (اختیاری)</label>
          <p className="text-[10px] text-slate-400 font-semibold mb-1">اگر می‌خواهید کلمه عبور فعلی تغییر کند، رمز جدید را بنویسید.</p>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Key className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="کلمه عبور جدید را حداقل ۶ کاراکتر انتخاب کنید"
              className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-normal text-left font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>ذخیره تغییرات پروفایل</span>
          </button>
        </div>
      </form>
    </div>
  );
};
