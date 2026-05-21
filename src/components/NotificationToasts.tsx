import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, MessageSquare, ClipboardCheck, AlertCircle, Bell, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationToasts: React.FC = () => {
  const { toasts, closeToast } = useApp();

  const getToastStyle = (priority?: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-gradient-to-r from-rose-900/95 to-red-800/95 text-white shadow-xl shadow-red-900/10 border-rose-700/50';
      default:
        return 'bg-gradient-to-r from-slate-900/95 to-slate-800/95 text-white shadow-xl shadow-slate-950/20 border-slate-700/50';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'request_created':
        return (
          <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
            <ClipboardCheck className="h-4.5 w-4.5" />
          </div>
        );
      case 'request_status':
        return (
          <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        );
      case 'ticket_created':
        return (
          <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
        );
      case 'ticket_reply':
        return (
          <div className="p-1.5 bg-cyan-500/20 rounded-lg text-cyan-400">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
        );
      case 'review_created':
        return (
          <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
            <Star className="h-4.5 w-4.5 fill-rose-400/25" />
          </div>
        );
      default:
        return (
          <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
            <Bell className="h-4.5 w-4.5" />
          </div>
        );
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 w-80 sm:w-96 select-none font-sans" dir="rtl">
      <AnimatePresence>
        {toasts.map((toast) => {
          const notif = toast.notification;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-md px-4.5 py-4 flex gap-3.5 items-start ${getToastStyle(
                notif.priority
              )}`}
            >
              {/* Left Color Ribbed Stripe */}
              <div className="shrink-0 pt-0.5">
                {getIcon(notif.type)}
              </div>

              {/* Toast Details */}
              <div className="grow space-y-1">
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-black tracking-tight leading-snug">
                    {notif.title}
                  </h4>
                  <button
                    onClick={() => closeToast(toast.id)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mr-2 -mt-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-200/90 leading-relaxed pl-3 font-medium">
                  {notif.message}
                </p>
              </div>

              {/* Animated Progress Countdown Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${
                  notif.priority === 'high' || notif.priority === 'urgent'
                    ? 'from-rose-400 to-red-400'
                    : 'from-blue-400 to-indigo-400'
                }`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
