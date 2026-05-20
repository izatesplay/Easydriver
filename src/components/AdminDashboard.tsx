import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Request, Review, Ticket, Technician, SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, SPECIALTY_LABELS, TechnicianSpecialty, RequestStatus, RequestPriority, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '../types';
import { ShieldAlert, Key, Grid, Clipboard, Users, Star, MessageSquare, Plus, Edit2, Trash2, CheckCircle2, UserPlus, Info, Save, Clock, X, ChevronDown, ChevronUp, Reply, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    switchRole,
    requests,
    updateRequest,
    deleteRequest,
    tickets,
    updateTicket,
    addTicketMessage,
    reviews,
    updateReview,
    technicians,
    addTechnician,
    updateTechnician,
    deleteTechnician
  } = useApp();

  // Active admin tab selection
  const [adminTab, setAdminTab] = useState<'overview' | 'requests' | 'technicians' | 'tickets' | 'reviews'>('overview');

  // Technician states (for CRUD)
  const [showAddTechForm, setShowAddTechForm] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techSpecialty, setTechSpecialty] = useState<TechnicianSpecialty>('all');
  const [techIsActive, setTechIsActive] = useState(true);

  // Expanded editor states for requests, tickets
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  
  // Overruled technician suggestions map (reqId -> techId)
  const [assignedTechOverride, setAssignedTechOverride] = useState<Record<string, string>>({});

  // Admin reply inputs
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [ticketReplyInput, setTicketReplyInput] = useState('');

  // Guard: If current user role is not admin, render a premium block prompting them to switch role
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">عدم دسترسی به پنل مدیریت</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              شما هم‌اکنون به عنوان کاربر آزمایشی «مشتری» آنلاین هستید. دسترسی به پنل مدیریت صرفاً برای مدیر سیستم فعال می‌باشد.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => switchRole('admin')}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>ارتقا و شبیه‌سازی نقش مدیر کل (Admin)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Statistics summaries calculations
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;

  const totalTickets = tickets.length;
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  const pendingReviewsCount = reviews.filter(r => !r.isApproved).length;

  // Handles approving a service request
  const handleApproveRequest = (req: Request) => {
    updateRequest({
      ...req,
      isApproved: true,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });
  };

  // Handles updating request assignment, status, or note
  const handleUpdateRequestDetails = (req: Request, techId: string, status: RequestStatus, note: string) => {
    const assignedTech = technicians.find(t => t.id === techId);
    updateRequest({
      ...req,
      assignedToId: techId || undefined,
      assignedToName: assignedTech?.fullName || undefined,
      status: status,
      adminNotes: note || undefined,
      assignedAt: techId ? new Date().toISOString() : undefined,
    });
    setExpandedRequestId(null);
    setAdminNotesInput('');
  };

  // Handles adding/saving a technician
  const handleSaveTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim() || !techPhone.trim()) return;

    if (editingTechId) {
      // Edit mode
      const existing = technicians.find(t => t.id === editingTechId);
      if (existing) {
        updateTechnician({
          ...existing,
          fullName: techName,
          phone: techPhone,
          email: techEmail || undefined,
          specialty: techSpecialty,
          isActive: techIsActive,
        });
      }
      setEditingTechId(null);
    } else {
      // Add mode
      addTechnician({
        fullName: techName,
        phone: techPhone,
        email: techEmail || undefined,
        specialty: techSpecialty,
        isActive: techIsActive,
        completedTasks: 0,
      });
    }

    // Reset fields
    setTechName('');
    setTechPhone('');
    setTechEmail('');
    setTechSpecialty('all');
    setTechIsActive(true);
    setShowAddTechForm(false);
  };

  // Triggers technician modify fields populated
  const handleTriggerEditTech = (tech: Technician) => {
    setEditingTechId(tech.id);
    setTechName(tech.fullName);
    setTechPhone(tech.phone);
    setTechEmail(tech.email || '');
    setTechSpecialty(tech.specialty);
    setTechIsActive(tech.isActive);
    setShowAddTechForm(true);
  };

  // Approving customer comment
  const handleApproveReview = (rev: Review) => {
    updateReview({
      ...rev,
      isApproved: true,
    });
  };

  // Delete customer review
  const handleDeleteReview = (id: string) => {
    const freshList = reviews.filter(r => r.id !== id);
    localStorage.setItem('ed_reviews', JSON.stringify(freshList));
    // Soft sync is handled by reload, or context action if available
    window.location.reload();
  };

  // Replying to a customer ticket
  const handleSendTicketReply = (ticket: Ticket) => {
    if (!ticketReplyInput.trim()) return;

    // We can add message to messages list and set it closed or pending
    addTicketMessage(ticket.id, ticketReplyInput.trim(), 'admin');
    
    // Also save simplified top-level admin_reply attribute
    updateTicket({
      ...ticket,
      adminReply: ticketReplyInput.trim(),
      status: 'in_progress',
    });

    setTicketReplyInput('');
    setExpandedTicketId(null);
  };

  // Intelligent recommendation scorer for technicians based on requested specialty, workload and ratings
  const getRecommendations = (req: Request) => {
    return technicians
      .map((tech) => {
        // 1. Specialty Score (match serviceType with tech specialty or generalist)
        let specialtyScore = 0;
        let specialtyMatchLabel = '';
        if (tech.specialty === req.serviceType) {
          specialtyScore = 60;
          specialtyMatchLabel = 'تخصص دقیق مساوی با نیاز مشتری';
        } else if (tech.specialty === 'all') {
          specialtyScore = 40;
          specialtyMatchLabel = 'تکنسین ارشد کل حوزه‌ها';
        } else {
          specialtyScore = 15;
          specialtyMatchLabel = 'تخصص نامرتبط حوزه جانبی';
        }

        // 2. Average Reviews Score 
        const techReviews = (reviews || []).filter(
          (r) => r.technicianId === tech.id || (!r.technicianId && tech.id === 'tech-1')
        );
        const avgRating = techReviews.length > 0
          ? techReviews.reduce((sum, r) => sum + r.rating, 0) / techReviews.length
          : 5.0; // Perfect base score for new joiners

        const ratingScore = avgRating * 8; // Max score contribution of 40 points

        // 3. Current active workload penalty
        const activeTasksCount = requests.filter(
          (r) => r.assignedToId === tech.id && (r.status === 'assigned' || r.status === 'in_progress')
        ).length;
        const loadPenalty = activeTasksCount * 12; // Deduct 12 score points per active task
        const loadScore = Math.max(-30, -loadPenalty);

        // 4. Availability / Activity status score
        const availabilityScore = tech.isActive ? 20 : -60; // Huge penalty for inactive / offline techs

        // Total summation
        const totalScore = specialtyScore + ratingScore + loadScore + availabilityScore;
        const matchPercentage = Math.min(100, Math.max(10, Math.round((totalScore / 115) * 100)));

        return {
          tech,
          avgRating,
          reviewCount: techReviews.length,
          activeTasksCount,
          specialtyMatchLabel,
          matchPercentage,
          totalScore,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title cap banner */}
        <div className="flex items-center gap-3 border-b border-slate-205 pb-6 mb-8">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-sm">
            <Clipboard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-rose-650 font-black tracking-widest uppercase block">ادمین استودیو EasyDriver</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">پنل جامع مدیریت خدمات تعمیراتی</h1>
          </div>
        </div>

        {/* Core Admin Navigation Grid tabs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-8">
          {[
            { id: 'overview', label: 'داشبورد خلاصه آمار', icon: Grid },
            { id: 'requests', label: 'مدیریت درخواست‌ها', icon: Clipboard, badge: pendingRequests },
            { id: 'technicians', label: 'تعریف تکنسین‌ها (CRUD)', icon: Users },
            { id: 'tickets', label: 'تیکت‌های باز پشتیبانی', icon: MessageSquare, badge: openTicketsCount },
            { id: 'reviews', label: 'تایید نظرات کاربران', icon: Star, badge: pendingReviewsCount },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/15'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[9px] font-bold h-5 min-w-5 px-1 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-white text-rose-650' : 'bg-rose-500 text-white animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner views render by selected admin tab */}
        <div className="min-h-[50vh]">
          
          {/* TAB 1: OVERVIEW */}
          {adminTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Metric widgets row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'کل درخواست‌های ثبت‌شده', value: totalRequests, sub: `${pendingRequests} مورد باز و در انتظار`, color: 'border-blue-100 bg-blue-50/10 text-blue-700' },
                  { title: 'درخواست‌های در حال انجام', value: inProgressRequests, sub: 'توسط تکنسین‌های ریموت', color: 'border-purple-100 bg-purple-50/10 text-purple-700' },
                  { title: 'تیکت‌های معلق مشتریان', value: openTicketsCount, sub: 'بخش چت آنلاین و مالی', color: 'border-cyan-150 bg-cyan-50/10 text-cyan-700' },
                  { title: 'نظرات معلق تایید نشده', value: pendingReviewsCount, sub: 'جهت بررسی و نمایش عمومی', color: 'border-amber-100 bg-amber-50/10 text-amber-700' },
                ].map((stat, idx) => (
                  <div key={idx} className={`p-6 bg-white border rounded-2xl shadow-xxs text-right ${stat.color}`}>
                    <span className="text-[10px] font-bold tracking-tight text-slate-400 block">{stat.title}</span>
                    <strong className="block text-3xl font-black mt-2 leading-none text-slate-900">{stat.value}</strong>
                    <span className="block text-[10px] text-slate-500 mt-2 hover:underline">{stat.sub}</span>
                  </div>
                ))}
              </div>

              {/* Quick instructions panel */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-right">
                <div className="md:col-span-2 space-y-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-850 flex items-center gap-1.5">
                    <Info className="h-5 w-5 text-indigo-505" />
                    <span>راهنمای آزمون شبیه‌ساز مدیریت ایزی‌درایور</span>
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    پنل ادمین پلتفرم EasyDriver به شما این توانایی فوق‌العاده را می‌دهد تا سناریوی واقعی را رقم بزنید. می‌توانید به عنوان ادمین وارد این بخش شوید، درخواست مشتری را تایید کنید، تکنسین را به سلیقه‌تان ارجاع دهید، در تیکت‌ها چت کنید و سپس از فلوتر شناور، دوباره نقش خود را به <strong>«مشتری عادی»</strong> تغییر دهید تا بروزرسانی‌های لحظه‌ای را مانند کاربر نهایی ببینید!
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-850 rounded-2xl text-xs space-y-2 font-semibold">
                  <span>آمار سریع تکنسین‌ها:</span>
                  <p className="text-[11px] font-normal text-indigo-950 leading-relaxed">
                    مجموعاً {technicians.length} تکنسین فعال ثبت شده‌اند. بیشترین لود کاری بر عهده {technicians.sort((a,b)=> b.completedTasks - a.completedTasks)[0]?.fullName || 'ناشناس'} می‌باشد.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REQUESTS MANAGER */}
          {adminTab === 'requests' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-850 pb-2 border-b border-slate-200">فهرست کل درخواست‌های خدمات فنی</h3>

              {requests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">هیچ درخواستی در سیستم وجود ندارد.</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const isExpanded = expandedRequestId === req.id;
                    return (
                      <div key={req.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden text-right">
                        
                        {/* Interactive toggle header */}
                        <div
                          onClick={() => {
                            setExpandedRequestId(isExpanded ? null : req.id);
                            setAdminNotesInput(req.adminNotes || '');
                          }}
                          className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                        >
                          <div className="space-y-1 grow">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] bg-slate-100 font-mono text-slate-600 px-1.5 rounded font-bold">#{req.id}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[req.status]}`}>
                                {STATUS_LABELS[req.status]}
                              </span>
                              <span className="text-xs font-black text-slate-800 mr-1">{SERVICE_LABELS[req.serviceType]}</span>
                            </div>
                            <div className="text-slate-450 text-[10px] flex items-center gap-2 pt-1 font-semibold">
                              <span>ثبت‌کننده: {req.fullName}</span>
                              <span>•</span>
                              <span>تماس: {req.phone}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Request action editor expand sheet */}
                        {isExpanded && (
                          <div className="p-5 bg-slate-50/50 border-t border-slate-150 space-y-5 text-xs">
                            
                            {/* Problem description info row */}
                            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block">شرح مشکل کاربر:</span>
                              <p className="text-slate-650 font-normal leading-relaxed">{req.description}</p>
                            </div>

                            {/* Action block forms */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                              
                              {/* 1. Approval and status triggers */}
                              <div className="space-y-3.5">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">تاییدیه و وضعیت تفصیلی</h4>
                                
                                {/* If not approved, show main triggers */}
                                {!req.isApproved ? (
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>تایید نهایی این درخواست</span>
                                  </button>
                                ) : (
                                  <div className="p-3 bg-emerald-50 text-emerald-800 border-emerald-100 rounded-xl flex items-center gap-1.5 font-bold leading-relaxed">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>این درخواست تایید شده است.</span>
                                  </div>
                                )}

                                {/* Status modifier */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block">تغییر زردآلو وضعیت جاری:</label>
                                  <select
                                    id={`status-mod-${req.id}`}
                                    defaultValue={req.status}
                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[11px]"
                                  >
                                    {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((sta) => (
                                      <option key={sta} value={sta}>{STATUS_LABELS[sta]}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* 2. Technician assignment block */}
                              <div className="space-y-3">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">ارجاع مستقیم تکنسین</h4>
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block">انتخاب کارشناس فنی:</label>
                                  <select
                                    id={`tech-assign-${req.id}`}
                                    value={assignedTechOverride[req.id] !== undefined ? assignedTechOverride[req.id] : (req.assignedToId || '')}
                                    onChange={(e) => setAssignedTechOverride(prev => ({ ...prev, [req.id]: e.target.value }))}
                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[11px] cursor-pointer focus:border-indigo-400"
                                  >
                                    <option value="">بدون تکنسین ارجاع‌یافته (در انتظار)</option>
                                    {technicians.map((tech) => (
                                      <option key={tech.id} value={tech.id}>
                                        {tech.fullName} ({SPECIALTY_LABELS[tech.specialty]}) | {tech.isActive ? '🟢 فعال' : '🔴 غیرفعال (آفلاین)'}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Intelligent Recommendation Helper system */}
                                <div className="bg-indigo-50/40 border border-indigo-150/70 p-3 rounded-2xl space-y-2 mt-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-extrabold text-indigo-900 flex items-center gap-1.5">
                                      <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse shrink-0" />
                                      <span>سیستم پیشنهاد هوشمند تکنسین (موتور تخصصی)</span>
                                    </span>
                                    <span className="text-[8px] bg-indigo-100/80 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded leading-none shrink-0">
                                      بروزرسانی زنده
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2">
                                    {getRecommendations(req).slice(0, 2).map(({ tech, avgRating, reviewCount, activeTasksCount, specialtyMatchLabel, matchPercentage }) => {
                                      const isCurrentlyAssigned = (assignedTechOverride[req.id] !== undefined ? assignedTechOverride[req.id] : (req.assignedToId || '')) === tech.id;
                                      return (
                                        <div
                                          key={tech.id}
                                          onClick={() => setAssignedTechOverride(prev => ({ ...prev, [req.id]: tech.id }))}
                                          className={`p-2 bg-white rounded-xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/10 group ${
                                            isCurrentlyAssigned
                                              ? 'border-indigo-500 bg-white ring-1 ring-indigo-500/25 shadow-sm shadow-indigo-500/5'
                                              : 'border-slate-200/80 bg-slate-50/20 hover:border-slate-300'
                                          }`}
                                        >
                                          <div className="space-y-1 grow min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-extrabold text-[11px] text-slate-850 group-hover:text-indigo-950 truncate">
                                                {tech.fullName}
                                              </span>
                                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                                                tech.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                              }`}>
                                                {tech.isActive ? 'آماده کار' : 'آفلاین'}
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-semibold truncate leading-none">
                                                ({SPECIALTY_LABELS[tech.specialty]})
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap text-[9px] text-slate-500 font-medium leading-none">
                                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                                ★ {avgRating.toFixed(1)} <span className="text-slate-400 font-normal">({reviewCount} نظر)</span>
                                              </span>
                                              <span>•</span>
                                              <span className={activeTasksCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                {activeTasksCount > 0 ? `${activeTasksCount} کار محوله` : 'بدون لود کاری'}
                                              </span>
                                              <span>•</span>
                                              <span className="text-indigo-600 font-bold text-[8px] bg-indigo-50/50 px-1 rounded">
                                                {specialtyMatchLabel}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-left hidden sm:block">
                                              <span className={`block text-[11px] font-black leading-none ${
                                                matchPercentage >= 85 ? 'text-emerald-600' : matchPercentage >= 70 ? 'text-indigo-650' : 'text-slate-500'
                                              }`}>
                                                {matchPercentage}٪ تطابق
                                              </span>
                                              <span className="text-[7.5px] text-slate-400 block font-normal text-left mt-0.5">ضریب شایستگی</span>
                                            </div>

                                            <button
                                              type="button"
                                              className={`px-2 py-1.5 text-[8.5px] font-extrabold rounded-lg shadow-xxs cursor-pointer transition-all ${
                                                isCurrentlyAssigned
                                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                              }`}
                                            >
                                              {isCurrentlyAssigned ? 'انتخاب شده' : 'انتخاب ارجاع'}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block">زمانبندی اتصال (ترجیحی):</label>
                                  <input
                                    type="datetime-local"
                                    id={`scheduled-date-${req.id}`}
                                    defaultValue={req.scheduledDate || ''}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                              </div>

                              {/* 3. Notes block */}
                              <div className="space-y-3">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">یادداشت کارشناسان و مدیریت</h4>
                                <textarea
                                  value={adminNotesInput}
                                  onChange={(e) => setAdminNotesInput(e.target.value)}
                                  placeholder="محل یادداشت آی‌دی انی‌دسک، کارهای انجام شده و تذکرات لایسنس..."
                                  rows={3}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                                />
                              </div>

                            </div>

                            {/* Submits changes */}
                            <div className="pt-3 border-t border-slate-200 flex justify-between gap-4">
                              <button
                                onClick={() => {
                                  if (window.confirm('آیا مایلید این درخواست کاملاً حذف شود؟')) {
                                    deleteRequest(req.id);
                                  }
                                }}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 hover:text-rose-800 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>حذف فیزیکی پرونده</span>
                              </button>

                              <button
                                onClick={() => {
                                  const selectStatus = (document.getElementById(`status-mod-${req.id}`) as HTMLSelectElement).value as RequestStatus;
                                  const selectTechId = (document.getElementById(`tech-assign-${req.id}`) as HTMLSelectElement).value;
                                  const selectSchedule = (document.getElementById(`scheduled-date-${req.id}`) as HTMLInputElement).value;
                                  
                                  const updatedReq: Request = {
                                    ...req,
                                    status: selectStatus,
                                    assignedToId: selectTechId || undefined,
                                    assignedToName: technicians.find(t => t.id === selectTechId)?.fullName || undefined,
                                    scheduledDate: selectSchedule || undefined,
                                    adminNotes: adminNotesInput || undefined,
                                    isApproved: selectStatus !== 'pending',
                                    approvedAt: !req.isApproved && selectStatus !== 'pending' ? new Date().toISOString() : req.approvedAt,
                                  };
                                  updateRequest(updatedReq);
                                  setExpandedRequestId(null);
                                }}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Save className="h-4 w-4" />
                                <span>ثبت کل تغییرات</span>
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: TECHNICIANS MANAGER (CRUD) */}
          {adminTab === 'technicians' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-850">لیست همکاران و تکنسین‌های مجرب</h3>
                <button
                  onClick={() => {
                    setEditingTechId(null);
                    setTechName('');
                    setTechPhone('');
                    setTechEmail('');
                    setTechSpecialty('all');
                    setTechIsActive(true);
                    setShowAddTechForm(!showAddTechForm);
                  }}
                  className="px-3 py-1.5 bg-rose-50/50 hover:bg-rose-50 text-rose-700 border border-rose-100/50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{showAddTechForm ? 'لغو فرم' : 'افزودن همکار جدید'}</span>
                </button>
              </div>

              {/* Add/Edit Form Sheet (conditional) */}
              {showAddTechForm && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 text-right">
                  <form onSubmit={handleSaveTechnician} className="space-y-4">
                    <h4 className="font-extrabold text-slate-850 text-xs border-b border-slate-100 pb-2">
                      {editingTechId ? 'ویرایش اطلاعات پرسنل' : 'درج مشخصات تکنسین جدید'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      
                      {/* Full Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">نام و نام خانوادگی</label>
                        <input
                          type="text"
                          required
                          value={techName}
                          onChange={(e) => setTechName(e.target.value)}
                          placeholder="مثال: مهندس رادمنش"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">تلفن تماس موبایل</label>
                        <input
                          type="tel"
                          required
                          value={techPhone}
                          onChange={(e) => setTechPhone(e.target.value)}
                          placeholder="مثال: 09123456789"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs outline-none font-mono"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">آدرس ایمیل</label>
                        <input
                          type="email"
                          value={techEmail}
                          onChange={(e) => setTechEmail(e.target.value)}
                          placeholder="example@mail.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-left outline-none font-mono"
                        />
                      </div>

                      {/* Specialty selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">تخصص اصلی</label>
                        <select
                          value={techSpecialty}
                          onChange={(e) => setTechSpecialty(e.target.value as TechnicianSpecialty)}
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                        >
                          {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={techIsActive}
                          onChange={(e) => setTechIsActive(e.target.checked)}
                          className="h-4 w-4 accent-rose-600 rounded select-none cursor-pointer"
                        />
                        <span>این تکنسین آماده انجام کار ریموت است (وضعیت فعال)</span>
                      </label>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {editingTechId ? 'بروزرسانی تغییرات' : 'افزودن همکار به دیتابیس'}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* Grid cards display of Technicians lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {technicians.map((tech) => {
                  const techReviews = (reviews || []).filter(
                    (r) => r.technicianId === tech.id || (!r.technicianId && tech.id === 'tech-1')
                  );
                  const avgRating = techReviews.length > 0
                    ? (techReviews.reduce((sum, r) => sum + r.rating, 0) / techReviews.length).toFixed(1)
                    : '5.0';

                  return (
                    <div key={tech.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xxs text-right flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        
                        {/* Name status cap */}
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-slate-850">{tech.fullName}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            tech.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {tech.isActive ? 'فعال و آزاد جهت ریموت' : 'مشغول / آفلاین'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-500 font-normal">
                          <p>تخصص اصلی: <span className="font-bold text-slate-700">{SPECIALTY_LABELS[tech.specialty]}</span></p>
                          <p className="font-mono">تلفن: {tech.phone}</p>
                          {tech.email && <p className="font-mono">ایمیل: {tech.email}</p>}
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold pt-1">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            <span>میانگین رضایت: {avgRating} از ۵ ({techReviews.length} بازخورد مشتری)</span>
                          </div>
                          <span className="block text-[10px] text-indigo-705 font-bold pt-0.5 animate-pulse">تعداد کارهای نهایی شده: {tech.completedTasks} خدمت نصب</span>
                        </div>

                      </div>


                    {/* Action buttons modifiers for CRUD */}
                    <div className="pt-3.5 border-t border-slate-100 flex justify-end gap-2 text-xxs font-black">
                      <button
                        onClick={() => handleTriggerEditTech(tech)}
                        className="p-1 px-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>ویرایش پرونده</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('آیا مایلید این تکنسین همواره از لیست حذف گردد؟')) {
                            deleteTechnician(tech.id);
                          }
                        }}
                        className="p-1 px-2.5 bg-rose-50 border border-rose-100 text-rose-600 hover:text-rose-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>

                  </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 4: TICKETS REPLIER */}
          {adminTab === 'tickets' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-850 pb-2 border-b border-slate-200">مدیریت پاسخگویی تیکتینگ</h3>

              {tickets.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center text-xs text-slate-400">هیچ تیکت پشتیبانی در سیستم وجود ندارد.</div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => {
                    const isExpanded = expandedTicketId === t.id;
                    const repliesCount = t.messages ? t.messages.length - 1 : 0;
                    return (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden text-right">
                        
                        <div
                          onClick={() => {
                            setExpandedTicketId(isExpanded ? null : t.id);
                            setTicketReplyInput('');
                          }}
                          className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                        >
                          <div className="space-y-0.5 grow">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded font-mono font-bold">#{t.id.substring(0, 8)}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${TICKET_STATUS_COLORS[t.status]}`}>
                                {TICKET_STATUS_LABELS[t.status]}
                              </span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                                {TICKET_CATEGORY_LABELS[t.category]}
                              </span>
                            </div>
                            <span className="block font-extrabold text-xs sm:text-sm text-slate-850 pt-1.5">M: {t.subject} (کاربر: {t.userName || 'ناشناس'})</span>
                          </div>

                          <div className="shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-5 bg-slate-50/50 border-t border-slate-150 space-y-4 text-xs font-normal">
                            
                            {/* Original customer message */}
                            <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">متن پیام ارسالی مشتری:</span>
                              <p className="text-slate-650 leading-relaxed font-normal">{t.message}</p>
                            </div>

                            {/* Historic replies display list */}
                            {t.messages && t.messages.length > 1 && (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold block">تاریخچه چت / پاسخ‌های ثبت شده:</span>
                                
                                <div className="space-y-2.5 max-h-40 overflow-y-auto p-1 bg-white border border-slate-100 rounded-xl pr-3">
                                  {t.messages.map((m) => (
                                    <div key={m.id} className="text-[11px] leading-relaxed">
                                      <strong className={m.senderRole === 'admin' ? 'text-blue-700' : 'text-slate-700'}>
                                        {m.senderName}:
                                      </strong>
                                      <span className="font-normal text-slate-600 mr-1">{m.message}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Admin Replier Input Form */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <label className="text-[10px] font-bold text-slate-400 block">نوشتن پاسخ جدید برای ارسال پیام آنلاین:</label>
                              <textarea
                                value={ticketReplyInput}
                                onChange={(e) => setTicketReplyInput(e.target.value)}
                                placeholder="پاسخ، مشاوره فنی یا شماره اتصال ریموت را تایپ کنید..."
                                rows={3}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none"
                              />
                            </div>

                            {/* Actions line submits */}
                            <div className="flex justify-between items-center pt-2">
                              <button
                                onClick={() => {
                                  updateTicket({ ...t, status: 'closed' });
                                  setExpandedTicketId(null);
                                }}
                                className="px-3.5 py-1.5 hover:bg-rose-50 border border-slate-150 text-slate-600 hover:text-rose-700 rounded-lg font-bold"
                              >
                                بستن و نهایی کردن تیکت
                              </button>

                              <button
                                onClick={() => handleSendTicketReply(t)}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Reply className="h-4 w-4" />
                                <span>ثبت و ارسال پاسخ</span>
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: REVIEWS APPROVER */}
          {adminTab === 'reviews' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-850 pb-2 border-b border-slate-200">بررسی و تایید نظرات کاربران</h3>

              {reviews.filter(r => !r.isApproved).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">هیچ دیدگاه تازه معلقی در انتظار تایید وجود ندارد!</div>
              ) : (
                <div className="space-y-3">
                  {reviews.filter(r => !r.isApproved).map((rev) => (
                    <div key={rev.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xxs text-right space-y-3">
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="block text-slate-800 text-xs sm:text-sm font-extrabold">{rev.customerName}</strong>
                          {rev.serviceType && <span className="block text-[10px] text-slate-400">نوع خدمت: {rev.serviceType}</span>}
                        </div>

                        {/* Stars display */}
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-150'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed font-normal">
                        {rev.comment}
                      </p>

                      {/* Deciders action buttons strip */}
                      <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 text-xxs font-black">
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                        >
                          رد پیام
                        </button>
                        <button
                          onClick={() => handleApproveReview(rev)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>تایید و انتشار عمومی در سایت</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
