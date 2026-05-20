import React from 'react';
import { Laptop, Phone, Mail, MapPin, ExternalLink, Heart } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="bg-slate-900 text-slate-350 border-t border-slate-850 font-sans mt-auto" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand & Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-xl text-white">
                <Laptop className="h-5 w-5" />
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                EasyDriver
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              سامانه هوشمند ایزی‌درایور، اولین پلتفرم تخصصی نصب درایور، راه‌اندازی نرم‌افزارهای مهندسی و عمومی، و رفع مشکلات سیستم‌عامل از راه دور است. با مجرب‌ترین تکنسین‌ها آماده خدمت‌رسانی به شما هستیم.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">دسترسی سریع</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('home')} className="hover:text-blue-400 transition-colors text-right cursor-pointer">
                  صفحه اصلی / معرفی خدمات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('new-request')} className="hover:text-blue-400 transition-colors text-right cursor-pointer">
                  ثبت درخواست جدید خدمات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('my-requests')} className="hover:text-blue-400 transition-colors text-right cursor-pointer">
                  پیگیری وضعیت سفارشات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('tickets')} className="hover:text-blue-400 transition-colors text-right cursor-pointer">
                  تیکتینگ و پشتیبانی مجرب
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact details */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">ارتباط با ایزی‌درایور</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                <span className="font-mono">۰۲۱-۸۸۸۸۴۴۴۴</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                <span className="font-mono">support@easydriver.ir</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>پشتیبانی شبانه‌روزی از سراسر کشور</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} ایزی‌درایور (EasyDriver). تمامی حقوق برای توسعه‌دهندگان محفوظ است.
          </p>
          <p className="flex items-center gap-1.5">
            <span>ساخته شده با عشق جهت ارائه برترین کیفیت خدمات آنلاین</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
