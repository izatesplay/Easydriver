import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Request, RequestStatus, STATUS_LABELS, SERVICE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, Ticket, User, getFullFileUrl } from '../types';
import { 
  User as UserIcon, Phone, Clipboard, Laptop, Star, Clock, Play, CheckCircle2, XCircle, 
  AlertTriangle, Terminal, Save, HelpCircle, ChevronRight, MessageSquare, Reply, 
  Trophy, Medal, Award, Zap, Heart, ShieldCheck, Crown, Rocket, TrendingUp, Sparkles, 
  RotateCw, Camera, Monitor, Timer, Upload, ArrowLeft, Check, Loader2, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateTechnicianStats, getLevelInfo } from '../utils/pointsCalculator';
import { Profile } from './Profile';
import { StatusBadge } from './StatusBadge';

export const TechnicianDashboard: React.FC = () => {
  const {
    currentUser,
    requests,
    updateRequest,
    tickets,
    addTicketMessage,
    updateTicket,
    reviews,
    technicians,
    loadFreshData
  } = useApp();

  // Basic layout state
  const [activeTab, setActiveTab] = useState<'tasks' | 'tickets' | 'achievements' | 'profile'>('tasks');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'active' | 'completed' | 'all'>('active');

  // Interactive Task Modifiers
  const [techNotes, setTechNotes] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  // Ticket Replying Interactive states
  const [ticketReplyText, setTicketReplyText] = useState<string>('');
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);

  // Connection check steps checklist by task ID (local UI helper)
  const [checklist, setChecklist] = useState<Record<string, Record<number, boolean>>>({});

  // 5 technical standard stages for technician checklist
  const technicalStandardSteps = [
    'بررسی اتصال پایدار و استخراج AnyDesk ID مشتری',
    'ارزیابی و بررسی نسخه معماری سیستم عامل (Windows 10/11)',
    'یافتن مدل سخت‌افزار هدف و کد اختصاصی PCI/VEN در دیتابیس',
    'نصب درایور بدون افزونه‌های مخرب مانیتور شده',
    'اعمال تغییرات، ریستارت و اخذ تاییدیه از صحت عیب‌یابی'
  ];

  // Manual update triggers
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadFreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 850);
  };

  // Find technician object representing current user
  const currentTech = useMemo(() => {
    return (technicians || []).find((t) => t.id === currentUser?.id) || {
      id: currentUser?.id || 'tech-1',
      fullName: currentUser?.fullName || 'مهندس نوید مرادی',
      phone: currentUser?.phone || '09123456789',
      specialty: 'all' as any,
      isActive: true,
      completedTasks: 34,
      createdDate: '2026-01-10T08:30:00Z',
      updatedDate: '2026-05-18T10:20:00Z',
      createdBy: 'admin-1',
    };
  }, [technicians, currentUser]);

  // Compute live statistics and gamified points
  const techStats = useMemo(() => {
    return calculateTechnicianStats(currentTech, requests, reviews || []);
  }, [currentTech, requests, reviews]);

  // Filter tasks belonging exactly to this technician
  const myTasks = useMemo(() => {
    if (!currentUser?.id) return [];
    const currentId = String(currentUser.id).trim().toLowerCase();

    return requests.filter(r => {
      const assignedId = r.assignedToId ? String(r.assignedToId).trim().toLowerCase() : '';
      const techId = r.technicianId ? String(r.technicianId).trim().toLowerCase() : '';
      
      // Look at BOTH assignedToId and technicianId for matching
      const belongsToMe = assignedId === currentId || techId === currentId || 
        ((assignedId === '' || assignedId === 'null') && (techId === '' || techId === 'null') && currentId === 'tech-1');
      if (!belongsToMe) return false;

      const statusStr = r.status ? String(r.status).trim() : '';
      if (taskStatusFilter === 'active') {
        return statusStr === 'assigned' || statusStr === 'approved' || statusStr === 'in_progress';
      } else if (taskStatusFilter === 'completed') {
        return statusStr === 'completed';
      } else {
        return true;
      }
    });
  }, [requests, currentUser, taskStatusFilter]);

  const rawTasksCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    const currentId = String(currentUser.id).trim().toLowerCase();

    return requests.filter(r => {
      const assignedId = r.assignedToId ? String(r.assignedToId).trim().toLowerCase() : '';
      const techId = r.technicianId ? String(r.technicianId).trim().toLowerCase() : '';
      return assignedId === currentId || techId === currentId || 
        ((assignedId === '' || assignedId === 'null') && (techId === '' || techId === 'null') && currentId === 'tech-1');
    }).length;
  }, [requests, currentUser]);

  const activeTasksCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    const currentId = String(currentUser.id).trim().toLowerCase();

    return requests.filter(r => {
      const assignedId = r.assignedToId ? String(r.assignedToId).trim().toLowerCase() : '';
      const techId = r.technicianId ? String(r.technicianId).trim().toLowerCase() : '';
      const belongsToMe = assignedId === currentId || techId === currentId || 
        ((assignedId === '' || assignedId === 'null') && (techId === '' || techId === 'null') && currentId === 'tech-1');
      if (!belongsToMe) return false;
      const statusStr = r.status ? String(r.status).trim() : '';
      return statusStr === 'assigned' || statusStr === 'approved' || statusStr === 'in_progress';
    }).length;
  }, [requests, currentUser]);

  const completedTasksCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    const currentId = String(currentUser.id).trim().toLowerCase();

    return requests.filter(r => {
      const assignedId = r.assignedToId ? String(r.assignedToId).trim().toLowerCase() : '';
      const techId = r.technicianId ? String(r.technicianId).trim().toLowerCase() : '';
      const belongsToMe = assignedId === currentId || techId === currentId || 
        ((assignedId === '' || assignedId === 'null') && (techId === '' || techId === 'null') && currentId === 'tech-1');
      if (!belongsToMe) return false;
      return r.status === 'completed';
    }).length;
  }, [requests, currentUser]);

  // Status transitions
  const handleUpdateStatus = (task: Request, newStatus: RequestStatus) => {
    const updatedTask: Request = {
      ...task,
      status: newStatus,
      updatedDate: new Date().toISOString()
    };
    updateRequest(updatedTask);
  };

  // Checklist updates
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

  // Technician technical notes editor save
  const handleSaveNotes = (task: Request, notes: string) => {
    const updatedTask: Request = {
      ...task,
      adminNotes: notes.trim(),
      updatedDate: new Date().toISOString()
    };
    updateRequest(updatedTask);
    setEditingNotesId(null);
  };

  // Real upload function: Base64 converter -> Post to /api/upload -> append to screenshots
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, task: Request) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('سایز تصویر مستندات ارسالی نباید بیش از ۲ مگابایت باشد.');
      return;
    }

    try {
      setIsUploading(prev => ({ ...prev, [task.id]: true }));
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `screenshot_task_${task.id}_${Date.now()}.png`,
              base64Data: base64String
            })
          });

          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.success) {
            // Append static uploaded file URL to dataset
            const currentScr = task.desktopScreenshots || [];
            const nextScr = [...currentScr, uploadData.url];
            
            updateRequest({
              ...task,
              desktopScreenshots: nextScr,
              updatedDate: new Date().toISOString()
            });
          } else {
            alert(uploadData.error || 'خطا در بارگذاری تصویر روی سرور');
          }
        } catch (uploadErr) {
          console.error('File storage failed:', uploadErr);
          alert('خطایی در حین ارتباط با سرور آپلود رخ داد.');
        } finally {
          setIsUploading(prev => ({ ...prev, [task.id]: false }));
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Reader error:', err);
      setIsUploading(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // Save support ticket message of technician
  const handleSendTicketReply = (ticket: Ticket) => {
    if (!ticketReplyText.trim()) return;
    
    // Send ticket communication log
    addTicketMessage(ticket.id, ticketReplyText.trim(), 'technician');

    // Update status to in progress
    updateTicket({
      ...ticket,
      adminReply: ticketReplyText.trim(),
      status: 'in_progress',
      updatedDate: new Date().toISOString()
    });

    setTicketReplyText('');
    setReplyTicketId(null);
  };

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-8" dir="rtl">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Core Technician dashboard banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-transparent to-slate-950/20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-right">
            <div className="flex items-center gap-4.5">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {currentUser?.avatarUrl ? (
                  <img src={getFullFileUrl(currentUser.avatarUrl)} alt={currentTech.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-8 w-8 text-indigo-400" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded-full">تکنسین فعال سامانه</span>
                <h1 className="text-xl font-extrabold text-white">{currentTech.fullName}</h1>
                <p className="text-[11px] text-slate-450 font-mono">تخصص: {currentTech.specialty === 'all' ? 'عمومی و سخت‌افزار جامع' : currentTech.specialty}</p>
              </div>
            </div>

            {/* Live Statistics highlights cards */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-right shrink-0 min-w-[90px]">
                <span className="text-slate-400 text-[10px] block font-bold leading-none mb-1">کارهای تحویلی</span>
                <span className="text-xl font-black text-white font-mono">{currentTech.completedTasks || completedTasksCount}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-right shrink-0 min-w-[95px]">
                <span className="text-slate-400 text-[10px] block font-bold leading-none mb-1">شاخص رضایت</span>
                <span className="text-xl font-black text-amber-400 flex items-center gap-1 font-mono leading-none">
                  ★ {techStats?.averageRating || '5.0'}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-right shrink-0 min-w-[100px]">
                <span className="text-slate-400 text-[10px] block font-bold leading-none mb-1">امتیاز کل فنی</span>
                <span className="text-xl font-black text-indigo-300 font-mono">{techStats?.totalPoints || 0}</span>
              </div>
              
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-3 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-xl transition-all cursor-pointer border border-white/5 shadow-sm shrink-0"
                title="بروزرسانی زنده"
              >
                <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab switch Navigation board */}
        <div className="flex items-center justify-start gap-1 p-1 bg-slate-200/60 rounded-2xl max-w-md mb-8">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              activeTab === 'tasks' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/10' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            کارهای ارجاع‌شده ({rawTasksCount})
          </button>
          
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              activeTab === 'tickets' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/10' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            تیکت‌ها ({tickets.filter(t => t.status !== 'closed').length})
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              activeTab === 'achievements' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/10' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            افتخار و مدال‌ها
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              activeTab === 'profile' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/10' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            تنظیمات پروفایل
          </button>
        </div>

        {/* Dynamic tabs render content center */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Assigned Workloads */}
          {activeTab === 'tasks' && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              
              {/* Filter controls subbar */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">بررسی و گزارش کارهای محوله</h3>
                
                {/* Embedded segmented filter tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-xl text-right">
                  <button
                    onClick={() => setTaskStatusFilter('active')}
                    className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                      taskStatusFilter === 'active' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-white/30'
                    }`}
                  >
                    فعال ({activeTasksCount})
                  </button>
                  <button
                    onClick={() => setTaskStatusFilter('completed')}
                    className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                      taskStatusFilter === 'completed' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-white/30'
                    }`}
                  >
                    انجام شده ({completedTasksCount})
                  </button>
                  <button
                    onClick={() => setTaskStatusFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                      taskStatusFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-white/30'
                    }`}
                  >
                    کل کارنامه ({rawTasksCount})
                  </button>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <Clipboard className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">هیچ درخواستی در وضعیت فیلتر معین شده برای شما ارجاع نشده است.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    const taskSteps = checklist[task.id] || {};
                    const completedStepsCount = Object.values(taskSteps).filter(Boolean).length;

                    return (
                      <div key={task.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs text-right">
                        
                        {/* Summary line drawer header */}
                        <div
                          onClick={() => {
                            setExpandedTaskId(isExpanded ? null : task.id);
                            setTechNotes(task.adminNotes || '');
                          }}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-all"
                        >
                          <div className="space-y-1.5 grow font-normal">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono font-bold">#{task.id}</span>
                              <StatusBadge status={task.status} id={`status-badge-tech-${task.id}`} />
                              <strong className="text-xs text-slate-900 font-black">{SERVICE_LABELS[task.serviceType]}</strong>
                            </div>
                            <div className="text-[10px] text-slate-550 font-bold flex items-center gap-2 flex-wrap">
                              <span>مشتری: {task.fullName}</span>
                              <span className="text-[7.5px] text-slate-300">•</span>
                              <span>موبایل: <span className="font-mono">{task.phone}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold">
                              مراحل استاندارد: {completedStepsCount} از ۵
                            </span>
                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Expansive interactive control sheets */}
                        {isExpanded && (
                          <div className="p-5 bg-slate-50 border-t border-slate-200/60 space-y-6 text-xs">
                            
                            {/* Two-columns metadata overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              
                              {/* Left detail card: customer overview */}
                              <div className="space-y-3">
                                <h4 className="font-extrabold text-slate-800 border-b border-slate-150 pb-1.5 flex items-center gap-1.5">
                                  <UserIcon className="h-4 w-4 text-indigo-600" />
                                  <span>اطلاعات تماس و تذکر نهایی کاربر</span>
                                </h4>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 font-normal leading-relaxed text-slate-700">
                                  <p><strong className="font-bold">شناسه متقاضی:</strong> {task.fullName}</p>
                                  <p><strong className="font-bold">شماره ارتباطی:</strong> <span className="font-mono text-xs">{task.phone}</span></p>
                                  <p>
                                    <strong className="font-bold">اولویت درخواست:</strong> 
                                    <span className={`mr-2 px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                                  </p>
                                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                                    {task.description}
                                  </div>
                                </div>
                              </div>

                              {/* Right detail card: state transition modifiers */}
                              <div className="space-y-3">
                                <h4 className="font-extrabold text-slate-800 border-b border-slate-150 pb-1.5 flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-indigo-600" />
                                  <span>کنترولر وضعیت اجرایی نصب ریموت</span>
                                </h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Accept/In Progress button */}
                                  <button
                                    onClick={() => handleUpdateStatus(task, 'in_progress')}
                                    className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                    <span>شروع عملیات ریموت</span>
                                  </button>

                                  {/* Complete button */}
                                  <button
                                    onClick={() => handleUpdateStatus(task, 'completed')}
                                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>اتمام عیب‌یابی موفق</span>
                                  </button>

                                  {/* Revert back to assigned queue */}
                                  <button
                                    onClick={() => handleUpdateStatus(task, 'assigned')}
                                    className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <span>رهاسازی کار به صف انتظار ادمین</span>
                                  </button>

                                  {/* Cancel button */}
                                  <button
                                    onClick={() => handleUpdateStatus(task, 'cancelled')}
                                    className="py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>اعلام لغو (تداخل سخت‌افزار)</span>
                                  </button>
                                </div>
                              </div>

                            </div>

                            {/* Technical Checklists section */}
                            <div className="space-y-3">
                              <h4 className="font-extrabold text-slate-800 border-b border-slate-150 pb-1.5">پروتکل کاربری مراحل عیب‌یابی</h4>
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                                {technicalStandardSteps.map((stepStr, sIdx) => {
                                  const isChecked = !!taskSteps[sIdx];
                                  return (
                                    <label
                                      key={sIdx}
                                      className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleCheckstep(task.id, sIdx)}
                                        className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer mt-0.5"
                                      />
                                      <span className={`text-[11px] font-bold ${isChecked ? 'line-through text-slate-400' : 'text-slate-650'}`}>
                                        {stepStr}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* AnyDesk Connection ID & private Technical notes */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-extrabold text-slate-600 block">یادداشت‌های فنی و تبادل کد اتصال (AnyDesk Id):</label>
                                {editingNotesId !== task.id ? (
                                  <button
                                    onClick={() => setEditingNotesId(task.id)}
                                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                                  >
                                    ویرایش متون یادداشت
                                  </button>
                                ) : null}
                              </div>

                              {editingNotesId === task.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={techNotes}
                                    onChange={(e) => setTechNotes(e.target.value)}
                                    placeholder="شماره پورت، کدهای انی‌دسک، کدهای ریجستری جدید و لایسنس‌های تخصیصی را اینجا وارد نمایید."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border border-slate-250 rounded-2xl outline-none"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingNotesId(null)}
                                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-600 font-bold rounded-lg cursor-pointer"
                                    >
                                      انصراف
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveNotes(task, techNotes)}
                                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      <span>ثبت یادداشت فنی</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">
                                  {task.adminNotes || 'هیچ یادداشتی وجود ندارد. کدهایی تفصیلی برای AnyDesk یا سایر موارد را ثبت فرمایید.'}
                                </div>
                              )}
                            </div>

                            {/* Dual panel section: screenshots and time logger */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
                              
                              {/* 1. Multiple Custom Screenshot Attachments */}
                              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 text-right">
                                <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-indigo-600 animate-pulse" />
                                    <strong className="text-xs text-slate-800">بارگذاری مستندات تصویر مانیتور مشتری</strong>
                                  </div>
                                  <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                                    {task.desktopScreenshots?.length || 0} فایل پیوستی
                                  </span>
                                </div>

                                {/* Pre-made simulated AnyDesk screenshots quick list */}
                                <div className="space-y-2">
                                  <span className="text-[10px] text-slate-400 font-bold block">سند فوری سریع (فرضی):</span>
                                  <div className="grid grid-cols-2 gap-1.5 text-center">
                                    {[
                                      { label: '🖥️ صفحه مانیتور ریموت', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80' },
                                      { label: '⚙️ پیکربندی موفقیت آمیز', url: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=400&q=80' }
                                    ].map((scObj) => (
                                      <button
                                        key={scObj.label}
                                        type="button"
                                        onClick={() => {
                                          const currentScr = task.desktopScreenshots || [];
                                          if (currentScr.includes(scObj.url)) return;
                                          updateRequest({
                                            ...task,
                                            desktopScreenshots: [...currentScr, scObj.url],
                                            updatedDate: new Date().toISOString()
                                          });
                                        }}
                                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-805 border border-slate-200 rounded-lg text-[9px] font-bold truncate transition-all cursor-pointer"
                                      >
                                        {scObj.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* REAL FILE SELECTION BUTTONS */}
                                <div className="space-y-2">
                                  <span className="text-[10px] text-slate-400 font-bold block">انتخاب عکس و فایل واقعی دسکتاپ:</span>
                                  <label className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50 border border-dashed border-indigo-200 hover:bg-indigo-10/50 rounded-xl cursor-pointer transition-colors text-indigo-700 font-bold w-full">
                                    {isUploading[task.id] ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>در حال بارگذاری فایل...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4" />
                                        <span>ارسال تصویر پیوستی (.PNG, .JPG)</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={isUploading[task.id]}
                                      onChange={(e) => handleFileUpload(e, task)}
                                    />
                                  </label>
                                </div>

                                {/* Previews list representation with single deletion buttons */}
                                {task.desktopScreenshots && task.desktopScreenshots.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto py-1 border-t border-slate-100 pt-2 shrink-0">
                                    {task.desktopScreenshots.map((scrUrl, preIdx) => (
                                      <div key={preIdx} className="relative w-12 h-12 border border-slate-200 rounded-xl overflow-hidden shadow-xxs shrink-0 group">
                                        <img src={getFullFileUrl(scrUrl)} alt="Screenshot preview" className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentScr = task.desktopScreenshots || [];
                                            const nextScr = currentScr.filter((_, i) => i !== preIdx);
                                            updateRequest({
                                              ...task,
                                              desktopScreenshots: nextScr,
                                              updatedDate: new Date().toISOString()
                                            });
                                          }}
                                          className="absolute top-0 right-0 h-3.5 w-3.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center rounded-full text-[8.5px] leading-none cursor-pointer"
                                          title="حذف مستند"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. Technical Workload Time Spent Logger */}
                              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 text-right">
                                <div className="flex items-center justify-between border-b border-slate-105 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Timer className="h-4 w-4 text-emerald-600 animate-pulse" />
                                    <strong className="text-xs text-slate-800">کارت ثبت زمان کار عیب‌یابی (دقیقه)</strong>
                                  </div>
                                  <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                    {task.loggedDurationMinutes || 0} دقیقه ثبت شده
                                  </span>
                                </div>

                                <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                                  برای تایید ادمین و تصفیه حساب، لطفاً ساعت و زمان دقیقی که برای مانیتور اتصالات AnyDesk صرف کرده‌اید را ویرایش و ثبت کنید:
                                </p>

                                {/* Increments toggles */}
                                <div className="flex flex-wrap gap-1.5">
                                  {[15, 30, 45, 60, 90].map((stepMins) => (
                                    <button
                                      key={stepMins}
                                      type="button"
                                      onClick={() => {
                                        const currentVal = task.loggedDurationMinutes || 0;
                                        const nextVal = currentVal + stepMins;
                                        updateRequest({
                                          ...task,
                                          loggedDurationMinutes: nextVal,
                                          updatedDate: new Date().toISOString()
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-150 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer"
                                    >
                                      +{stepMins} دقیقه
                                    </button>
                                  ))}
                                </div>

                                {/* Custom input field log */}
                                <div className="flex items-center gap-2 pt-2 border-t border-dashed border-slate-100">
                                  <span className="text-[10px] text-slate-500 font-bold shrink-0">ورود دستی کل کار:</span>
                                  <input
                                    type="number"
                                    placeholder="مثال: ۴۰"
                                    value={task.loggedDurationMinutes || ''}
                                    onChange={(e) => {
                                      const inputMins = parseInt(e.target.value) || 0;
                                      updateRequest({
                                        ...task,
                                        loggedDurationMinutes: inputMins,
                                        updatedDate: new Date().toISOString()
                                      });
                                    }}
                                    className="w-16 px-2 py-1 border border-slate-205 bg-slate-50 rounded text-center text-xs font-mono outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">دقیقه کارهای انجام شده</span>
                                </div>
                              </div>

                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Support tickets */}
          {activeTab === 'tickets' && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-805">پیام‌ها و تیکت‌های پشتیبانی کاربران</h3>
              </div>

              {tickets.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">هیچ تیکت فعالی در سیستم پاسخگویی شما یافت نشد.</p>
                </div>
              ) : (
                <div className="space-y-3 text-right">
                  {tickets.map((t) => {
                    const isReplying = replyTicketId === t.id;
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] bg-slate-100 font-mono text-slate-600 px-1 py-0.5 rounded leading-none">#{t.id}</span>
                            <h4 className="text-xs font-black text-slate-850 mt-1">{t.subject}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded-[6px] text-[9.5px] font-bold ${
                            t.status === 'closed' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : t.status === 'in_progress' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-cyan-100 text-cyan-850'
                          }`}>
                            {t.status === 'closed' ? 'بسته شده' : t.status === 'in_progress' ? 'درحال پاسخگو' : 'جدید'}
                          </span>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-xl text-slate-650 leading-relaxed text-xs">
                          {t.message}
                        </div>

                        {/* Messages logs */}
                        {t.messages && t.messages.length > 0 && (
                          <div className="space-y-2 border-t border-slate-100 pt-3 text-[11px]">
                            <span className="text-[10px] text-slate-400 font-semibold block">سیاهه مکالمات پشتیبانی:</span>
                            {t.messages.map((m, mIdx) => (
                              <div key={mIdx} className={`p-2.5 rounded-xl max-w-[85%] ${
                                m.senderRole === 'customer' 
                                  ? 'bg-slate-100 mr-0 ml-auto' 
                                  : 'bg-indigo-50 border border-indigo-100 ml-0 mr-auto'
                              }`}>
                                <span className="font-extrabold block text-[9.5px] text-slate-500 mb-1">{m.senderRole === 'customer' ? 'کاربر متقاضی' : 'پاسخ شما'}</span>
                                <p className="text-slate-700 leading-relaxed font-normal">{m.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Respond area */}
                        <div className="flex justify-end pt-2">
                          {isReplying ? (
                            <div className="w-full space-y-3">
                              <textarea
                                value={ticketReplyText}
                                onChange={(e) => setTicketReplyText(e.target.value)}
                                placeholder="پاسخ راه‌اندازی و مراحل رفع تداخل درایور و انی‌دسک را یادداشت کنید..."
                                rows={3}
                                className="w-full text-xs p-3 bg-slate-50 border border-slate-205 rounded-xl outline-none"
                              />
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setReplyTicketId(null)}
                                  className="px-3 bg-slate-200 hover:bg-slate-250 text-slate-600 font-bold rounded-lg cursor-pointer py-2"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendTicketReply(t)}
                                  className="px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer py-2"
                                >
                                  <Reply className="h-4 w-4" />
                                  <span>ارسال پاسخ من</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTicketId(t.id);
                                setTicketReplyText('');
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-500/10"
                            >
                              <Reply className="h-4 w-4" />
                              <span>ثبت پاسخ برای کاربر</span>
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Gamified Achievements */}
          {activeTab === 'achievements' && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              
              {/* Scorecard visual and points tracker explanation banner */}
              <div className="bg-gradient-to-r from-teal-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl text-right flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
                    <h3 className="text-lg font-black">سطح تخصص و تالار افتخارات فنی</h3>
                  </div>
                  <p className="text-xs text-indigo-200 max-w-md font-medium">
                    امتیازات شما بر اساس سرعت تحویل کارهای ریموت AnyDesk (زیر ۶ ساعت)، اخذ امتیاز ۵ ستاره از مشتریان و تکمیل گام‌های عیب‌یابی محاسبه می‌شود.
                  </p>
                </div>

                <div className="space-y-1 self-stretch md:self-auto min-w-[200px] bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold mb-1.5">
                    <span>{techStats?.levelName || 'سطح عمومی'}</span>
                    <span>{techStats?.totalPoints || 0} / {techStats?.nextLevelPoints || 500} امتیاز</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${techStats?.progressPercent || 20}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block text-left pt-1 font-semibold">{100 - (techStats?.progressPercent || 20)}٪ تا ارتقا به رتبه بعدی</span>
                </div>
              </div>

              {/* Achievements Grid blocks */}
              <div className="space-y-3.5 text-right">
                <h4 className="font-extrabold text-sm text-slate-800">نشان‌ها و مدال‌های به دست آمده</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {techStats?.achievements && techStats.achievements.map((ach) => (
                    <div 
                      key={ach.id} 
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-44 text-right ${
                        ach.unlocked 
                          ? 'bg-white border-indigo-200 shadow-sm' 
                          : 'bg-slate-50 border-slate-200/60 opacity-65'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className={`p-2 rounded-xl w-fit ${ach.unlocked ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-205 text-slate-400'}`}>
                          <Award className="h-6 w-6" />
                        </div>
                        <h5 className="font-black text-xs text-slate-850 truncate">{ach.title}</h5>
                        <p className="text-[10px] text-slate-455 font-medium leading-normal">{ach.description}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                        <span className="text-[8px] text-slate-400 font-extrabold">پاداش: {ach.pointsReward} امتیاز</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          ach.unlocked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-450'
                        }`}>
                          {ach.unlocked ? '🟢 باز شده' : '🔒 قفل دول'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: Core User Settings profile */}
          {activeTab === 'profile' && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Embed Profile editor directly to resolve avatar updates smoothly */}
              <Profile />
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
};
