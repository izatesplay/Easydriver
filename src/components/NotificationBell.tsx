import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCheck, Trash2, MessageSquare, AlertCircle, Sparkles, Star, ClipboardCheck, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';

export const NotificationBell: React.FC = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadsCount = notifications.filter(n => !n.read).length;

  // Closes dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string, priority?: string) => {
    switch (type) {
      case 'request_created':
        return (
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <ClipboardCheck className="h-4 w-4" />
          </div>
        );
      case 'request_status':
        return (
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      case 'ticket_created':
        return (
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <AlertCircle className="h-4 w-4" />
          </div>
        );
      case 'ticket_reply':
        return (
          <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      case 'ticket_status':
        return (
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Info className="h-4 w-4" />
          </div>
        );
      case 'review_created':
        return (
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
            <Star className="h-4 w-4 fill-rose-100" />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  const getPriorityStyle = (priority?: string) => {
    if (priority === 'high' || priority === 'urgent') {
      return 'border-r-4 border-rose-500';
    }
    return '';
  };

  const formatPersianTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'هم‌اکنون';
      if (diffMins < 60) return `${diffMins} دقیقه پیش`;
      if (diffHours < 24) return `${diffHours} ساعت پیش`;
      
      return date.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'به تازگی';
    }
  };

  return (
    <div className="relative font-sans text-right" ref={dropdownRef} dir="rtl">
      {/* Target Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer border border-slate-100 bg-slate-50/30"
        aria-label="اعلان‌ها"
        id="notification-bell-btn"
      >
        <Bell className={`h-4.5 w-4.5 ${unreadsCount > 0 ? 'animate-swing origin-top' : ''}`} />
        
        {/* Unread Counter Badge */}
        <AnimatePresence>
          {unreadsCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm shadow-rose-500/20"
            >
              {unreadsCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Floating Dropdown Frame */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-55/40 px-4.5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-sm">اعلان‌های سیستم</span>
                {unreadsCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {unreadsCount} جدید
                  </span>
                )}
              </div>
              
              {unreadsCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>خواندم همه را</span>
                </button>
              )}
            </div>

            {/* List Body */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="rounded-full bg-slate-50 p-4 mb-3 border border-slate-100/60">
                    <Bell className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">هیچ محدوده اعلانی یافت نشد</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">
                    نوتیفیکیشن‌های زنده مربوط به تایید درخواست‌ها و به‌روزرسانی‌های پشتیبانی اینجا قرار خواهند گرفت.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 p-4 transition-all hover:bg-slate-50/70 relative ${getPriorityStyle(notif.priority)} ${
                      !notif.read ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Unread badge dot */}
                    {!notif.read && (
                      <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 animate-pulse ml-1" />
                    )}

                    {/* Category Icon */}
                    <div className="shrink-0 pt-0.5">
                      {getNotificationIcon(notif.type, notif.priority)}
                    </div>

                    {/* Notification Details */}
                    <div className="grow space-y-1">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-xs font-bold text-slate-800 tracking-tight leading-snug pl-5 ${!notif.read ? 'text-blue-900' : ''}`}>
                          {notif.title}
                        </h4>
                        
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">
                          {formatPersianTime(notif.createdDate)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-normal font-sans">
                        {notif.message}
                      </p>

                      {/* Read Action Button */}
                      {!notif.read && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            <span>به عنوان خوانده شده</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer Details */}
            <div className="border-t border-slate-100 bg-slate-50/40 text-center py-2 px-4.5">
              <span className="text-[9px] text-slate-400 font-medium">اکوسیستم هوشمند پشتیبانی راه دور ایزی‌درایور (EasyDriver)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
