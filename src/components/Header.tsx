import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Layers, ShieldCheck, LogOut, Menu, X, Laptop, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout, switchRole, requests, tickets } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const openTicketCount = tickets.filter(t => t.status === 'open').length;

  const mainNav = [
    { id: 'home', label: 'خانه' },
    { id: 'new-request', label: 'ثبت درخواست جدید' },
    { id: 'my-requests', label: 'پیگیری درخواست‌ها' },
    { id: 'tickets', label: 'تیکت‌های پشتیبانی' },
    { id: 'support-chat', label: 'چت آنلاین' },
    { id: 'reviews', label: 'نظرات مشتریان' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/10">
              <Laptop className="h-5 w-5" />
            </div>
            <div className="text-right">
              <span className="block font-black text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                EasyDriver
              </span>
              <span className="block text-[10px] text-slate-400 font-medium -mt-1 font-mono">
                Remote Installation Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {mainNav.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Admin panel tab (only visible if admin role active) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ml-1 ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-rose-50 border border-rose-100 text-rose-600 shadow-sm'
                    : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50/50'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>پنل مدیریت ادمین</span>
                {(pendingCount > 0 || openTicketCount > 0) && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            )}

            {/* Technician panel tab (only visible if technician role active) */}
            {currentUser?.role === 'technician' && (
              <button
                onClick={() => setActiveTab('tech-dashboard')}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ml-1 ${
                  activeTab === 'tech-dashboard'
                    ? 'bg-purple-50 border border-purple-100 text-purple-650 shadow-sm'
                    : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50/50'
                }`}
              >
                <Laptop className="h-4 w-4 text-purple-600" />
                <span>پنل تکنسین</span>
              </button>
            )}
          </nav>

          {/* User Actions & Mobile Trigger */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <NotificationBell />
            )}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* User Info Capsule */}
                <div className="hidden sm:flex flex-col text-left items-end">
                  <span className="text-xs font-bold text-slate-800">{currentUser.fullName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role === 'admin' ? 'مدیر کل' : currentUser.role === 'technician' ? 'تکنسین فنی' : 'مشتری طلایی'}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.fullName}`}
                    alt={currentUser.fullName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button
                  onClick={() => {
                    logout();
                    setActiveTab('home');
                  }}
                  title="خروج از حساب"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('auth');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/15 cursor-pointer"
              >
                ورود / ثبت‌نام سریع
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-950 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200/60 bg-white shadow-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {mainNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`nav-button w-full text-right block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              {/* Mobile Admin panel link */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setActiveTab('admin-dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-right flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-rose-100/50 mt-2 ${
                    activeTab === 'admin-dashboard' ? 'bg-rose-50 text-rose-600' : 'bg-rose-50/20 text-rose-600'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>پنل مدیریت ادمین</span>
                  {(pendingCount > 0 || openTicketCount > 0) && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-auto">
                      {pendingCount + openTicketCount} مورد جدید
                    </span>
                  )}
                </button>
              )}

              {/* Mobile Technician panel link */}
              {currentUser?.role === 'technician' && (
                <button
                  onClick={() => {
                    setActiveTab('tech-dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-right flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-purple-100/50 mt-2 ${
                    activeTab === 'tech-dashboard' ? 'bg-purple-50 text-purple-650' : 'bg-purple-50/20 text-purple-650'
                  }`}
                >
                  <Laptop className="h-4 w-4 text-purple-600" />
                  <span>پنل تکنسین فنی</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
