import React, { useState } from 'react';
import { useApp, MOCK_USERS } from '../context/AppContext';
import { UserRole } from '../types';
import { Shield, Hammer, User, Layers, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, switchRole, requests, tickets, reviews } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser) return null;

  // Calculate pending/open stats for badges
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const pendingReviews = reviews.filter(r => !r.isApproved).length;

  const roles = [
    {
      role: 'customer' as UserRole,
      title: 'مشتری (کاربر عادی)',
      desc: 'ثبت درخواست جدید، پیگیری وضعیت، ثبت نظر و چت پشتیبانی',
      icon: User,
      color: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      textColor: 'text-blue-600',
      badge: null,
    },
    {
      role: 'technician' as UserRole,
      title: 'تکنسین فنی پرتال',
      desc: 'مشاهده سرویس‌های واگذاری، آپدیت گام‌های نصب درایور، یادداشت‌ها و تیکت‌ها',
      icon: Hammer,
      color: 'bg-gradient-to-r from-purple-600 to-indigo-600',
      textColor: 'text-purple-600',
      badge: requests.filter(r => r.assignedToId === currentUser.id || (!r.assignedToId && currentUser.id === 'tech-1')).filter(r => r.status === 'assigned' || r.status === 'approved' || r.status === 'in_progress').length,
    },
    {
      role: 'admin' as UserRole,
      title: 'مدیر کل سیستم',
      desc: 'مدیریت و تایید درخواست‌ها، تعریف تکنسین‌ها، پاسخ به تیکت‌ها و تایید نظرات',
      icon: Shield,
      color: 'bg-gradient-to-r from-red-600 to-rose-600',
      textColor: 'text-red-600',
      badge: pendingRequests + openTickets + pendingReviews,
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h4 className="font-bold text-sm">شبیه‌ساز و تغییر نقش تعاملی</h4>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full">
                EasyDriver Dev Suite
              </span>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-indigo-50/50 border-b border-indigo-50">
              <p className="text-xs text-indigo-950 leading-relaxed">
                برای تست کامل عملکردهای وبسایت، می‌توانید بین نقش‌های زیر سوئیچ کنید تا تغییرات را به‌صورت لحظه‌ای در پنل‌ها مشاهده نمایید.
              </p>
            </div>

            {/* Roles Selection */}
            <div className="p-3 space-y-2">
              {roles.map((item) => {
                const isSelected = currentUser.role === item.role;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.role}
                    onClick={() => {
                      switchRole(item.role);
                      setIsOpen(false);
                    }}
                    className={`w-full p-3 text-right rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                      isSelected
                        ? 'bg-slate-50 border-slate-300 ring-2 ring-slate-900/10'
                        : 'border-slate-100 bg-white hover:bg-slate-50/70 hover:border-slate-200'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg text-white shrink-0 ${
                        isSelected ? item.color : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="grow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">{item.title}</span>
                        {item.badge !== null && item.badge > 0 && (
                          <span className="bg-rose-500 text-white font-bold text-[10px] h-5 min-w-5 px-1 rounded-full flex items-center justify-center animate-bounce">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current user footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span>کاربر فعلی:</span>
                <strong className="text-slate-800 font-bold">{currentUser.fullName}</strong>
              </span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                {currentUser.role === 'admin' ? 'مدیر سیستم' : 'مشتری'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2.5 group hover:scale-[1.02]"
      >
        <span className="text-xs font-bold leading-none hidden md:inline-block">تست و تغییر نقش سیستم</span>
        <RefreshCw className="h-4 w-4 text-emerald-400 group-hover:rotate-180 transition-transform duration-700" />
      </button>
    </div>
  );
};
