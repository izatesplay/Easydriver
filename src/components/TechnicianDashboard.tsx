import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Request, RequestStatus, STATUS_LABELS, STATUS_COLORS, SERVICE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, Ticket } from '../types';
import { ShieldAlert, Key, Clipboard, Laptop, Star, User, Phone, CheckCircle, Clock, Play, CheckCircle2, XCircle, AlertTriangle, Terminal, Save, HelpCircle, ChevronRight, MessageSquare, Reply } from 'lucide-react';
import { motion } from 'motion/react';

export const TechnicianDashboard: React.FC = () => {
  const {
    currentUser,
    switchRole,
    requests,
    updateRequest,
    tickets,
    addTicketMessage,
    updateTicket,
    reviews,
    technicians
  } = useApp();

  const techReviews = (reviews || []).filter(
    (r) => r.technicianId === currentUser?.id || (!r.technicianId && currentUser?.id === 'tech-1')
  );

  const avgTechRating = techReviews.length > 0
    ? (techReviews.reduce((sum, r) => sum + r.rating, 0) / techReviews.length).toFixed(1)
    : '5.0';

  const [activeTab, setActiveTab] = useState<'tasks' | 'tickets'>('tasks');

  // Notes state
  const [techNotes, setTechNotes] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  // Expanded details state
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Ticket reply interactive state
  const [replyText, setReplyText] = useState<string>('');
  const [activeSupportTicketId, setActiveSupportTicketId] = useState<string | null>(null);

  // Interactive connection installer steps checklist by taskId
  const [checklist, setChecklist] = useState<Record<string, Record<number, boolean>>>({});

  // Guard: If role is not technician, prompt them to upgrade role
  if (!currentUser || currentUser.role !== 'technician') {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mx-auto">
            <Laptop className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">عدم دسترسی به پنل تکنسین</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              شما هم‌اکنون در قالب نقش کاربری «مشتری» به عنوان متقاضی آنلاین هستید. دسترسی به این پنل فنی صرفاً برای تکنسین‌های ارشد تیم مجاز می‌باشد.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => switchRole('technician')}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>شبیه‌سازی و ورود پرسنلی (تکنسین فنی)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter tasks assigned to this technician
  // Both: check if assignedToId matches currentUser.id
  // To keep it comprehensive for the demo, if no task is specifically assigned, let also show tasks that are assigned to 'tech-1' (as that's our default mock technician Novid)
  const myTasks = requests.filter(r => r.assignedToId === currentUser.id || (!r.assignedToId && currentUser.id === 'tech-1'));

  const pendingTasks = myTasks.filter(t => t.status === 'assigned' || t.status === 'approved').length;
  const activeTasks = myTasks.filter(t => t.status === 'in_progress').length;
  const completedTasksCount = myTasks.filter(t => t.status === 'completed').length;

  // Toggle checklist step
  const handleToggleCheckstep = (taskId: string, index: number) => {
    const taskSteps = checklist[taskId] || {};
    const updated = {
      ...taskSteps,
      [index]: !taskSteps[index]
    };
    setChecklist({
      ...checklist,
      [taskId]: updated
    });
  };

  // Status Change trigger
  const handleUpdateStatus = (task: Request, newStatus: RequestStatus) => {
    updateRequest({
      ...task,
      status: newStatus,
      updatedDate: new Date().toISOString()
    });
  };

  // Save admin notes by technician
  const handleSaveNotes = (task: Request, notes: string) => {
    updateRequest({
      ...task,
      adminNotes: notes,
      updatedDate: new Date().toISOString()
    });
    setEditingNotesId(null);
  };

  // Reply to ticket
  const handleSendReply = (ticket: Ticket) => {
    if (!replyText.trim()) return;
    addTicketMessage(ticket.id, replyText.trim(), 'technician');
    
    // update status to in_progress
    updateTicket({
      ...ticket,
      adminReply: replyText.trim(),
      status: 'in_progress'
    });
    
    setReplyText('');
    setActiveSupportTicketId(null);
  };

  const stepsList = [
    'تایید اتصال آنلاین و دریافت آی‌دی AnyDesk مشتری در کادر یادداشت‌ها',
    'بررسی معماری سیستم‌عامل (ویندوز ۷، ۱۰ یا ۱۱ نسخه ۶۴ بیتی)',
    'شناسایی و جستجوی شماره سخت‌افزاری PCI Hardware ID در سرورها',
    'نصب ایمن درایور بدون فایل‌های مخرب و ریستارت رایانه مشتری',
    'تایید نهایی و اخذ رضایت مشتری جهت تحویل فاکتور دیجیتال',
  ];

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-6 mb-8">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-purple-700 font-black tracking-widest uppercase block">پیشخوان متخصصین ایزی‌درایور (Expert Center)</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">پرتال مدیریت و اجرای ریموت خدمات نصب</h1>
          </div>
        </div>

        {/* Dynamic switcher tabs */}
        <div className="flex gap-2.5 mb-8">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 px-5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/15'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clipboard className="h-4 w-4 shrink-0" />
            <span>پرونده‌های فعال من</span>
            {pendingTasks > 0 && (
              <span className="h-5 min-w-5 px-1 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                {pendingTasks}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-3 px-5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/15'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span>تیکت‌های چت و پشتیبانی فنی</span>
          </button>
        </div>

        {/* Content switch */}
        <div className="min-h-[50vh]">
          {activeTab === 'tasks' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
              
              {/* Left Column: List of assigned tasks */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-4 bg-white border border-indigo-100 rounded-2xl text-xs space-y-1.5 font-normal">
                  <h3 className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Star className="h-4.5 w-4.5 text-indigo-500" />
                    <span>خلاصه کارنامه تکنسین ({currentUser.fullName})</span>
                  </h3>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    شما مجموعاً هم‌اکنون به عنوان پرسنل فعال سیستم حضور دارید. در بخش پایین لیست خدمات فنی ارجاع شده به نام شما را مشاهده می‌فرمایید. وضعیت خدمات را تغییر دهید تا مشتری فوراً در صفحه پیگیری شخصی خود، روند لحظه‌ای کار را ببیند.
                  </p>
                </div>

                {myTasks.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border text-center text-xs text-slate-400">
                    تاکنون هیچ درخواست خدمتی به شناسه شما ارجاع نشده‌است. با پنل مدیریت (Admin) یک مورد به مهندس مرادی واگذار نمایید.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTasks.map((task) => {
                      const isExpanded = expandedTaskId === task.id;
                      const taskSteps = checklist[task.id] || {};
                      const completedStepsCount = Object.values(taskSteps).filter(Boolean).length;
                      
                      return (
                        <div key={task.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xxs">
                          
                          {/* Brief header trigger */}
                          <div
                            onClick={() => {
                              setExpandedTaskId(isExpanded ? null : task.id);
                              setTechNotes(task.adminNotes || '');
                            }}
                            className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                          >
                            <div className="space-y-1 grow">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-mono font-bold">#{task.id}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[task.status]}`}>
                                  {STATUS_LABELS[task.status]}
                                </span>
                                <span className="text-xs font-black text-slate-800 mr-1">{SERVICE_LABELS[task.serviceType]}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                                <span>کاربر: {task.fullName}</span>
                                <span>•</span>
                                <span className="font-mono">{task.phone}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-bold">
                                مرحله عملگر: {completedStepsCount} از ۵
                              </span>
                              <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {/* Detail expansion details sheets */}
                          {isExpanded && (
                            <div className="p-5 bg-slate-50/50 border-t border-slate-150 space-y-6 text-xs">
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* A: Customer details */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1">
                                    <User className="h-4 w-4 text-slate-500" />
                                    <span>مشخصات تماس مشتری متقاضی</span>
                                  </h4>
                                  
                                  <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2 leading-relaxed font-normal">
                                    <p><strong className="font-bold">نام تفصیلی:</strong> {task.fullName}</p>
                                    <p><strong className="font-bold">شماره موبایل:</strong> {task.phone}</p>
                                    <p><strong className="font-bold">اولویت پرونده:</strong> <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span></p>
                                    <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                      {task.description}
                                    </p>
                                  </div>
                                </div>

                                {/* B: Status operations controller */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-slate-500" />
                                    <span>تغییر وضعیت اجرایی نصب ریموت</span>
                                  </h4>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                      onClick={() => handleUpdateStatus(task, 'in_progress')}
                                      className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-purple-500/10"
                                    >
                                      <Play className="h-3.5 w-3.5" />
                                      <span>شروع عملیات (انجام کار)</span>
                                    </button>

                                    <button
                                      onClick={() => handleUpdateStatus(task, 'completed')}
                                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>اتمام کار و تحویل نهایی</span>
                                    </button>

                                    <button
                                      onClick={() => handleUpdateStatus(task, 'cancelled')}
                                      className="py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span>اعلام عدم امکان نصب (لغو)</span>
                                    </button>

                                    <button
                                      onClick={() => handleUpdateStatus(task, 'assigned')}
                                      className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200"
                                    >
                                      <span>بازگردانی به صف انتظار</span>
                                    </button>
                                  </div>
                                </div>

                              </div>

                              {/* Live Installation Interactive Checklist of 5 stages */}
                              <div className="space-y-3 pt-2">
                                <h4 className="font-bold text-slate-855 border-b border-slate-100 pb-1.5">مراحل و پروتکل‌های فنی شبیه‌ساز اتصال برای درایورها</h4>
                                <div className="bg-white p-4 border border-slate-150 rounded-2xl space-y-2.5">
                                  {stepsList.map((step, idx) => {
                                    const isDone = !!taskSteps[idx];
                                    return (
                                      <label
                                        key={idx}
                                        className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isDone}
                                          onChange={() => handleToggleCheckstep(task.id, idx)}
                                          className="h-4.5 w-4.5 accent-purple-600 rounded select-none mt-0.5 cursor-pointer"
                                        />
                                        <div className="grow">
                                          <span className={`text-[11px] font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                            {step}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Technician response & diagnostic notes */}
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-extrabold text-slate-500">یادداشت فنی تکنسین (ملاحظات AnyDesk و لایسنس):</label>
                                  {editingNotesId !== task.id ? (
                                    <button
                                      onClick={() => setEditingNotesId(task.id)}
                                      className="text-[10px] text-purple-600 hover:underline font-bold"
                                    >
                                      ویرایش یادداشت‌ها
                                    </button>
                                  ) : null}
                                </div>

                                {editingNotesId === task.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={techNotes}
                                      onChange={(e) => setTechNotes(e.target.value)}
                                      placeholder="مثال: لایسنس نرم‌افزار نصب شد. کد آنی دسک ۳۹۴-۳۹۲-۳۲۹ با موفقیت متصل گردید..."
                                      rows={3}
                                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs"
                                    />
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => handleSaveNotes(task, techNotes)}
                                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                      >
                                        <Save className="h-3.5 w-3.5" />
                                        <span>ذخیره نهایی یادداشت</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-mono text-[11px] leading-relaxed">
                                    {task.adminNotes || 'هیچ یادداشت فنی ثبت نشده است. برای درج آی‌دی آنی‌دسک یا تذکرات فنی روی ویرایش کلیک کنید.'}
                                  </div>
                                )}
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Right Column: Statistics */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Visual widgets count */}
                <div className="bg-white border rounded-3xl p-6 text-center space-y-5">
                  <div className="h-14 w-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mx-auto">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{currentUser.fullName}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">کد پرسنلی: {currentUser.id}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-5">
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <span className="block text-lg font-black text-slate-800">{myTasks.length}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">کل تسک‌ها</span>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-xl">
                      <span className="block text-lg font-black text-amber-700">{pendingTasks}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">معلق / جدید</span>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <span className="block text-lg font-black text-emerald-700">{completedTasksCount}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">انجام شده</span>
                    </div>
                  </div>
                </div>

                {/* Technician Ratings & Reviews Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 text-right">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
                      <span>امتیاز و بازخورد مشتریان</span>
                    </span>
                    <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-mono">
                      ★ {avgTechRating}
                    </span>
                  </div>

                  {techReviews.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4 font-normal leading-relaxed">
                      هنوز هیچ بازخورد یا امتیازی برای شما ثبت نشده است. کارهای محول شده را تکمیل کنید تا مشتریان به کار شما امتیاز دهند!
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {techReviews.map((rev) => (
                        <div key={rev.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] leading-relaxed font-normal">
                          <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                            <span>{rev.customerName}</span>
                            <div className="flex items-center gap-0.5 text-amber-500 font-mono">
                              {rev.rating} ★
                            </div>
                          </div>
                          <p className="text-slate-500">{rev.comment}</p>
                          <span className="block text-[8px] text-slate-400 mt-1" dir="ltr">
                            {new Date(rev.createdDate).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Simulated diagnostic terminal log terminal console text */}
                <div className="bg-slate-950 text-slate-200 rounded-3xl p-5 border border-slate-800 space-y-3 font-mono">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-[10px]">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-slate-400 font-bold">EasyDriver Installer Terminal Shell</span>
                  </div>

                  <div className="space-y-1.5 text-[10px] text-emerald-400 leading-relaxed font-normal text-left" dir="ltr">
                    <p className="text-slate-500">[2026-05-20] System listening...</p>
                    <p>&gt; node --version</p>
                    <p className="text-slate-300">v20.11.0 CJS Module Enabled</p>
                    <p>&gt; initialized remote PC scanner</p>
                    <p className="text-purple-400">Scanning active Ports in reverse proxy 3000</p>
                    <p>&gt; connecting user session for diagnostics</p>
                    <p className="text-amber-500">[WARN] Anti-virus bypass required for raw payload install</p>
                    <p className="text-emerald-500">[SUCCESS] Terminal Ready for expert injection</p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Tab 2: Technical tickets conversations replies */
            <div className="space-y-4 text-right">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-850 pb-2 border-b border-slate-200">صندوق ورودی تیکت‌های پشتیبانی</h3>

              {tickets.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">هیچ تیکت پشتیبانی در سیستم یافت نشد.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left sub-column: Tickets directory */}
                  <div className="lg:col-span-5 space-y-2.5">
                    {tickets.map((t) => {
                      const isActive = activeSupportTicketId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveSupportTicketId(t.id);
                            setReplyText('');
                          }}
                          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? 'border-purple-600 bg-purple-50/10 shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-slate-400 font-mono">#{t.id.substring(0, 8)}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              t.status === 'open' ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-100 text-slate-700'
                            }`}>
                              {t.status === 'open' ? 'تیکت باز' : 'در حال پاسخ یا بسته'}
                            </span>
                          </div>
                          <strong className="block text-xs font-extrabold text-slate-800">{t.subject}</strong>
                          <span className="block text-[10px] text-slate-400 mt-1">از طرف: {t.userName || 'مشتری'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right sub-column: Chats viewer & Quick writer replies */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    {activeSupportTicketId ? (
                      (() => {
                        const activeTicket = tickets.find(t => t.id === activeSupportTicketId);
                        if (!activeTicket) return null;

                        return (
                          <div className="space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{activeTicket.subject}</h4>
                              <p className="text-[10px] text-slate-400">تاریخ شروع تیکت: {new Date(activeTicket.createdDate).toLocaleDateString('fa-IR')}</p>
                            </div>

                            {/* Chat messages viewport logs */}
                            <div className="space-y-3 max-h-64 overflow-y-auto p-4 bg-slate-50 rounded-2xl font-mono">
                              {activeTicket.messages?.map((msg) => {
                                const isMe = msg.senderRole === 'technician' || msg.senderRole === 'admin';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col max-w-[85%] space-y-0.5 ${
                                      isMe ? 'mr-auto items-start text-left' : 'ml-auto items-end text-right'
                                    }`}
                                  >
                                    <span className="text-[9px] text-slate-400 font-bold">{msg.senderName} ({msg.senderRole === 'admin' ? 'مدیریت' : 'مشتری'})</span>
                                    <div className={`p-3 rounded-2xl text-[11px] font-normal leading-relaxed ${
                                      isMe ? 'bg-purple-650 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-tl-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tr-none'
                                    }`}>
                                      {msg.message}
                                    </div>
                                    <span className="text-[8px] text-slate-400 font-mono">{new Date(msg.timestamp).toLocaleTimeString('fa-IR')}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Type Response input with triggers */}
                            <div className="space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="پاسخ فنی، شماره اتصال AnyDesk یا هماهنگی لایسنس را در اینجا بنویسید..."
                                rows={3}
                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                              />

                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleSendReply(activeTicket)}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Reply className="h-4 w-4" />
                                  <span>ارسال پاسخ فنی آنلاین</span>
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                        <HelpCircle className="h-8 w-8 text-slate-300" />
                        <span>یک تیکت را از لیست سمت راست جهت مشاهده پیام‌ها و پاسخگویی انتخاب فرمایید.</span>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
