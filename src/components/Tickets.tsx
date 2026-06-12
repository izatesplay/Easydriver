import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TicketCategory, TicketPriority, TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, Ticket, getFullFileUrl } from '../types';
import { Send, Plus, Inbox, Clipboard, MessageSquare, ShieldAlert, Key, MessageCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Upload, X, File, Trash2, Image, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRenderTracker } from '../utils/indexedDB';

interface TicketsProps {
  setActiveTab: (tab: string) => void;
  setSelectedTicketId: (id: string) => void;
}

export const Tickets: React.FC<TicketsProps> = ({ setActiveTab, setSelectedTicketId }) => {
  useRenderTracker("پشتیبانی تیکت (Tickets)");
  const { currentUser, tickets, addTicket } = useApp();

  // Form toggling
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Form states
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [message, setMessage] = useState('');
  
  // Custom enhanced fields states
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFile, setAttachedFile] = useState('');
  const [availabilityTime, setAvailabilityTime] = useState('any'); // 'morning', 'afternoon', 'evening', 'night' or 'any'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Feedbacks
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">نیاز به ورود به بخش پشتیبانی</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              جهت طرح مکاتبات مالی یا رفع تداخل‌های فایروال با واحد پشتیبانی فنی ریموت، باید با حساب کاربری خود فعال باشید.
            </p>
          </div>
          <div className="pt-2">
            <button
               onClick={() => setActiveTab('auth')}
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

  // Filter tickets created by current user
  const myTickets = tickets.filter((t) => t.createdBy === currentUser.id);

  // Handlers for file selection and mock upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('اندازه فایل انتخابی بیش از ۵ مگابایت است.');
      return;
    }

    setAttachedFileName(file.name);
    setUploadProgress(10);
    setError('');

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 15;
      });
    }, 150);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFileName('');
    setAttachedFile('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('موضوع تیکت نمی‌تواند خالی باشد.');
      return;
    }
    if (!message.trim() || message.length < 10) {
      setError('پیغام تیکت به همراه مشخصات سیستم و جزئیات ارور باید حداقل ۱۰ کاراکتر باشد.');
      return;
    }

    setError('');
    
    // Add ticket with enhanced fields
    const AVAILABILITY_LABELS: Record<string, string> = {
      any: 'هر زمان مناسب تکنسین (انعطاف پذیر)',
      morning: 'صبح (ساعت ۸ الی ۱۲)',
      afternoon: 'ظهر (ساعت ۱۲ الی ۱۶)',
      evening: 'عصر (ساعت ۱۶ الی ۲۰)',
      night: 'شب (ساعت ۲۰ الی ۲۴)',
    };

    addTicket({
      subject,
      category,
      priority,
      message,
      userName: currentUser.fullName,
      userEmail: currentUser.email,
      attachedFileName: attachedFileName || undefined,
      attachedFile: attachedFile || undefined,
      availabilityTime: AVAILABILITY_LABELS[availabilityTime] || undefined,
    });

    setSuccess(true);
    setSubject('');
    setMessage('');
    setAttachedFileName('');
    setAttachedFile('');
    setUploadProgress(0);
    setAvailabilityTime('any');
    
    // Close form after timeout
    setTimeout(() => {
      setSuccess(false);
      setShowCreateForm(false);
    }, 2000);
  };

  const handleOpenChat = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setActiveTab('support-chat');
  };

  const AVAILABILITY_SLOTS = [
    { key: 'any', label: 'انعطاف‌پذیر', sub: 'هر زمان مناسب بود' },
    { key: 'morning', label: 'صبح‌گاه', sub: '۸ الی ۱۲' },
    { key: 'afternoon', label: 'بعد از ظهر', sub: '۱۲ الی ۱۶' },
    { key: 'evening', label: 'غروب و عصر', sub: '۱۶ الی ۲۰' },
    { key: 'night', label: 'شام‌گاه و شب', sub: '۲۰ الی ۲۴' },
  ];

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb row & Create button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-[10px] text-blue-600 font-bold block">پشتیبانی همه‌جانبه EasyDriver</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">تیکت‌های پشتیبانی</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{showCreateForm ? 'مشاهده تیکت‌های فعال' : 'ایجاد تیکت پشتیبانی جدید'}</span>
          </button>
        </div>

        {/* 1. Form segment block (conditional) */}
        {showCreateForm ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-right space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-850 text-sm sm:text-base">ارسال تیکت فنی به مهندسان</h3>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                فرم جدید و ارتقا یافته
              </span>
            </div>

            {success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-center text-xs font-bold">
                تیکت پشتیبانی شما با موفقیت ثبت شد! در حال انتقال به لیست تیکت‌ها...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Subject input */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">موضوع پیام</label>
                    <input
                       type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="مثال: قطعی مکرر فعالسازی لایسنس متلب"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Category select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">دسته بندی</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TicketCategory)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-none cursor-pointer"
                    >
                      {Object.entries(TICKET_CATEGORY_LABELS).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Priority selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">اولویت پاسخ‌دهی</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                      {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`grow py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            priority === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {TICKET_PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Information capsule banner */}
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2 text-indigo-900 text-[10px] leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0 text-indigo-550 mt-0.5" />
                    <p className="font-normal">
                      اگر موضوع شما فنی است، ترجیحاً تصویر خطا را در کادر زیر آپلود کنید و مناسب‌ترین زمان خود را مشخص نمایید تا هماهنگی با سرعت بیشتری انجام شود.
                    </p>
                  </div>
                </div>

                {/* Main message text */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">شرح پیغام (مشکل، خطاهای دریافت شده)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="لطفاً جزییات سخت‌افزار یا سیستم عامل را بنویسید..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-none leading-relaxed focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  
                  {/* Visual Dropzone for error screenshot uploading file */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Image className="h-3.5 w-3.5 text-slate-400" />
                      <span>ضمیمه فایـل (تصویـر خطـا / اسکرین‌شات)</span>
                    </label>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[120px] transition-all ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/40' 
                          : attachedFileName 
                            ? 'border-emerald-300 bg-emerald-50/20' 
                            : 'border-slate-250 bg-slate-50/50 hover:bg-slate-55/60 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.txt"
                        className="hidden" 
                      />

                      {attachedFileName ? (
                        <div className="space-y-2 w-full px-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between text-xs font-semibold bg-white p-2 border border-slate-200/80 rounded-xl">
                            <div className="flex items-center gap-2 truncate max-w-[80%] text-slate-705">
                              {attachedFile.startsWith('data:image/') ? (
                                <img src={attachedFile} className="h-8 w-8 rounded object-cover border border-slate-200 shrink-0" alt="preview" />
                              ) : (
                                <File className="h-5 w-5 text-blue-500 shrink-0" />
                              )}
                              <span className="truncate">{attachedFileName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={removeAttachedFile}
                              className="p-1 px-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف فایل"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {uploadProgress < 100 ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[9px] text-slate-400">
                                <span>در حال پردازش و آپلود فایل...</span>
                                <span className="font-mono">{uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5 justify-center">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>فایل برای ارسال تایید شد (ارسال در نسخه پیش‌نمایش)</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 pointer-events-none">
                          <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                          <p className="text-[11px] font-bold text-slate-700">کلیک کنید یا فایل را به این بخش بکشید</p>
                          <p className="text-[9px] text-slate-400">پشتیبانی از عکس (.PNG, .JPG) و فایل تا حداکثر ۵ مگابایت</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approximate Access Time / Slots Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>زمان تقریبی حضور و دسترسی شما برای اتصال</span>
                    </label>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {AVAILABILITY_SLOTS.map((slot) => (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => setAvailabilityTime(slot.key)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-[56px] cursor-pointer ${
                            availabilityTime === slot.key
                              ? 'border-blue-500 bg-blue-50/35 text-blue-900 shadow-sm ring-1 ring-blue-500/15'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-bold">{slot.label}</span>
                          <span className="text-[8px] opacity-75 font-semibold text-slate-450">{slot.sub}</span>
                        </button>
                      ))}
                    </div>
                    
                    <p className="text-[9px] text-slate-400 leading-normal pt-1.5">
                      تکنسین تلاش خواهد کرد دقیقاً در بازه انتخابی شما تماس و اتصال AnyDesk را هماهنگ کند.
                    </p>
                  </div>

                </div>

                {/* Submits row */}
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-4 w-4 rotate-180" />
                    <span>ثبت تیکت فنی</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        ) : (
          <div className="space-y-4 text-right">

            {/* Empty list representation */}
            {myTickets.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Inbox className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">پیام و تیکت فعالی ثبت نشده است</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    در صورت بروز خطای لایسنس یا عدم نصب پورت‌ها، همین امروز اولین تیکت پشتیبانی خود را ثبت کنید تا در سریع‌ترین زمان متصل شویم.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((tick) => {
                  const isExpanded = expandedTicketId === tick.id;
                  const repliesCount = tick.messages ? tick.messages.length - 1 : 0;
                  return (
                    <div key={tick.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      
                      {/* Interactive Header toggle click block */}
                      <div
                        onClick={() => setExpandedTicketId(isExpanded ? null : tick.id)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="space-y-1 grow">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 rounded font-mono font-bold">#{tick.id}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${TICKET_STATUS_COLORS[tick.status]}`}>
                              {TICKET_STATUS_LABELS[tick.status]}
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                              {TICKET_CATEGORY_LABELS[tick.category]}
                            </span>
                            {tick.availabilityTime && (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 rounded flex items-center gap-1 font-semibold">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>حضور: {tick.availabilityTime.replace(' (ساعت ', ' ').replace(')', '')}</span>
                              </span>
                            )}
                          </div>
                          <span className="block font-extrabold text-xs sm:text-sm text-slate-850 pt-1">
                            {tick.subject}
                          </span>
                        </div>

                        {/* Right stats and collapse icon */}
                        <div className="flex items-center gap-3 shrink-0">
                          {tick.category === 'general' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChat(tick.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">اتصال به چت آنلاین</span>
                            </button>
                          )}
                          
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>

                      </div>

                      {/* Expand details info */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-150 space-y-4 text-xs font-normal">
                          
                          {/* Original User Message */}
                          <div className="space-y-1 border-r-2 border-slate-350 pr-3 mr-1">
                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span>ثبت شده توسط شما در زمان {new Date(tick.createdDate).toLocaleDateString('fa-IR')}</span>
                              
                              {tick.availabilityTime && (
                                <span className="font-bold text-amber-700">بازه درخواستی حضور شما: {tick.availabilityTime}</span>
                              )}
                            </div>
                            <p className="text-slate-650 leading-relaxed font-normal bg-white p-3.5 border border-slate-100/50 rounded-xl">
                              {tick.message}
                            </p>

                            {/* Show uploaded screenshots inside the expanded ticket details */}
                            {tick.attachedFileName && (
                              <div className="mt-2.5 p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {tick.attachedFile ? (
                                    <img src={getFullFileUrl(tick.attachedFile)} className="h-10 w-10 object-cover rounded border border-slate-200" alt="attachment" />
                                  ) : (
                                    <File className="h-5 w-5 text-indigo-500" />
                                  )}
                                  <div>
                                    <span className="block font-bold text-slate-700 text-[11px] truncate max-w-[200px]">{tick.attachedFileName}</span>
                                    <span className="text-[9px] text-slate-400 block mt-0.5">تصویر خطا ضمیمه شده</span>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-indigo-50 text-indigo-650 font-bold px-2 py-0.5 rounded cursor-not-allowed">
                                  تایید شده سیستم
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Dynamic replies listing or admin reply */}
                          {tick.adminReply && (
                            <div className="space-y-1.5 border-r-2 border-blue-500 pr-3 mr-1">
                              <span className="font-bold text-blue-700 block">پاسخ مدیریت پشتیبانی:</span>
                              <p className="text-slate-650 leading-relaxed font-normal bg-blue-50/30 p-3.5 border border-blue-100/50 rounded-xl">
                                {tick.adminReply}
                              </p>
                            </div>
                          )}

                          {/* Message count bubble information for General Categories */}
                          {tick.category === 'general' && (
                            <div className="p-3 bg-emerald-50 text-emerald-800 border-emerald-100 rounded-xl flex items-center justify-between text-[11px] font-semibold">
                              <span>این تیکت در بستر چت آنلاین فعال است. گفتگوها در چت روم پیگیری می‌شود.</span>
                              <button
                                onClick={() => handleOpenChat(tick.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xxs font-bold transition-all cursor-pointer"
                              >
                                باز کردن چت روم
                              </button>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
