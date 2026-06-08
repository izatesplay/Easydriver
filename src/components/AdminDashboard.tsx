import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Request, Review, Ticket, Technician, SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, SPECIALTY_LABELS, TechnicianSpecialty, RequestStatus, RequestPriority, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '../types';
import { ShieldAlert, Key, Grid, Clipboard, Users, Star, MessageSquare, Plus, Edit2, Trash2, CheckCircle2, UserPlus, Info, Save, Clock, X, ChevronDown, ChevronUp, Reply, Sparkles, Database, Server, Globe, FileCode as FileCodeIcon, Trophy, Medal, Printer, FileSpreadsheet as FileDown, UserCheck, UserX, UserMinus, Camera, Monitor, Timer, BarChart3, RefreshCw, Play, Activity, Paperclip, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateTechnicianStats } from '../utils/pointsCalculator';
import { useRenderTracker } from '../utils/indexedDB';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  useRenderTracker("پیشخوان ادمین (Admin)");
  const {
    currentUser,
    requests,
    updateRequest,
    deleteRequest,
    tickets,
    updateTicket,
    addTicketMessage,
    reviews,
    updateReview,
    deleteReview,
    technicians,
    addTechnician,
    updateTechnician,
    deleteTechnician,
    loadFreshData
  } = useApp();

  // Active admin tab selection
  const [adminTab, setAdminTab] = useState<'overview' | 'requests' | 'technicians' | 'tickets' | 'reviews' | 'db' | 'reports'>('overview');

  // Report filters state
  const [reportReqStatus, setReportReqStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [reportTechActive, setReportTechActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [reportTicketStatus, setReportTicketStatus] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [reportReviewApproved, setReportReviewApproved] = useState<'all' | 'approved' | 'pending'>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');

  // Print support preview helper
  const [currentPrintType, setCurrentPrintType] = useState<'requests' | 'technicians' | 'tickets' | 'reviews' | null>(null);

  // Interval state for demand distribution chart
  const [chartInterval, setChartInterval] = useState<'monthly' | 'weekly'>('monthly');

  // Databse phpMyAdmin status
  const [dbInfo, setDbInfo] = useState<{
    connected: boolean;
    error: string;
    host: string;
    database: string;
    mode: string;
    totalQueries?: number;
    uptimeSeconds?: number;
    poolLimit?: number;
    activeConnections?: number;
    idleConnections?: number;
    activeQueries?: number;
  } | null>(null);

  const [probingDb, setProbingDb] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    healthy: boolean;
    connected: boolean;
    mode: string;
    error: string;
    host: string;
    database: string;
    probeLog: string;
    timestamp?: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/db-status")
        .then(res => res.json())
        .then(data => setDbInfo(data))
        .catch(err => console.error("Error loading db status:", err));
    };
    fetchStatus();

    // Constant 7-second background polling for the header floating indicator
    const timer = setInterval(fetchStatus, 7000);
    return () => clearInterval(timer);
  }, []);

  // Technician states (for CRUD)
  const [showAddTechForm, setShowAddTechForm] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techSpecialty, setTechSpecialty] = useState<TechnicianSpecialty>('all');
  const [techIsActive, setTechIsActive] = useState(true);
  const [techCertificationLevel, setTechCertificationLevel] = useState<'Junior' | 'Senior' | 'Expert'>('Junior');
  const [techPassword, setTechPassword] = useState('');

  // Expanded editor states for requests, tickets
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [selectedFullScreenImage, setSelectedFullScreenImage] = useState<string | null>(null);
  
  // Overruled technician suggestions map (reqId -> techId)
  const [assignedTechOverride, setAssignedTechOverride] = useState<Record<string, string>>({});

  // Admin reply inputs
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [ticketReplyInput, setTicketReplyInput] = useState('');
  const [isAdminUploading, setIsAdminUploading] = useState<Record<string, boolean>>({});

  // Statistics summaries calculations
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;

  const totalTickets = tickets.length;
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  const pendingReviewsCount = reviews.filter(r => !r.isApproved && !r.isRejected).length;

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRequests = () => {
    if (selectedRequestIds.length === requests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(requests.map(r => r.id));
    }
  };

  const handleBulkStatusUpdate = (newStatus: RequestStatus) => {
    selectedRequestIds.forEach(id => {
      const r = requests.find(x => x.id === id);
      if (r) {
        updateRequest({
          ...r,
          status: newStatus,
          isApproved: true,
          updatedDate: new Date().toISOString()
        });
      }
    });
    setSelectedRequestIds([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`آیا از حذف گروهی ${selectedRequestIds.length} درخواست انتخاب‌شده مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`)) {
      selectedRequestIds.forEach(id => {
        deleteRequest(id);
      });
      setSelectedRequestIds([]);
    }
  };

  const serviceStatsData = React.useMemo(() => {
    const stats: Record<string, number> = {
      driver_install: 0,
      software_install: 0,
      anydesk_support: 0,
      other: 0,
    };

    // Filter requests depending on selected chart interval
    const now = new Date();
    const cutoffDate = new Date();
    if (chartInterval === 'weekly') {
      cutoffDate.setDate(now.getDate() - 7);
    } else {
      cutoffDate.setDate(now.getDate() - 30);
    }

    requests.forEach(r => {
      const reqDate = r.createdDate ? new Date(r.createdDate) : new Date();
      if (reqDate >= cutoffDate) {
        if (stats[r.serviceType] !== undefined) {
          stats[r.serviceType]++;
        } else {
          stats.other = (stats.other || 0) + 1;
        }
      }
    });

    return Object.keys(stats).map(key => ({
      name: SERVICE_LABELS[key as any] || key,
      value: stats[key],
    }));
  }, [requests, chartInterval]);

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

    const registered = JSON.parse(localStorage.getItem('ed_registered_users') || '[]');

    if (editingTechId) {
      // Edit mode
      const existing = technicians.find(t => t.id === editingTechId);
      if (existing) {
        updateTechnician({
          ...existing,
          fullName: techName.trim(),
          phone: techPhone.trim(),
          email: techEmail.trim() || undefined,
          specialty: techSpecialty,
          isActive: techIsActive,
          certificationLevel: techCertificationLevel,
        });

        // Sync with registered users
        const matchedIdx = registered.findIndex((u: any) => u.id === editingTechId);
        let updatedUserObj: any = null;
        if (matchedIdx >= 0) {
          registered[matchedIdx].fullName = techName.trim();
          registered[matchedIdx].phone = techPhone.trim();
          registered[matchedIdx].email = techEmail.trim().toLowerCase() || `${editingTechId}@easydriver.ir`;
          registered[matchedIdx].isActive = techIsActive;
          if (techPassword.trim() !== '') {
            registered[matchedIdx].password = techPassword.trim();
          }
          updatedUserObj = registered[matchedIdx];
        } else {
          // Create entry in localStorage registered list if it doesn't exist
          updatedUserObj = {
            id: editingTechId,
            fullName: techName.trim(),
            email: techEmail.trim().toLowerCase() || `${editingTechId}@easydriver.ir`,
            phone: techPhone.trim(),
            role: 'technician',
            password: techPassword.trim() || '123',
            isActive: techIsActive,
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(techName.trim())}`,
          };
          registered.push(updatedUserObj);
        }
        localStorage.setItem('ed_registered_users', JSON.stringify(registered));

        // Sync user update with backend
        fetch(`/api/users/${editingTechId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUserObj)
        })
        .then(() => { if (loadFreshData) loadFreshData(); })
        .catch(err => console.error("Error updating user on backend DB:", err));
      }
      setEditingTechId(null);
    } else {
      // Add mode
      const generatedTechId = `tech-${Date.now()}`;
      addTechnician({
        id: generatedTechId,
        fullName: techName.trim(),
        phone: techPhone.trim(),
        email: techEmail.trim() || undefined,
        specialty: techSpecialty,
        isActive: techIsActive,
        completedTasks: 0,
        certificationLevel: techCertificationLevel,
      });

      // Create new account in localStorage registered list
      const newUserObj = {
        id: generatedTechId,
        fullName: techName.trim(),
        email: techEmail.trim().toLowerCase() || `${generatedTechId}@easydriver.ir`,
        phone: techPhone.trim(),
        role: 'technician',
        password: techPassword.trim() || '123',
        isActive: techIsActive,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(techName.trim())}`,
      };
      registered.push(newUserObj);
      localStorage.setItem('ed_registered_users', JSON.stringify(registered));

      // Sync user insert with backend
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserObj)
      })
      .then(() => { if (loadFreshData) loadFreshData(); })
      .catch(err => console.error("Error creating user on backend DB:", err));
    }

    // Reset fields
    setTechName('');
    setTechPhone('');
    setTechEmail('');
    setTechPassword('');
    setTechSpecialty('all');
    setTechIsActive(true);
    setTechCertificationLevel('Junior');
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
    setTechCertificationLevel(tech.certificationLevel || 'Junior');

    // Prefill password if available in local storage
    const registered = JSON.parse(localStorage.getItem('ed_registered_users') || '[]');
    const matched = registered.find((u: any) => u.id === tech.id);
    if (matched && matched.password) {
      setTechPassword(matched.password);
    } else {
      // Check if it matches one of initial technicians
      if (tech.id === 'tech-1') setTechPassword('123');
      else setTechPassword('123'); // Default fallback
    }

    setShowAddTechForm(true);
  };

  // Approving customer comment
  const handleApproveReview = (rev: Review) => {
    updateReview({
      ...rev,
      isApproved: true,
    });
  };

  // Professional CSV (Excel-Compatible UTF-8 BOM) export utility
  const exportToExcelType = (type: 'requests' | 'technicians' | 'tickets' | 'reviews') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'requests') {
      filename = `گزارش_درخواست‌های_مشتریان_${new Date().toLocaleDateString('fa-IR')}.csv`;
      headers = ['شناسه درخواست', 'نام متقاضی', 'شماره تماس', 'نوع خدمت فنی', 'اولویت', 'وضعیت اجرایی', 'نام تکنسین ارجاع‌شده', 'تاریخ ثبت اولیه', 'آخرین بروزرسانی', 'توضیحات تکمیلی مشتری', 'یادداشت‌های اختصاصی ادمین'];
      
      let targetRequests = reportReqStatus === 'all' ? requests : requests.filter(r => r.status === reportReqStatus);
      if (reportStartDate) {
        targetRequests = targetRequests.filter(r => (r.createdDate || '').substring(0, 10) >= reportStartDate);
      }
      if (reportEndDate) {
        targetRequests = targetRequests.filter(r => (r.createdDate || '').substring(0, 10) <= reportEndDate);
      }
      rows = targetRequests.map(r => [
        r.id,
        r.fullName || 'بدون نام',
        r.phone || '',
        SERVICE_LABELS[r.serviceType] || r.serviceType,
        PRIORITY_LABELS[r.priority] || r.priority,
        STATUS_LABELS[r.status] || r.status,
        r.assignedToName || 'تخصیص نیافته',
        new Date(r.createdDate).toLocaleDateString('fa-IR'),
        new Date(r.updatedDate).toLocaleDateString('fa-IR'),
        r.description || '',
        r.adminNotes || ''
      ]);
    } else if (type === 'technicians') {
      filename = `گزارش_وضعیت_تکنسین‌ها_${new Date().toLocaleDateString('fa-IR')}.csv`;
      headers = ['شناسه تکنسین', 'نام و نام خانوادگی', 'تلفن همراه', 'پست الکترونیک', 'تخصص اصلی', 'سطح گواهی', 'وضعیت حضور', 'تعداد تسک‌های کارشده', 'تاریخ ثبت سیستم'];
      
      const targetTechs = reportTechActive === 'all' 
        ? technicians 
        : technicians.filter(t => reportTechActive === 'active' ? t.isActive : !t.isActive);
      
      rows = targetTechs.map(t => [
        t.id,
        t.fullName,
        t.phone,
        t.email || '',
        SPECIALTY_LABELS[t.specialty] || t.specialty,
        t.certificationLevel || 'Junior',
        t.isActive ? 'آنلاین (آماده کار)' : 'آفلاین',
        String(t.completedTasks || 0),
        t.createdDate ? new Date(t.createdDate).toLocaleDateString('fa-IR') : 'پیش فرض'
      ]);
    } else if (type === 'tickets') {
      filename = `گزارش_امور_پشتیبانی_تیکت‌ها_${new Date().toLocaleDateString('fa-IR')}.csv`;
      headers = ['شناسه تیکت', 'ایجادکننده تیکت', 'موضوع پشتیبانی', 'دسته‌بندی موضوعی', 'سطح اضطرار اولیه', 'وضعیت کنونی تیکت', 'تاریخ گشایش', 'پاسخ لایو ادمین'];
      
      const targetTickets = reportTicketStatus === 'all' ? tickets : tickets.filter(t => t.status === reportTicketStatus);
      rows = targetTickets.map(t => [
        t.id,
        t.userName || t.createdBy || 'مشتری اِیزی درایور',
        t.subject,
        TICKET_CATEGORY_LABELS[t.category] || t.category,
        PRIORITY_LABELS[t.priority] || t.priority,
        TICKET_STATUS_LABELS[t.status] || t.status,
        new Date(t.createdDate).toLocaleDateString('fa-IR'),
        t.adminReply || 'فاقد پاسخ'
      ]);
    } else if (type === 'reviews') {
      filename = `گزارش_امتیازات_و_بازخوردهای_سایت_${new Date().toLocaleDateString('fa-IR')}.csv`;
      headers = ['شناسه بازخورد', 'نام ثبت‌کننده', 'امتیاز مربوطه (از ۵)', 'خدمات مربوطه', 'متن دیدگاه مشتری', 'وضعیت تایید و انتشار', 'تاریخ ایجاد دیدگاه'];
      
      const targetReviews = reportReviewApproved === 'all' 
        ? reviews.filter(r => !r.isRejected) 
        : reviews.filter(r => reportReviewApproved === 'approved' ? r.isApproved : (!r.isApproved && !r.isRejected));
      
      rows = targetReviews.map(r => [
        r.id,
        r.customerName,
        `${r.rating} ستاره`,
        SERVICE_LABELS[r.serviceType as any] || r.serviceType || 'سرویس عمومی',
        r.comment,
        r.isApproved ? 'منتشر شده' : 'در انتظار بررسی',
        new Date(r.createdDate).toLocaleDateString('fa-IR')
      ]);
    }

    if (rows.length === 0) {
      alert("هیچ رکوردی منطبق با این فیلتر جهت خروجی یافت نشد!");
      return;
    }

    // Append UTF-8 BOM so Persian is parsed natively by Microsoft Excel
    const delimiter = ",";
    const csvContent = "\uFEFF" + [
      headers.join(delimiter),
      ...rows.map(row => row.map(val => {
        // Wrap cells in quotes and escape nested quotes
        const cleaned = (val || '').toString().replace(/"/g, '""');
        return `"${cleaned}"`;
      }).join(delimiter))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Triggers print operation with delay to ensure dom hydration
  const triggerPrintLayout = (type: 'requests' | 'technicians' | 'tickets' | 'reviews') => {
    setCurrentPrintType(type);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Delete customer review
  const handleDeleteReview = (id: string) => {
    const rev = reviews.find(r => r.id === id);
    if (rev) {
      updateReview({
        ...rev,
        isApproved: false,
        isRejected: true,
      });
    } else {
      deleteReview(id);
    }
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

  const handleAdminFileChange = async (e: React.ChangeEvent<HTMLInputElement>, ticketId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAdminUploading(prev => ({ ...prev, [ticketId]: true }));

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              base64Data: base64Data
            })
          });
          const data = await res.json();
          if (data.success && data.url) {
            addTicketMessage(
              ticketId, 
              `ATTACHMENT_FILE:${file.name} url:${data.url}\nفایل ضمیمه پشتیبان: ${file.name}`, 
              'admin'
            );
          } else {
            alert("خطا در بارگذاری فایل: " + (data.error || "خطای ناخواسته"));
          }
        } catch (err) {
          console.error("Admin upload error:", err);
          alert("خطا در ارتباط با سرور چت و آپلود.");
        } finally {
          setIsAdminUploading(prev => ({ ...prev, [ticketId]: false }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Reader error:", err);
      setIsAdminUploading(prev => ({ ...prev, [ticketId]: false }));
    }
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
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              دسترسی به این پنل مدیریت صرفاً برای مدیر سیستم فعال می‌باشد. لطفاً با حساب کاربری ادمین معتبر وارد شوید.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderAdminTicketMessage = (msgText: string) => {
    if (!msgText) return null;
    const uploadRegex = /\/uploads\/[^\s)"]+/i;
    const match = msgText.match(uploadRegex);
    
    if (match) {
      const fileUrl = match[0];
      let displayName = "فایل ضمیمه شده";
      const nameMatch = msgText.match(/ATTACHMENT_FILE:([^\s]+)/);
      if (nameMatch) {
        displayName = nameMatch[1];
      } else {
        displayName = fileUrl.split('/').pop()?.split('_')[0] || "فایل";
      }
      
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl);
      
      return (
        <div className="mt-1.5 flex flex-col items-start gap-1 p-2 bg-slate-105 rounded-lg max-w-sm border text-right inline-block" dir="rtl">
          {msgText.includes('\n') && (
            <span className="text-[10px] text-slate-500 block mb-1 font-semibold">
              {msgText.split('\n')[1] || "فایل ضمیمه شده"}
            </span>
          )}
          {isImage ? (
            <div className="rounded border bg-white overflow-hidden max-w-[160px] shadow-xs">
              <img 
                src={fileUrl} 
                alt={displayName} 
                className="max-h-24 object-contain w-full cursor-pointer hover:brightness-95 transition-all"
                referrerPolicy="no-referrer"
                onClick={() => window.open(fileUrl, '_blank')}
              />
              <div className="p-1.5 bg-slate-50 text-[8px] text-slate-400 flex justify-between items-center gap-2 font-mono">
                <span className="truncate max-w-[90px]">{displayName}</span>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-extrabold hover:underline">دانلود</a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-700 bg-white p-1 rounded border">
              <span className="font-extrabold text-blue-600">📎 فایل:</span>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="hover:underline font-mono truncate max-w-[130px] font-bold">{displayName}</a>
            </div>
          )}
        </div>
      );
    }
    
    return <span className="font-normal text-slate-600 mr-1">{msgText}</span>;
  };

  return (
    <div className="font-sans min-h-screen bg-slate-50 py-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title cap banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-205 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-sm">
              <Clipboard className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-rose-650 font-black tracking-widest uppercase block">ادمین استودیو EasyDriver</span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">پنل جامع مدیریت خدمات تعمیراتی</h1>
            </div>
          </div>

          {/* Dynamic Floating Database Connectivity Status Indicator */}
          <div className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all duration-300 shadow-md ${
            dbInfo?.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100/40'
              : 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100/45'
          }`}>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dbInfo?.connected ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                dbInfo?.connected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
            </span>

            <div className="text-[10px]">
              <div className="font-extrabold flex items-center gap-1.5 justify-start">
                <span className="text-slate-500">وضعیت پایگاه داده:</span>
                <span className={`font-black uppercase flex items-center gap-1 ${dbInfo?.connected ? 'text-emerald-700' : 'text-rose-650'}`}>
                  {dbInfo?.connected ? 'برخط (MySQL🟢)' : 'محلی (Local JSON Backup🔴)'}
                </span>
              </div>
              <div className="text-[9px] text-slate-550 mt-0.5 font-mono leading-none" dir="ltr">
                host: <strong className="text-slate-800">{dbInfo?.host || 'تعریف نشده'}</strong> | db: <strong className="text-slate-800">{dbInfo?.database || 'تعریف نشده'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Core Admin Navigation Grid tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-8">
          {[
            { id: 'overview', label: 'داشبورد خلاصه آمار', icon: Grid },
            { id: 'requests', label: 'مدیریت درخواست‌ها', icon: Clipboard, badge: pendingRequests },
            { id: 'technicians', label: 'تعریف تکنسین‌ها (CRUD)', icon: Users },
            { id: 'tickets', label: 'تیکت‌های باز پشتیبانی', icon: MessageSquare, badge: openTicketsCount },
            { id: 'reviews', label: 'تایید نظرات کاربران', icon: Star, badge: pendingReviewsCount },
            { id: 'db', label: 'پایگاه داده (MySQL)', icon: Database, badge: dbInfo?.connected ? 0 : 0 },
            { id: 'reports', label: 'خروجی اکسل و PDF', icon: Printer },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`py-3 px-3 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/15'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ${
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

              {/* Service Types Demand Distribution Bar Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xxs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3 text-right">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 justify-start">
                      <BarChart3 className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                      <span>نمودار تحلیل تقاضای انواع خدمات فنی (Service Type Demands)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">تعداد تقاضا به تفکیک حوزه کاری در بازه زمانی تعیین‌شده جهت پایش لود کاری تکنسین‌ها</p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    {/* Interval Dropdown Toggle */}
                    <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-[10px] font-black">
                      <button
                        type="button"
                        onClick={() => setChartInterval('weekly')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          chartInterval === 'weekly'
                            ? 'bg-rose-600 text-white shadow-xxs'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        هفتگی (۷ روز اخیر)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartInterval('monthly')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          chartInterval === 'monthly'
                            ? 'bg-rose-600 text-white shadow-xxs'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        ماهانه (۳۰ روز اخیر)
                      </button>
                    </div>

                    <div className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-705 text-[10px] font-extrabold rounded-lg leading-none">
                      سفارشات این بازه: {serviceStatsData.reduce((acc, curr) => acc + curr.value, 0)} مورد
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full text-xs font-semibold" dir="ltr">
                  <ResponsiveContainer width="100%" height="105%">
                    <RechartsBarChart
                      data={serviceStatsData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(244, 63, 94, 0.04)' }}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          border: 'none',
                          fontSize: '11px',
                          fontFamily: 'sans-serif',
                          textAlign: 'right',
                        }}
                      />
                      <RechartsBar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {serviceStatsData.map((entry, index) => {
                          const colors = ['#f43f5e', '#6366f1', '#a855f7', '#06b6d4'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </RechartsBar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick instructions panel */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-right">
                <div className="md:col-span-2 space-y-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-855 flex items-center gap-1.5">
                    <Info className="h-5 w-5 text-indigo-505" />
                    <span>راهنمای پیشخوان مدیریت ایزی‌درایور (EasyDriver Central)</span>
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    شما در حال بررسی پنل مرکزی مدیریت سرویس‌ها، تیکت‌ها و اختصاص کارشناسان فنی EasyDriver با دسترسی کامل به تمامی عملیات سیستمی هستید. در این بخش می‌توانید به سرعت درخواست‌های دریافتی جدید را بررسی کرده، هماهنگی‌های ریموت یا حضوری تکنسین‌ها را زمان‌بندی کنید، تیکت‌های پشتیبانی زنده را پاسخ دهید و آمار نهایی رضایت کاربران را تایید و مشاهده فرمایید.
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-850">فهرست کل درخواست‌های خدمات فنی</h3>
                
                {/* Select All Toggle button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAllRequests}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRequestIds.length === requests.length && requests.length > 0}
                      onChange={() => {}} // handled by click
                      className="h-3.5 w-3.5 rounded text-rose-650 cursor-pointer pointer-events-none"
                    />
                    <span>{selectedRequestIds.length === requests.length && requests.length > 0 ? "لغو انتخاب همه" : "انتخاب گروهی همه"}</span>
                  </button>
                  {selectedRequestIds.length > 0 && (
                    <button
                      onClick={() => setSelectedRequestIds([])}
                      className="text-rose-600 hover:text-rose-700 text-[10px] font-extrabold cursor-pointer"
                    >
                      (لغو انتخاب {selectedRequestIds.length} مورد)
                    </button>
                  )}
                </div>
              </div>

              {requests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">هیچ درخواستی در سیستم وجود ندارد.</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const isExpanded = expandedRequestId === req.id;
                    const isSelected = selectedRequestIds.includes(req.id);
                    return (
                      <div key={req.id} className={`bg-white border rounded-2xl overflow-hidden text-right transition-all duration-300 ${
                        isSelected ? 'border-rose-300 ring-1 ring-rose-200/50 shadow-xxs' : 'border-slate-200'
                      }`}>
                        
                        {/* Interactive toggle header */}
                        <div
                          onClick={() => {
                            setExpandedRequestId(isExpanded ? null : req.id);
                            setAdminNotesInput(req.adminNotes || '');
                          }}
                          className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors ${
                            isSelected ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3.5 grow">
                            {/* Row selection check element */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleRequestSelection(req.id)}
                              className="h-4.5 w-4.5 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer shrink-0"
                            />

                            <div className="space-y-1 grow">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] bg-slate-100 font-mono text-slate-600 px-1.5 rounded font-bold">#{req.id}</span>
                                <motion.span
                                  key={`${req.id}-${req.status}`}
                                  initial={{ scale: 0.9, opacity: 0.8 }}
                                  animate={{ scale: 1, opacity: 1, filter: ["brightness(1.5)", "brightness(1)"] }}
                                  transition={{ duration: 0.45 }}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[req.status]}`}
                                >
                                  {STATUS_LABELS[req.status]}
                                </motion.span>
                                <span className="text-xs font-black text-slate-800 mr-1">{SERVICE_LABELS[req.serviceType]}</span>
                              </div>
                              <div className="text-slate-450 text-[10px] flex items-center gap-2 pt-1 font-semibold">
                                <span>ثبت‌کننده: {req.fullName}</span>
                                <span>•</span>
                                <span>تماس: {req.phone}</span>
                              </div>
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

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const recs = getRecommendations(req);
                                      if (recs && recs.length > 0) {
                                        const bestTech = recs[0].tech;
                                        setAssignedTechOverride(prev => ({ ...prev, [req.id]: bestTech.id }));
                                      }
                                    }}
                                    className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse shrink-0" />
                                    <span>پیشنهاد هوشمند (ارجاع خودکار برترین نیرو)</span>
                                  </button>
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
                                              <span 
                                                className={`h-2 w-2 rounded-full shrink-0 ${
                                                  tech.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                                }`}
                                              />
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

                                  {/* Smart recommendation scoring system Audit Log section */}
                                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-2 mt-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                      <span className="text-[9px] font-extrabold text-indigo-900 flex items-center gap-1.5 leading-none">
                                        <FileCodeIcon className="h-3.5 w-3.5 text-indigo-600 animate-pulse shrink-0" />
                                        <span>سیاهه ارزیابی نمرات هوشمند (Recommendation Engine Audit Log)</span>
                                      </span>
                                      <span className="text-[7.5px] bg-indigo-50 text-indigo-650 font-bold px-1.5 py-0.5 rounded leading-none">
                                        تطابق ریاضی (Max 115)
                                      </span>
                                    </div>

                                    <div className="space-y-2.5 divide-y divide-slate-100">
                                      {getRecommendations(req).slice(0, 3).map(({ tech, avgRating, totalScore, activeTasksCount, matchPercentage }) => {
                                        const specSc = tech.specialty === req.serviceType ? 60 : (tech.specialty === 'all' ? 40 : 15);
                                        const ratSc = avgRating * 8;
                                        const loadPen = activeTasksCount * 12;
                                        const availSc = tech.isActive ? 20 : -60;
                                        return (
                                          <div key={`audit-log-${tech.id}`} className="pt-2.5 first:pt-0 text-[10px] space-y-1">
                                            <div className="flex justify-between items-center font-bold">
                                              <span className="text-slate-800">{tech.fullName}</span>
                                              <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1 rounded">
                                                خلاصه: {totalScore.toFixed(0)} امتیاز ({matchPercentage}%)
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[8.5px] text-slate-500 pt-1 font-semibold">
                                              <div className="flex justify-between items-center text-right">
                                                <span>انطباق رسته تخصص:</span>
                                                <span className="text-emerald-700 font-bold text-left">+{specSc} امتیازی ({tech.specialty === 'all' ? 'عمومی' : SPECIALTY_LABELS[tech.specialty]})</span>
                                              </div>
                                              <div className="flex justify-between items-center text-right">
                                                <span>شاخص رضایتمندی:</span>
                                                <span className="text-emerald-700 font-bold text-left">+{ratSc.toFixed(1)} (ستاره {avgRating.toFixed(1)})</span>
                                              </div>
                                              <div className="flex justify-between items-center col-span-2 sm:col-span-1 text-right">
                                                <span className="truncate">جریمه حجم کار فعال:</span>
                                                <span className={loadPen > 0 ? "text-rose-600 font-bold text-left" : "text-emerald-700 font-bold text-left"}>
                                                  -{loadPen} امتیاز ({activeTasksCount} تسک)
                                                </span>
                                              </div>
                                              <div className="flex justify-between items-center col-span-2 sm:col-span-1 text-right">
                                                <span className="truncate">وضعیت آنلاین/آمادگی:</span>
                                                <span className={tech.isActive ? "text-emerald-700 font-bold text-left" : "text-rose-600 font-bold text-left"}>
                                                  {availSc > 0 ? `+${availSc}` : availSc} امتیاز ({tech.isActive ? 'آنلاین' : 'آفلاین'})
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>

                                {/* 3. Notes block & Scheduled connection */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5">یادداشت کارشناسان و مدیریت</h4>
                                  <div className="space-y-2">
                                    <textarea
                                      value={adminNotesInput}
                                      onChange={(e) => setAdminNotesInput(e.target.value)}
                                      placeholder="محل یادداشت آی‌دی انی‌دسک، کارهای انجام شده و تذکرات لایسنس..."
                                      rows={3}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                                    />
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

                              </div>

                              {/* Customer Desktop documentation & Time Logs row */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-150">
                                {/* Desktop screenshots list */}
                                <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 text-right">
                                  <h5 className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                    <Camera className="h-4 w-4 text-purple-600" />
                                    <span>مستندات محیط دسکتاپ مشتری</span>
                                  </h5>
                                  {!req.desktopScreenshots || req.desktopScreenshots.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 py-4 text-center">عکسی توسط تکنسین در حین کار ثبت نشده است.</p>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                      {req.desktopScreenshots.map((scr, sIdx) => (
                                        <div key={sIdx} className="group relative border border-slate-200 rounded-lg overflow-hidden h-14 bg-slate-50">
                                          <img
                                            src={scr}
                                            alt="Desktop screenshot"
                                            className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                                            onClick={() => setSelectedFullScreenImage(scr)}
                                          />
                                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-[8px] text-white text-center font-mono py-0.5">#{sIdx + 1}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                              {/* Time spent logging details */}
                              <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 text-right">
                                <h5 className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                  <Clock className="h-4 w-4 text-emerald-600" />
                                  <span>گزارش زمان کارکرد تکنسین</span>
                                </h5>
                                <div className="flex items-center justify-between py-2">
                                  <span className="text-[10px] text-slate-500 font-semibold">مدت زمان صرف شده:</span>
                                  <span className="text-sm font-black text-slate-800 font-mono bg-slate-100 px-3 py-1 rounded-lg">
                                    {req.loggedDurationMinutes || 0} دقیقه
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 leading-normal">
                                  این زمان توسط کارشناس در حین عیب‌یابی در کارت کار ثبت شده و جهت تصفیه حساب با تکنسین استفاده می‌شود.
                                </p>
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
                                    updatedDate: new Date().toISOString()
                                  };
                                  updateRequest(updatedReq);
                                  alert('تغییرات با موفقیت ذخیره شد.');
                                }}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white leading-none rounded-lg font-bold text-xs cursor-pointer"
                              >
                                ثبت بروزرسانی
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

          {/* TAB 3: TECHNICIANS CRUD */}
          {adminTab === 'technicians' && (
            <div className="space-y-4 text-right">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200 font-sans">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-850">مدیریت همکاران و تکنسین‌های ریموت</h3>
                <button
                  onClick={() => {
                    setEditingTechId(null);
                    setTechName('');
                    setTechPhone('');
                    setTechEmail('');
                    setTechPassword('');
                    setTechSpecialty('all');
                    setTechIsActive(true);
                    setTechCertificationLevel('Junior');
                    setShowAddTechForm(!showAddTechForm);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{showAddTechForm ? 'بستن فرم ثبت' : 'اضافه کردن تکنسین جدید'}</span>
                </button>
              </div>

              {showAddTechForm && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <h4 className="font-extrabold text-xs text-indigo-950">
                    {editingTechId ? 'فرم ویرایش اطلاعات و کلمه عبور همکار' : 'فرم ثبت نام همکار فنی جدید'}
                  </h4>

                  <form onSubmit={handleSaveTechnician} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                      
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">نام و نام خانوادگی</label>
                        <input
                           type="text"
                           required
                           value={techName}
                           onChange={(e) => setTechName(e.target.value)}
                           placeholder="مثال: مهندس عادلی"
                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
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
                           placeholder="مثال: 09121234567"
                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-left text-xs outline-none font-mono"
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
                           className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-left outline-none font-mono"
                        />
                      </div>

                      {/* Specialty */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">تخصص اصلی</label>
                        <select
                           value={techSpecialty}
                           onChange={(e) => setTechSpecialty(e.target.value as TechnicianSpecialty)}
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        >
                          {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Certification Level */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">سطح گواهی گرید</label>
                        <select
                           value={techCertificationLevel}
                           onChange={(e) => setTechCertificationLevel(e.target.value as 'Junior' | 'Senior' | 'Expert')}
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none font-bold text-indigo-700"
                        >
                          <option value="Junior">Junior (جونیور)</option>
                          <option value="Senior">Senior (سینیور)</option>
                          <option value="Expert">Expert (اکسپرت و حرفه ای)</option>
                        </select>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 block">رمز عبور ورود به سامانه</label>
                        <input
                           type="text"
                           required
                           value={techPassword}
                           onChange={(e) => setTechPassword(e.target.value)}
                           placeholder="مثال: 09121234567"
                           className="w-full px-3 py-2 bg-white border border-indigo-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-bold text-indigo-900 font-mono"
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-between border-t border-slate-150 pt-3 flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={techIsActive}
                          onChange={(e) => setTechIsActive(e.target.checked)}
                          className="h-4 w-4 accent-rose-600 rounded select-none cursor-pointer"
                        />
                        <span>تکنسین فعال و آماده پذیرش پروژه ریموت است</span>
                      </label>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {editingTechId ? 'بروزرسانی تغییرات همکار' : 'ثبت نام و ایجاد حساب'}
                      </button>
                    </div>

                  </form>
                </div>
              )}


              {/* Grid cards display of Technicians lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {technicians.map((tech) => {
                  const stats = calculateTechnicianStats(tech, requests, reviews);
                  const techReviews = (reviews || []).filter(
                    (r) => r.technicianId === tech.id || (!r.technicianId && tech.id === 'tech-1')
                  );

                  return (
                    <div key={tech.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xxs text-right flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        
                        {/* Name status cap */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Online / Offline status indicator */}
                            <span 
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                tech.isActive 
                                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
                                  : 'bg-slate-300'
                              }`}
                              title={tech.isActive ? 'آنلاین (آماده کار)' : 'آفلاین'}
                            />
                            <h4 className="font-extrabold text-sm text-slate-850">{tech.fullName}</h4>
                            <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-1.5 py-0.2 rounded-md font-mono flex items-center gap-0.5 shadow-sm border border-amber-100">
                              <Trophy className="h-3 w-3 text-amber-500" />
                              {stats.totalPoints} PTS
                            </span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            tech.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {tech.isActive ? 'فعال و آزاد جهت ریموت' : 'غیرفعال / درانتظار تایید'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-500 font-normal">
                          <p>تخصص اصلی: <span className="font-bold text-slate-700">{SPECIALTY_LABELS[tech.specialty]}</span></p>
                          <p className="font-mono">تلفن: {tech.phone}</p>
                          {tech.email && <p className="font-mono">ایمیل: {tech.email}</p>}
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold pt-1">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            <span>میانگین رضایت: {stats.averageRating} از ۵ ({techReviews.length} بازخورد مشتری)</span>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-500 block font-bold">تعداد کل کارهای بسته شده: {stats.fastResponseCount + tech.completedTasks} خدمت</span>
                            <div className="flex items-center gap-1.5">
                              {tech.certificationLevel && (
                                <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                                  tech.certificationLevel === 'Expert'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-xxs animate-pulse'
                                    : tech.certificationLevel === 'Senior'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-slate-100 text-slate-750 border border-slate-200'
                                }`}>
                                  گرید: {tech.certificationLevel}
                                </span>
                              )}
                              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-extrabold">سطح: {stats.levelName.split(' ')[0]}</span>
                            </div>
                          </div>
                          
                          {/* Mini progress bar */}
                          <div className="mt-2 space-y-1">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${stats.progressPercent}%` }} />
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono block text-left">سطح {stats.level} • {stats.progressPercent}% تا ارتقا رده</span>
                          </div>
                        </div>

                      </div>


                    {/* Action buttons modifiers for CRUD */}
                    <div className="pt-3.5 border-t border-slate-100 flex justify-end gap-2 text-xxs font-black flex-wrap">
                      {!tech.isActive ? (
                        <>
                          <button
                            onClick={() => {
                              updateTechnician({
                                ...tech,
                                isActive: true,
                              });
                              const registered = JSON.parse(localStorage.getItem('ed_registered_users') || '[]');
                              const idx = registered.findIndex((u: any) => u.id === tech.id || u.email?.toLowerCase() === tech.email?.toLowerCase());
                              if (idx >= 0) {
                                registered[idx].isActive = true;
                                localStorage.setItem('ed_registered_users', JSON.stringify(registered));
                                
                                // PUT updated user back to backend DB so it persists
                                fetch(`/api/users/${registered[idx].id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(registered[idx])
                                })
                                .then(() => { if (loadFreshData) loadFreshData(); })
                                .catch(err => console.error("Error updating user on backend DB during activation:", err));
                              } else {
                                // If not found in local localStorage, we should still call backend PUT for user table to activate
                                fetch(`/api/users/${tech.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ is_active: 1 })
                                })
                                .then(() => { if (loadFreshData) loadFreshData(); });
                              }
                            }}
                            className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-sm animate-pulse"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>تایید و فعال‌سازی</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`آیا مایلید درخواست همکاری تکنسین «${tech.fullName}» را رد و حساب وی را دائم حذف نمایید؟`)) {
                                deleteTechnician(tech.id);
                              }
                            }}
                            className="p-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>رد درخواست</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm(`آیا مایلید حساب کاربری تکنسین «${tech.fullName}» را غیرفعال و معلق نمایید؟`)) {
                              updateTechnician({
                                ...tech,
                                isActive: false,
                              });
                              const registered = JSON.parse(localStorage.getItem('ed_registered_users') || '[]');
                              const idx = registered.findIndex((u: any) => u.id === tech.id || u.email?.toLowerCase() === tech.email?.toLowerCase());
                              if (idx >= 0) {
                                registered[idx].isActive = false;
                                localStorage.setItem('ed_registered_users', JSON.stringify(registered));
                                
                                // PUT updated user back to backend DB so it persists
                                fetch(`/api/users/${registered[idx].id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(registered[idx])
                                })
                                .then(() => { if (loadFreshData) loadFreshData(); })
                                .catch(err => console.error("Error updating user on backend DB during deactivation:", err));
                              } else {
                                // Fallback: PUT directly to backend user table to deactivate
                                fetch(`/api/users/${tech.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ is_active: 0 })
                                })
                                .then(() => { if (loadFreshData) loadFreshData(); });
                              }
                            }
                          }}
                          className="p-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          <span>غیرفعال‌سازی و تعلیق</span>
                        </button>
                      )}

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
                              <div className="text-slate-650 leading-relaxed font-normal">
                                {renderAdminTicketMessage(t.message)}
                              </div>
                            </div>

                            {/* Historic replies display list */}
                            {t.messages && t.messages.length > 1 && (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold block">تاریخچه چت / پاسخ‌های ثبت شده:</span>
                                
                                <div className="space-y-2.5 max-h-40 overflow-y-auto p-1 bg-white border border-slate-100 rounded-xl pr-3">
                                  {t.messages.map((m) => (
                                    <div key={m.id} className="text-[11px] leading-relaxed py-1 border-b border-dashed border-slate-100 last:border-0">
                                      <strong className={m.senderRole === 'admin' ? 'text-blue-700 font-extrabold' : 'text-indigo-650 font-bold'}>
                                        {m.senderName} ({m.senderRole === 'admin' ? 'مدیر' : 'کاربر'}):
                                      </strong>
                                      <div className="mr-1 mt-0.5">
                                        {renderAdminTicketMessage(m.message)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Admin Replier Input Form */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 block">نوشتن پاسخ جدید برای ارسال پیام آنلاین:</label>
                                <label className="text-[10px] text-indigo-600 flex items-center gap-1 cursor-pointer hover:underline font-bold">
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleAdminFileChange(e, t.id)}
                                    disabled={isAdminUploading[t.id]}
                                    accept="image/*,.pdf,.txt,.zip,.rar"
                                  />
                                  {isAdminUploading[t.id] ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                      <span>درحال بارگذاری فایل...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span>پیوست و ارسال سریع فایل</span>
                                    </>
                                  )}
                                </label>
                              </div>
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

              {reviews.filter(r => !r.isApproved && !r.isRejected).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-400">هیچ دیدگاه تازه معلقی در انتظار تایید وجود ندارد!</div>
              ) : (
                <div className="space-y-3">
                  {reviews.filter(r => !r.isApproved && !r.isRejected).map((rev) => (
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

          {/* TAB 6: DATABASE MANAGEMENT (MySQL & phpMyAdmin Setup Console Guide) */}
          {adminTab === 'db' && (
            <div className="space-y-6">
              {/* Real-Time Database Connection Statistics Panel */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-850 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-rose-400">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span>پیشخوان مانیتورینگ زنده پایگاه داده (Real-time DB Connection Statistics)</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">پایش بی‌وقفه ترافیک اتصالات استخر کوئری‌ها، پردازش‌ها و وضعیت سلامت سرور اصلی</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-lg border border-slate-700">
                      بروزرسانی زنده: هر ۵ ثانیه
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase ${
                      dbInfo?.connected
                        ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-400'
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-400'
                    }`}>
                      {dbInfo?.connected ? 'MySQL Live' : 'SQLite/Local DB'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  
                  {/* Gauge Chart representing Connection Pool Load */}
                  <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 h-56">
                    <span className="text-[10px] font-bold text-slate-400">لود استخر اتصالات (Pool Capacity)</span>
                    
                    {/* SVG Gauge Chart */}
                    <div className="relative w-36 h-24 flex items-center justify-center overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 60">
                        {/* Background track */}
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="#334155"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        {/* Interactive dynamic status stroke */}
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="url(#gaugeGradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="125.6"
                          // Active percent out of 10 limit: default mapping
                          strokeDashoffset={125.6 - (125.6 * (Math.min(10, dbInfo?.activeConnections || 1) / 10))}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        {/* Text labels */}
                        <text x="50" y="44" textAnchor="middle" className="fill-white font-black text-[12px]">
                          {(((dbInfo?.activeConnections || 1) / (dbInfo?.poolLimit || 10)) * 100).toFixed(0)}%
                        </text>
                      </svg>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[12px] font-extrabold text-slate-200">
                        {dbInfo?.activeConnections || 0} از {dbInfo?.poolLimit || 10} اتصال فعال
                      </span>
                      <p className="text-[8px] text-slate-500">تعداد کلاینت‌های موازی متصل در ثانیه به کانکشن پول</p>
                    </div>
                  </div>

                  {/* Micro Statistics Cards */}
                  <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                    {/* Card 1: Active Queries */}
                    <div className="bg-slate-950/20 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between text-right space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-extrabold">پردازش‌های فعال (Active Queries)</span>
                        <Timer className="h-4 w-4 text-rose-500 animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      <div className="py-2">
                        <strong className="text-2xl font-black text-white font-mono block">
                          {dbInfo?.activeQueries || 0} <span className="text-xs text-rose-450">کوئری/ثانیه</span>
                        </strong>
                      </div>
                      <p className="text-[8px] text-slate-500">پردازش‌های همزمان فعال در صف تراکنش‌ها</p>
                    </div>

                    {/* Card 2: Total queries count */}
                    <div className="bg-slate-950/20 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between text-right space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-extrabold">تعداد کل درخواست‌ها (Lifetime)</span>
                        <Globe className="h-4 w-4 text-indigo-400 animate-pulse" />
                      </div>
                      <div className="py-2">
                        <strong className="text-2xl font-black text-white font-mono block">
                          {dbInfo?.totalQueries || 0} <span className="text-xs text-indigo-400">ارتباط</span>
                        </strong>
                      </div>
                      <p className="text-[8px] text-slate-500">مجموع کوئری‌های ثبت شده از زمان بوت سرور</p>
                    </div>

                    {/* Card 3: Server Uptime */}
                    <div className="bg-slate-950/20 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between text-right space-y-1 col-span-2 lg:col-span-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-400 font-extrabold">مدت زمان فعالیت (Server Uptime)</span>
                        <Clock className="h-4 w-4 text-emerald-450 animate-pulse" />
                      </div>
                      <div className="py-2">
                        <strong className="text-xs font-black text-emerald-400 block font-mono leading-tight whitespace-normal">
                          {(() => {
                            const uptime = dbInfo?.uptimeSeconds || 0;
                            const h = Math.floor(uptime / 3600);
                            const m = Math.floor((uptime % 3600) / 60);
                            const s = uptime % 60;
                            return `${h} ساعت و ${m} دقیقه و ${s} ثانیه`;
                          })()}
                        </strong>
                      </div>
                      <p className="text-[8px] text-slate-500">زمان روشن بودن ممتد سرویس دسکتاپ پس‌زمینه</p>
                    </div>

                    {/* Meta stats detail */}
                    <div className="col-span-2 lg:col-span-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-slate-400 text-[9px] flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <strong>میزبان سرویس:</strong>
                        <span className="font-mono text-slate-300">{dbInfo?.host || 'تعریف نشده'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong>نام دیتابیس سیستمی:</strong>
                        <span className="font-mono text-slate-300">{dbInfo?.database || 'تعریف نشده'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong>استخر اتصالات:</strong>
                        <span className="text-emerald-400 font-bold font-mono">Idle: {dbInfo?.idleConnections || 10} | Max: {dbInfo?.poolLimit || 10}</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-right space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Database className="h-5 w-5 text-rose-600" />
                      <span>مدیریت پایگاه داده MySQL و اتصال به phpMyAdmin</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">پروژه EasyDriver مجهز به سیستم ذخیره‌سازی همگام دوگانه است.</p>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 self-start ${
                    dbInfo?.connected
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                  }`}>
                    <Server className="h-4 w-4" />
                    <div className="text-right">
                      <span className="block text-[8px] opacity-75">حالت اتصال فعلی:</span>
                      <span className="block text-[10px] font-black">{dbInfo?.mode || "درحال بررسی..."}</span>
                    </div>
                  </div>
                </div>

                {dbInfo?.error && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] leading-relaxed flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>پشتیبان محلی فعال است:</strong> {dbInfo.error} پروژه در حال حاضر بدون مشکل تمام اطلاعات و تغییرات را روی فایل پشتیبان محلی (local_db.json) به صورت زنده ذخیره می‌کند و آماده انتقال به هاست شماست.</span>
                  </div>
                )}

                {/* Real-time DB Connection Pool Health Inspector Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 text-right space-y-4 shadow-xxs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-650 animate-pulse" />
                        <span>سیستم بازرسی زنده و تست سلامت سوکت (MySQL Port Audit Console)</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        برای تست زنده ارتباط هم‌اکنون می‌توانید کوئری سلامت‌سنجی مستقیم به سرور پایگاه داده راه دور ارسال کنید.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProbingDb(true);
                        fetch("/api/db-health")
                          .then(res => res.json())
                          .then(data => {
                            setProbeResult({
                              ...data,
                              timestamp: new Date().toLocaleTimeString('fa-IR'),
                            });
                            // Also update dbStatus in parents if successful
                            if (data.connected && data.healthy) {
                              setDbInfo(prev => prev ? { ...prev, connected: true } : null);
                            }
                          })
                          .catch(err => {
                            setProbeResult({
                              healthy: false,
                              connected: false,
                              mode: "فایل محلی پشتیبان (Local JSON Backup)",
                              error: err.message || "پینگ پاسخ‌دهی ناموفق بود.",
                              host: dbInfo?.host || "تعریف نشده",
                              database: dbInfo?.database || "تعریف نشده",
                              probeLog: `اتصال غیرممکن است: ${err.message}`,
                              timestamp: new Date().toLocaleTimeString('fa-IR')
                            } as any);
                          })
                          .finally(() => {
                            setProbingDb(false);
                          });
                      }}
                      disabled={probingDb}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-white shrink-0 ${
                        probingDb
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-indigo-650 hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200 cursor-pointer"
                      }`}
                    >
                      {probingDb ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>در حال اجرای تست زنده...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>شروع آنالیز و سلامت‌سنجی پورت</span>
                        </>
                      )}
                    </button>
                  </div>

                  {probeResult && (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 transition-all duration-300 ${
                      probeResult.healthy
                        ? 'bg-emerald-50 border-emerald-100/70 text-emerald-900'
                        : 'bg-rose-50 border-rose-100/70 text-rose-950'
                    }`}>
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2 font-bold opacity-90">
                        <span className="flex items-center gap-1.5">
                          {probeResult.healthy ? '🟢 تست موفق:' : '🔴 تست با خطا مواجه شد:'}
                          <span>{probeResult.healthy ? 'ارتباط با MySQL پایدار و فعال است!' : 'عدم برقراری ارتباط با پورت MySQL'}</span>
                        </span>
                        <span className="text-[10px] font-mono bg-white/55 px-2 py-0.5 rounded">
                          ساعت تست: {probeResult.timestamp}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-[11px] font-semibold">
                        <div className="space-y-1.5">
                          <p>
                            <strong>میزبان پایگاه داده:</strong> <code className="bg-white/60 px-1.5 py-0.5 rounded font-mono text-[10px]">{probeResult.host}</code>
                          </p>
                          <p>
                            <strong>نام دیتابیس هماهنگ:</strong> <code className="bg-white/60 px-1.5 py-0.5 rounded font-mono text-[10px]">{probeResult.database}</code>
                          </p>
                          <p>
                            <strong>حالت عملیاتی لایه داده:</strong> <span className="underline decoration-indigo-200">{probeResult.mode}</span>
                          </p>
                        </div>
                        <div className="space-y-1.5 md:border-r border-slate-200/50 md:pr-4">
                          <p>
                            <strong>گزارش مستقیم لاگ سوکت:</strong>
                            <span className="block text-[10px] mt-1 bg-white/70 p-2 rounded border border-slate-100 leading-normal font-mono text-slate-800">
                              {probeResult.probeLog || "توضیحی در دسترس نیست."}
                            </span>
                          </p>
                        </div>
                      </div>

                      {!probeResult.healthy && (
                        <div className="pt-2 border-t border-rose-100 space-y-2 mt-1">
                          <p className="text-[10px] text-rose-800 font-extrabold flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span>توصیه فنی جهت رفع مشکل دامنه easydriver.shop و دیتابیس:</span>
                          </p>
                          <div className="text-[9.5px] text-rose-700 space-y-1 leading-normal list-decimal pr-4">
                            <p>۱. اگر دیتابیس روی هاست همین دامنه است، <strong>DB_HOST</strong> را برابر با <code className="bg-rose-100/80 px-1 py-0.5 rounded font-mono">localhost</code> قرار دهید.</p>
                            <p>۲. یوز دیتابیس و نام دیتابیس را در سی پنل چک کنید که دقیقاً <strong>easydri1_mmd</strong> باشند (بدون فاصله یا کاراکتر اشتباه).</p>
                            <p>۳. رمز عبور دیتابیس شما <strong>09386561626mM@</strong> تنظیم گردیده که لازم است آن را حتماً در تب MySQL Users به کاربر متصل کنید و گزینه <strong>ALL PRIVILEGES</strong> را تیک بزنید.</p>
                            <p>۴. در صورتی که هاست شما دیتابیس را به عنوان ریموت می‌گیرد، آی‌پی سرور این اپلیکیشن را در بخش <strong>Remote MySQL</strong> پنل هاست خود مجاز (Whitelist) کنید.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800">آموزش گام‌به‌گام اتصال پروژه به phpMyAdmin و میزبانی:</h4>
                    
                    <div className="space-y-3 text-xs text-slate-650 leading-relaxed font-normal">
                      <div className="flex gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 font-extrabold flex items-center justify-center shrink-0">۱</div>
                        <p>
                          <strong>ساخت پایگاه داده در سی‌پنل/هاست:</strong> وارد پنل هاست خود شوید، به بخش <strong>MySQL® Databases</strong> مراجعه کنید و یک دیتابیس تازه (مثلا <code className="bg-slate-200 px-1 rounded text-red-650">easydri1_mmd</code>) بسازید. یک کاربر دیتابیس جدید بسازید و رمز عبور قوی به آن اختصاص دهید، سپس کاربر را با تمامی دسترسی‌ها (All Privileges) به دیتابیس متصل کنید.
                        </p>
                      </div>

                      <div className="flex gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 font-extrabold flex items-center justify-center shrink-0">۲</div>
                        <p>
                          <strong>درون‌ریزی ساختار پایگاه داده در phpMyAdmin:</strong> از پنل هاست خود ابزار معروف <strong>phpMyAdmin</strong> را باز کنید، دیتابیس ساخته‌شده را انتخاب کنید، به زبانه <strong>Import (درون‌ریزی)</strong> بروید، فایل <code className="bg-slate-200 px-1 rounded text-red-650">schema.sql</code> که در ریشه این پروژه قرار دارد را انتخاب و دکمه Go را بزنید تا کل جداول و اطلاعات اولیه ایجاد شوند.
                        </p>
                      </div>

                      <div className="flex gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 font-extrabold flex items-center justify-center shrink-0">۳</div>
                        <p>
                          <strong>تنظیم فایل پیکربندی محیطی (.env):</strong> فایل <code className="bg-slate-200 px-1 rounded text-red-650">.env</code> ریشه پروژه را باز کنید و اطلاعات دیتابیس MySQL خود را همانند مستندات روبرو وارد کنید. با ویرایش این فایل، پروژه به صورت خودکار از ذخیره‌سازی محلی به سیستم phpMyAdmin سوئیچ می‌کند!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800">پیکربندی کلیدهای اتصال محیطی:</h4>
                    
                    <div className="bg-slate-900 text-slate-250 p-4 rounded-xl font-mono text-[9px] text-left leading-relaxed border border-slate-800 space-y-2 relative" dir="ltr">
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-850 text-slate-400 rounded text-[7px] uppercase font-bold">.env.example</div>
                      <p className="text-slate-500"># Windows phpMyAdmin Database parameters</p>
                      <p><span className="text-rose-400">DB_HOST</span>=localhost</p>
                      <p><span className="text-rose-400">DB_USER</span>=your_database_username</p>
                      <p><span className="text-rose-400">DB_PASSWORD</span>=your_secure_password</p>
                      <p><span className="text-rose-400">DB_NAME</span>=easydri1_mmd</p>
                      <p className="text-slate-500"># Gemini API Intelligent assistant key</p>
                      <p><span className="text-rose-400">GEMINI_API_KEY</span>=AIzaSy...</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-right">
                      <strong className="block text-slate-800 text-[10px] font-extrabold">ویژگی‌های طلایی این معماری:</strong>
                      <ul className="text-[10px] text-slate-500 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                        <li>همگام‌سازی لحظه‌ای تراکنش‌های مالی، تیکت‌ها و خدمات</li>
                        <li>امکان مانیتورینگ آنلاین کاربران در phpMyAdmin</li>
                        <li>کاهش کوئری‌های تکراری با بهره‌گیری از Connection Pool</li>
                        <li>تغییر وضعیت لایو به فایل محلی در صورت داون شدن هاست دیتابیس</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-450 font-medium">تمامی جداول درایورها، جزئیات متصل‌شونده و تیکت‌ها داخل فایل <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600">/schema.sql</code> مکتوب شده‌اند.</span>
                  
                  <button
                    onClick={() => {
                      alert("فایل طرح و سناریو دیتابیس در شاخه روت (root) با نام schema.sql با موفقیت در دسترس است و در هاست شما بارگذاری می‌شود.");
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-lg shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileCodeIcon className="h-4 w-4 text-rose-500" />
                    <span>تایید دسترسی به فایل schema.sql جداول</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: REPORTS & EXPORTS CENTER */}
          {adminTab === 'reports' && (
            <div className="space-y-6">
              
              {/* Informative description banner */}
              <div className="p-5 bg-gradient-to-r from-rose-900 to-slate-900 rounded-3xl text-white shadow-md text-right flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-base flex items-center gap-2">
                    <Printer className="h-5 w-5 text-rose-300" />
                    <span>مرکز تخصصی گزارش‌گیری و خروجی اکسل / PDF</span>
                  </h3>
                  <p className="text-[11px] text-rose-100 font-normal leading-relaxed">
                    در این بخش می‌توانید از کلیه عملکردهای پلتفرم شامل درخواست‌های سرویس، آمار تکنسین‌ها، تیکت‌های پشتیبانی و دیدگاه‌ها خروجی رسمی تهیه کنید.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3.5 py-2 bg-white/10 rounded-xl text-center self-start">
                    <span className="block text-[8px] text-rose-200">مجموع تراکنش‌ها</span>
                    <span className="block text-xs font-black font-mono">{requests.length + tickets.length} رکورد</span>
                  </div>
                </div>
              </div>

              {/* Universal Date Range Filter Widget for Reports */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xxs text-right space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-105 pb-2">
                  <Clock className="h-4 w-4 text-rose-600" />
                  <span className="font-extrabold text-xs text-slate-800">فیلتر هوشمند بازه زمانی (جهت گزارش‌های دقیق ماهانه و هفتگی عملکرد تکنسین‌ها)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block">از تاریخ ثبت (میلادی):</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 block">تا تاریخ ثبت (میلادی):</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 font-mono text-center"
                    />
                  </div>
                  <div className="flex items-end gap-1.5Col">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setReportStartDate(d.toISOString().substring(0, 10));
                        setReportEndDate(new Date().toISOString().substring(0, 10));
                      }}
                      className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex-1 text-center"
                    >
                      گزارش هفتگی اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 30);
                        setReportStartDate(d.toISOString().substring(0, 10));
                        setReportEndDate(new Date().toISOString().substring(0, 10));
                      }}
                      className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex-1 text-center"
                    >
                      گزارش ماهانه اخیر
                    </button>
                    {(reportStartDate || reportEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportStartDate('');
                          setReportEndDate('');
                        }}
                        className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold cursor-pointer transition-all shrink-0"
                        title="پاک‌کردن فیلتر تاریخ"
                      >
                        حذف فیلتر
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bento Grid: 4 Export Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Card 1: Service Requests */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xxs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <Clipboard className="h-4 w-4 text-rose-600" />
                        <span>گزارش عملکرد درخواست‌های خدمات فنی</span>
                      </h4>
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                        {requests.length} درخواست کل
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      خروجی جامع از کلیه اقدامات ثبت‌شده، کارشناسان فنی تخصیص‌یافته، زمان هماهنگ‌شده بازدید ریموت و یادداشت‌ها.
                    </p>

                    {/* Report filter parameters choice */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-slate-400 font-bold block">فیلتر وضعیت درخواست‌ها:</label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'all', label: 'همه وضعیت‌ها' },
                          { id: 'pending', label: 'درانتظار بررسی' },
                          { id: 'assigned', label: 'تخصیص‌یافته' },
                          { id: 'in_progress', label: 'در حال انجام' },
                          { id: 'completed', label: 'کامل شده' }
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setReportReqStatus(st.id as any)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                              reportReqStatus === st.id
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px] font-black">
                    <button
                      onClick={() => exportToExcelType('requests')}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>خروجی Excel</span>
                    </button>
                    <button
                      onClick={() => triggerPrintLayout('requests')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5 text-rose-400" />
                      <span>چاپ PDF رسمی</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Technicians */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xxs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span>گزارش عملکرد و امتیازات تکنسین‌ها</span>
                      </h4>
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                        {technicians.length} تکنسین کل
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      آمار جامع از امتیازات نهایی تکنسین‌ها، تعداد کارهای نهایی‌شده، تخصص‌ها، سطح مدرک و وضعیت دسترسی لایو.
                    </p>

                    {/* Filter Status select */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-slate-400 font-bold block">فیلتر وضعیت حضور تکنسین:</label>
                      <div className="flex gap-1">
                        {[
                          { id: 'all', label: 'تمامی تکنسین‌ها' },
                          { id: 'active', label: 'فقط آنلاین (فعال)' },
                          { id: 'inactive', label: 'فقط آفلاین (غیرفعال)' }
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setReportTechActive(st.id as any)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                              reportTechActive === st.id
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px] font-black">
                    <button
                      onClick={() => exportToExcelType('technicians')}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>خروجی Excel</span>
                    </button>
                    <button
                      onClick={() => triggerPrintLayout('technicians')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5 text-purple-400" />
                      <span>چاپ PDF رسمی</span>
                    </button>
                  </div>
                </div>

                {/* Card 3: Support Tickets */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xxs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-cyan-600" />
                        <span>گزارش تیکت‌ها و مکاتبات پشتیبانی آنلاین</span>
                      </h4>
                      <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-bold">
                        {tickets.length} تیکت پشتیبانی
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      خروجی مکاتبات رسمی، سوالات فنی مشتریان، پیگیری‌های مالی و آخرین پاسخ‌های ارسال‌شده از ادمین استودیو.
                    </p>

                    {/* Filter Status select */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-slate-400 font-bold block">فیلتر وضعیت بررسی تیکت:</label>
                      <div className="flex gap-1 flex-wrap">
                        {[
                          { id: 'all', label: 'تمامی تیکت‌ها' },
                          { id: 'open', label: 'باز / جدید' },
                          { id: 'in_progress', label: 'درحال مانیتورینگ' },
                          { id: 'closed', label: 'بسته شده رسمی' }
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setReportTicketStatus(st.id as any)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                              reportTicketStatus === st.id
                                ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px] font-black">
                    <button
                      onClick={() => exportToExcelType('tickets')}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>خروجی Excel</span>
                    </button>
                    <button
                      onClick={() => triggerPrintLayout('tickets')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5 text-cyan-450" />
                      <span>چاپ PDF رسمی</span>
                    </button>
                  </div>
                </div>

                {/* Card 4: Reviews & feedback */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xxs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span>گزارش بازخوردها و تاییدیه نظرات سایت</span>
                      </h4>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        {reviews.length} دیدگاه ثبت مکتوب
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      اطلاعات مربوط به رضایت‌سنجی از خدمات تکنسین‌ها، امتیازهای عددی ۱ الی ۵ و دیدگاه‌های تاییدشده یا معلق.
                    </p>

                    {/* Filter Status select */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-slate-400 font-bold block">فیلتر وضعیت دیدگاه‌ها:</label>
                      <div className="flex gap-1">
                        {[
                          { id: 'all', label: 'تمامی نظرات عمومی' },
                          { id: 'approved', label: 'فقط تاییدشده‌ها' },
                          { id: 'pending', label: 'معلق و بررسی نشده' }
                        ].map(st => (
                          <button
                            key={st.id}
                            onClick={() => setReportReviewApproved(st.id as any)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                              reportReviewApproved === st.id
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-slate-50 border-slate-150 text-slate-550 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px] font-black">
                    <button
                      onClick={() => exportToExcelType('reviews')}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>خروجی Excel</span>
                    </button>
                    <button
                      onClick={() => triggerPrintLayout('reviews')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5 text-amber-500" />
                      <span>چاپ PDF رسمی</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Technician Time Logging details Report card element */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xxs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                  <div className="space-y-1 text-right">
                    <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                      <Timer className="h-4.5 w-4.5 text-indigo-650 animate-pulse" />
                      <span>گزارش جامع زمانی کارکرد تکنسین‌ها (Time Logging Stats)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">محاسبه بر اساس کل دقایق ثبت‌شده توسط تکنسین‌ها روی درخواست‌های منتسب به هر کارشناس</p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded-lg font-mono">
                    مجموع کل زمان ثبت‌شده: {(requests || []).reduce((sum, r) => sum + (r.loggedDurationMinutes || 0), 0)} دقیقه
                  </div>
                </div>

                <div className="overflow-x-auto text-right">
                  <table className="w-full text-right text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="pb-2">نام تکنسین کارشناس</th>
                        <th className="pb-2">تخصص</th>
                        <th className="pb-2">تعداد درخواست‌ها</th>
                        <th className="pb-2">مجموع کل زمان (ساعت:دقیقه)</th>
                        <th className="pb-2">میانگین کار روی هر درخواست</th>
                        <th className="pb-2">رتبه‌بندی عملکردی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {technicians.map((tech) => {
                        const techRequests = (requests || []).filter(r => r.assignedToId === tech.id);
                        const totalMin = techRequests.reduce((sum, r) => sum + (r.loggedDurationMinutes || 0), 0);
                        const hrs = Math.floor(totalMin / 60);
                        const remainingMins = totalMin % 60;
                        const avgDuration = techRequests.length > 0 ? (totalMin / techRequests.length).toFixed(1) : '0';

                        return (
                          <tr key={tech.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-800 flex items-center gap-2">
                              <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[9px] text-slate-600 font-mono">
                                {tech.fullName.slice(0, 1)}
                              </div>
                              <span>{tech.fullName}</span>
                              {!tech.isActive && (
                                <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.2 rounded font-bold">در انتظار تایید</span>
                              )}
                            </td>
                            <td className="py-3 text-slate-500">{SPECIALTY_LABELS[tech.specialty]}</td>
                            <td className="py-3 font-mono font-bold text-slate-700">{techRequests.length} درخواست</td>
                            <td className="py-3 font-mono font-extrabold text-indigo-650">
                              {hrs > 0 ? `${hrs} ساعت و ` : ''}{remainingMins} دقیقه
                            </td>
                            <td className="py-3 text-slate-500 font-mono">~ {avgDuration} دقیقه بر کار</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                totalMin > 180
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                  : totalMin > 40
                                  ? 'bg-blue-50 border-blue-100 text-blue-800'
                                  : 'bg-slate-50 border-slate-150 text-slate-500'
                              }`}>
                                {totalMin > 180 ? 'بسیار فعال (سخت‌کوش)' : totalMin > 40 ? 'فعالیت نرمال' : 'بدون کارکرد زمانی'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* On-Screen Print Preview Board */}
              {currentPrintType && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-indigo-650 tracking-wide uppercase">چشم‌انداز چاپی زنده (Print Preview)</span>
                      <h4 className="text-xs font-black text-slate-800">پیش‌نمایش خروجی سند رسمی کاغذ A4</h4>
                    </div>
                    <button
                      onClick={() => setCurrentPrintType(null)}
                      className="text-slate-400 hover:text-slate-700 text-xxs font-bold"
                    >
                      بستن پیش‌نمایش
                    </button>
                  </div>

                  <div className="bg-white border text-right border-slate-300 p-8 shadow-inner rounded-xl max-h-[400px] overflow-y-auto space-y-6">
                    <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-end">
                      <div>
                        <h1 className="text-sm font-black text-slate-900">سامانه خدمات پشتیبانی و تعمیرات هوشمند EasyDriver</h1>
                        <p className="text-[10px] text-slate-500 mt-1">پیشخوان مدیریت - گزارش رسمی کارکرد امور فنی</p>
                      </div>
                      <div className="text-left text-[9px] text-slate-400 space-y-0.5">
                        <p>تاریخ رسمی: {new Date().toLocaleDateString('fa-IR')}</p>
                        <p>تهیه‌کننده: {currentUser?.fullName || 'ادمین اصلی'}</p>
                      </div>
                    </div>

                    {currentPrintType === 'requests' && (() => {
                      const printedRequests = selectedRequestIds.length > 0
                        ? requests.filter(r => selectedRequestIds.includes(r.id))
                        : requests.filter(r => {
                            const statusMatch = reportReqStatus === 'all' || r.status === reportReqStatus;
                            const startMatch = !reportStartDate || (r.createdDate || '').substring(0, 10) >= reportStartDate;
                            const endMatch = !reportEndDate || (r.createdDate || '').substring(0, 10) <= reportEndDate;
                            return statusMatch && startMatch && endMatch;
                          });

                      const totalCount = printedRequests.length;
                      const completedCount = printedRequests.filter(r => r.status === 'completed').length;
                      const pendingCount = printedRequests.filter(r => r.status === 'pending').length;
                      const inProgressCount = printedRequests.filter(r => r.status === 'in_progress').length;
                      const totalTimeLogged = printedRequests.reduce((sum, r) => sum + (r.loggedDurationMinutes || 0), 0);
                      const averageCompletionTime = totalCount > 0 ? (totalTimeLogged / totalCount).toFixed(1) : '0';

                      return (
                        <div className="space-y-6">
                          {/* Corporate Company Header */}
                          <div className="bg-slate-50 p-4 border border-slate-300 rounded-xl flex justify-between items-center text-right leading-relaxed mb-4">
                            <div className="space-y-1">
                              <h3 className="text-[10px] font-black text-rose-700">شرکت پشتیبانی فنی و مهندسی ایزی‌درایور (سهامی خاص)</h3>
                              <h2 className="text-xs font-black text-slate-900">گزارش کار رسمی کارکرد و سفارش‌های فنی مشتریان</h2>
                              <p className="text-[8px] text-slate-400">بخش کنترل کیفی عملیات دسکتاپ ریموت و حضوری</p>
                            </div>
                            <div className="text-left text-[8px] text-slate-500 space-y-0.5" dir="rtl">
                              <div><strong>شماره سند:</strong> EDX-{Math.floor(Math.random() * 8999) + 1000}</div>
                              <div><strong>تاریخ گزارش:</strong> {new Date().toLocaleDateString('fa-IR')}</div>
                              <div><strong>طبقه سند:</strong> رسمی / سیستمی</div>
                              <div><strong>پشتیبان داده:</strong> {dbInfo?.connected ? 'MySQL Live' : 'پشتیبان محلی'}</div>
                            </div>
                          </div>

                          {/* Professional Statistical Summary Box */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3.5 border border-slate-200 rounded-xl text-right text-[9px]">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block">تعداد سفارشات گزارش:</span>
                              <strong className="text-slate-800 text-[11px] font-extrabold">{totalCount} مورد سفارش</strong>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block">سفارشات موفق نهایی:</span>
                              <strong className="text-emerald-700 text-[11px] font-extrabold">{completedCount} مورد تکمیل شده</strong>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block">سفارشات معلق / اقدام:</span>
                              <strong className="text-amber-700 text-[11px] font-extrabold">{pendingCount + inProgressCount} مورد در جریان</strong>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block">میانگین کارکرد ریموت:</span>
                              <strong className="text-indigo-700 text-[11px] font-extrabold">{averageCompletionTime} دقیقه بر خدمت</strong>
                            </div>
                          </div>

                          <h2 className="text-xs font-black text-slate-900 pt-2 border-b border-slate-100 pb-1.5">
                            {selectedRequestIds.length > 0 
                              ? `لیست فیلترشده درخواست‌های انتخابی جهت صدور PDF (${selectedRequestIds.length} مورد):`
                              : 'کل درخواست‌های فیلترشده سیستم:'}
                          </h2>

                          <table className="w-full text-[9px] text-right border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700">
                                <th className="border border-slate-300 p-2 font-black">شناسه</th>
                                <th className="border border-slate-300 p-2 font-black">مشتری متقاضی</th>
                                <th className="border border-slate-300 p-2 font-black">نوع خدمت فنی</th>
                                <th className="border border-slate-300 p-2 font-black">اولویت</th>
                                <th className="border border-slate-300 p-2 font-black">وضعیت بررسی</th>
                                <th className="border border-slate-300 p-2 font-black">تکنسین مسئول</th>
                                <th className="border border-slate-300 p-2 font-black">تاریخ ثبت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printedRequests.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50">
                                  <td className="border border-slate-300 p-2 font-mono">#{r.id}</td>
                                  <td className="border border-slate-300 p-2">{r.fullName}</td>
                                  <td className="border border-slate-300 p-2">{SERVICE_LABELS[r.serviceType]}</td>
                                  <td className="border border-slate-300 p-2">{PRIORITY_LABELS[r.priority]}</td>
                                  <td className="border border-slate-300 p-2">{STATUS_LABELS[r.status]}</td>
                                  <td className="border border-slate-300 p-2">{r.assignedToName || 'تخصیص نیافته'}</td>
                                  <td className="border border-slate-300 p-2 font-mono">{new Date(r.createdDate).toLocaleDateString('fa-IR')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {currentPrintType === 'technicians' && (
                      <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-900">تعهد و عملکرد نهایی تکنسین‌های فنی پلتفرم:</h2>
                        <table className="w-full text-[10px] text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-2">تکنسین مسئول</th>
                              <th className="border border-slate-300 p-2">تخصص کلیدی</th>
                              <th className="border border-slate-300 p-2">مدرک فنی</th>
                              <th className="border border-slate-300 p-2">شماره همراه</th>
                              <th className="border border-slate-300 p-2">تسک‌های موفق</th>
                              <th className="border border-slate-300 p-2">وضعیت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {technicians.map(t => (
                              <tr key={t.id}>
                                <td className="border border-slate-300 p-2">{t.fullName}</td>
                                <td className="border border-slate-300 p-2">{SPECIALTY_LABELS[t.specialty]}</td>
                                <td className="border border-slate-300 p-2">{t.certificationLevel || 'Junior'}</td>
                                <td className="border border-slate-300 p-2">{t.phone}</td>
                                <td className="border border-slate-300 p-2">{t.completedTasks || 0}</td>
                                <td className="border border-slate-300 p-2">{t.isActive ? 'فعال (آنلاین)' : 'غیرفعال'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {currentPrintType === 'tickets' && (
                      <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-900">تیکت‌های در جریان مکاتبه امور پشتیبانی:</h2>
                        <table className="w-full text-[10px] text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-2">موضوع تیکت</th>
                              <th className="border border-slate-300 p-2">ایجاد کننده</th>
                              <th className="border border-slate-300 p-2">دسته‌بندی</th>
                              <th className="border border-slate-300 p-2">اولویت</th>
                              <th className="border border-slate-300 p-2">وضعیت تیکت</th>
                              <th className="border border-slate-300 p-2">تاریخ ثبت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.map(t => (
                              <tr key={t.id}>
                                <td className="border border-slate-300 p-2">{t.subject}</td>
                                <td className="border border-slate-300 p-2">{t.userName || t.createdBy}</td>
                                <td className="border border-slate-300 p-2">{TICKET_CATEGORY_LABELS[t.category]}</td>
                                <td className="border border-slate-300 p-2">{PRIORITY_LABELS[t.priority]}</td>
                                <td className="border border-slate-300 p-2">{TICKET_STATUS_LABELS[t.status]}</td>
                                <td className="border border-slate-300 p-2">{new Date(t.createdDate).toLocaleDateString('fa-IR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {currentPrintType === 'reviews' && (
                      <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-900">نظرات، امتیازها و میزان رضایت ثبت شده در پرتال:</h2>
                        <table className="w-full text-[10px] text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-2">نام کاربر</th>
                              <th className="border border-slate-300 p-2">امتیاز ثبت‌شده</th>
                              <th className="border border-slate-300 p-2">دیدگاه مکتوب</th>
                              <th className="border border-slate-300 p-2">وضعیت تایید</th>
                              <th className="border border-slate-300 p-2">تاریخ ثبت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviews.map(re => (
                              <tr key={re.id}>
                                <td className="border border-slate-300 p-2">{re.customerName}</td>
                                <td className="border border-slate-300 p-2">{re.rating} ستاره</td>
                                <td className="border border-slate-300 p-2">{re.comment}</td>
                                <td className="border border-slate-300 p-2">{re.isApproved ? 'تایید و منتشر فنی' : 'درانتظار تایید'}</td>
                                <td className="border border-slate-300 p-2">{new Date(re.createdDate).toLocaleDateString('fa-IR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-500">
                      <div>
                        <span>مهر و امضا ادمین ارشد</span>
                      </div>
                      <div>
                        <span>ناظر کیفی خدمات فنی</span>
                      </div>
                      <div>
                        <span> تاییدیه نهایی دفتر مرکزی</span>
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      onClick={() => triggerPrintLayout(currentPrintType)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xxs font-extrabold cursor-pointer"
                    >
                      چاپ رسمی این پیش‌نمایش
                    </button>
                    <button
                      onClick={() => setCurrentPrintType(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xxs font-extrabold cursor-pointer"
                    >
                      لغو و بستن
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ========================================== */}
      {/* PERFECT A4 PRINT VIEW LAYOUT CONTAINER (ONLY VISIBLE ON PRINTER ACTIONS) */}
      {/* ========================================== */}
      <div id="print-area" className="hidden print:block text-right font-sans" dir="rtl">
        {/* Header section of PDF */}
        <div className="border-b-2 border-slate-950 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-lg font-black text-slate-900">سامانه پشتیبانی و خدمات ریموت/حضوری اِیزی‌درایور (EasyDriver)</h1>
            <p className="text-[10px] text-slate-500 mt-1">پیشخوان مدیریت ادمین - برگه عملکرد گزارش تفصیلی سیستم</p>
          </div>
          <div className="text-left text-[9px] text-slate-400">
            <p>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
            <p>زمان چاپ: {new Date().toLocaleTimeString('fa-IR')}</p>
            <p>تهیه‌کننده: {currentUser?.fullName || 'ناظر ارشد مدیریت'}</p>
          </div>
        </div>

        {/* Dynamic Data Rows Table Render based on selected request Print Type */}
        {currentPrintType === 'requests' && (() => {
          const printedRequests = selectedRequestIds.length > 0
            ? requests.filter(r => selectedRequestIds.includes(r.id))
            : requests.filter(r => {
                const statusMatch = reportReqStatus === 'all' || r.status === reportReqStatus;
                const startMatch = !reportStartDate || (r.createdDate || '').substring(0, 10) >= reportStartDate;
                const endMatch = !reportEndDate || (r.createdDate || '').substring(0, 10) <= reportEndDate;
                return statusMatch && startMatch && endMatch;
              });

          const totalCount = printedRequests.length;
          const completedCount = printedRequests.filter(r => r.status === 'completed').length;
          const pendingCount = printedRequests.filter(r => r.status === 'pending').length;
          const inProgressCount = printedRequests.filter(r => r.status === 'in_progress').length;
          const totalTimeLogged = printedRequests.reduce((sum, r) => sum + (r.loggedDurationMinutes || 0), 0);
          const averageCompletionTime = totalCount > 0 ? (totalTimeLogged / totalCount).toFixed(1) : '0';

          return (
            <div className="space-y-6">
              {/* Corporate Company Header for A4 Print */}
              <div className="border border-slate-450 p-5 rounded-xl flex justify-between items-center text-right leading-relaxed bg-slate-50 mb-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-rose-700">شرکت پشتیبانی فنی و مهندسی ایزی‌درایور (سهامی خاص)</h3>
                  <h2 className="text-sm font-black text-slate-900">سند گزارش رسمی سیستم - کارکرد سفارش‌های فنی</h2>
                  <p className="text-[9px] text-slate-505">اداره کل ارزیابی و تضمین کیفیت خدمات ریموت AnyDesk</p>
                </div>
                <div className="text-left text-[9px] text-slate-650 space-y-0.5 font-bold" dir="rtl">
                  <div><strong>کد پیگیری سند:</strong> EDX-{Math.floor(Math.random() * 89900) + 10000}</div>
                  <div><strong>تاریخ چاپ رسمی:</strong> {new Date().toLocaleDateString('fa-IR')}</div>
                  <div><strong>تولیدکننده:</strong> {currentUser?.fullName || 'ناظر ارشد مدیریت'}</div>
                  <div><strong>پایگاه داده:</strong> {dbInfo?.connected ? 'MySQL Live Connect (OK)' : 'پشتیبان لایو محلی'}</div>
                </div>
              </div>

              {/* Statistical Summary Grid for PDF */}
              <div className="grid grid-cols-4 gap-3 border border-slate-350 bg-slate-50/50 p-4 rounded-xl text-right text-[10px] my-4">
                <div className="space-y-1">
                  <span className="text-slate-500 block">تعداد سفارشات واصله:</span>
                  <strong className="text-slate-900 text-xs font-black">{totalCount} مورد سفارش فعال</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">سفارشات قطعی تکمیل‌شده:</span>
                  <strong className="text-emerald-800 text-xs font-black">{completedCount} سفارش موفق</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">سفارشات در حال اقدام/معلق:</span>
                  <strong className="text-amber-800 text-xs font-black">{pendingCount + inProgressCount} مورد باز</strong>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">میانگین کارکرد ریموت:</span>
                  <strong className="text-indigo-800 text-xs font-black">{averageCompletionTime} دقیقه بر خدمت</strong>
                </div>
              </div>

              <h2 className="text-[11px] font-black text-slate-900 border-b border-slate-400 pb-1.5 mb-2 mt-4">
                {selectedRequestIds.length > 0 
                  ? `جداول تفصیلی درخواست‌های انتخابی جهت بایگانی رسمی (${selectedRequestIds.length} مورد سفارش):`
                  : 'جداول تفصیلی کل درخواست‌های فنی فیلترشده سیستم:'}
              </h2>

              <table className="w-full text-[9px] text-right border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 p-2">کد</th>
                    <th className="border border-slate-400 p-2">نام متقاضی</th>
                    <th className="border border-slate-400 p-2">شماره همراه</th>
                    <th className="border border-slate-400 p-2">نوع خدمت فنی</th>
                    <th className="border border-slate-400 p-2">اولویت</th>
                    <th className="border border-slate-400 p-2">وضعیت بررسی</th>
                    <th className="border border-slate-400 p-2">کارشناس تخصیص‌یافته</th>
                    <th className="border border-slate-400 p-2">تاریخ ثبت</th>
                    <th className="border border-slate-400 p-2">یادداشت فنی ادمین</th>
                  </tr>
                </thead>
                <tbody>
                  {printedRequests.map((r, i) => (
                    <tr key={r.id}>
                      <td className="border border-slate-400 p-2 font-mono">#{r.id}</td>
                      <td className="border border-slate-400 p-2">{r.fullName || 'مشتری بدون نام'}</td>
                      <td className="border border-slate-400 p-2 font-mono">{r.phone || 'فاقد شماره'}</td>
                      <td className="border border-slate-400 p-2">{SERVICE_LABELS[r.serviceType]}</td>
                      <td className="border border-slate-400 p-2">{PRIORITY_LABELS[r.priority]}</td>
                      <td className="border border-slate-400 p-2">{STATUS_LABELS[r.status]}</td>
                      <td className="border border-slate-400 p-2">{r.assignedToName || 'تخصیص نیافته'}</td>
                      <td className="border border-slate-400 p-2">{new Date(r.createdDate).toLocaleDateString('fa-IR')}</td>
                      <td className="border border-slate-400 p-2 max-w-[200px] truncate">{r.adminNotes || 'بدون یادداشت'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {currentPrintType === 'technicians' && (
          <div className="space-y-4">
            <h2 className="text-[12px] font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2">لیست وضعیت و فعالیت تکنسین‌های فنی پلتفرم:</h2>
            <table className="w-full text-[9px] text-right border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-2">ردیف</th>
                  <th className="border border-slate-400 p-2">نام و نام خانوادگی</th>
                  <th className="border border-slate-400 p-2">تلفن همراه</th>
                  <th className="border border-slate-400 p-2">پست الکترونیک</th>
                  <th className="border border-slate-400 p-2">تخصص اصلی فنی</th>
                  <th className="border border-slate-400 p-2">درجه گواهینامه</th>
                  <th className="border border-slate-400 p-2">تعداد تسک انجام‌شده</th>
                  <th className="border border-slate-400 p-2">وضعیت لایو حضور</th>
                </tr>
              </thead>
              <tbody>
                {(reportTechActive === 'all' ? technicians : technicians.filter(t => reportTechActive === 'active' ? t.isActive : !t.isActive)).map((t, i) => (
                  <tr key={t.id}>
                    <td className="border border-slate-400 p-2 font-mono">{i + 1}</td>
                    <td className="border border-slate-400 p-2">{t.fullName}</td>
                    <td className="border border-slate-400 p-2 font-mono">{t.phone}</td>
                    <td className="border border-slate-400 p-2">{t.email || '-'}</td>
                    <td className="border border-slate-400 p-2">{SPECIALTY_LABELS[t.specialty]}</td>
                    <td className="border border-slate-400 p-2">{t.certificationLevel || 'Junior'}</td>
                    <td className="border border-slate-400 p-2 font-mono">{t.completedTasks || 0} تسک</td>
                    <td className="border border-slate-400 p-2">{t.isActive ? 'فعال (آنلاین)' : 'غیرفعال (آفلاین)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentPrintType === 'tickets' && (
          <div className="space-y-4">
            <h2 className="text-[12px] font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2">لیست تیکت‌ها و مکاتبات پشتیبانی پلتفرم جهت بازرسی:</h2>
            <table className="w-full text-[9px] text-right border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-2">کد</th>
                  <th className="border border-slate-400 p-2">ایجاد کننده</th>
                  <th className="border border-slate-400 p-2">موضوع تیکت پشتیبانی</th>
                  <th className="border border-slate-400 p-2">دسته‌بندی</th>
                  <th className="border border-slate-400 p-2">اولویت</th>
                  <th className="border border-slate-400 p-2">وضعیت تیکت</th>
                  <th className="border border-slate-400 p-2">تاریخ ارسال</th>
                  <th className="border border-slate-400 p-2">پاسخ ثبت‌شده ادمین</th>
                </tr>
              </thead>
              <tbody>
                {(reportTicketStatus === 'all' ? tickets : tickets.filter(t => t.status === reportTicketStatus)).map((t, i) => (
                  <tr key={t.id}>
                    <td className="border border-slate-400 p-2 font-mono">{i + 1}</td>
                    <td className="border border-slate-400 p-2">{t.userName || t.createdBy}</td>
                    <td className="border border-slate-400 p-2">{t.subject}</td>
                    <td className="border border-slate-400 p-2">{TICKET_CATEGORY_LABELS[t.category]}</td>
                    <td className="border border-slate-400 p-2">{PRIORITY_LABELS[t.priority]}</td>
                    <td className="border border-slate-400 p-2">{TICKET_STATUS_LABELS[t.status]}</td>
                    <td className="border border-slate-400 p-2 font-mono">{new Date(t.createdDate).toLocaleDateString('fa-IR')}</td>
                    <td className="border border-slate-400 p-2 max-w-[200px] truncate">{t.adminReply || 'در انتظار پاسخ کارشناس'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentPrintType === 'reviews' && (
          <div className="space-y-4">
            <h2 className="text-[12px] font-black text-slate-900 border-b border-slate-200 pb-1.5 mb-2">لیست نظرات مکتوب و میزان رضایت‌سنجی از خدمات:</h2>
            <table className="w-full text-[9px] text-right border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-2">شماره برگه</th>
                  <th className="border border-slate-400 p-2">نام مشتری متقاضی</th>
                  <th className="border border-slate-400 p-2">امتیاز مکتوب</th>
                  <th className="border border-slate-400 p-2">نوع سرویس انجام‌شده</th>
                  <th className="border border-slate-400 p-2">دیدگاه فنی تفصیلی</th>
                  <th className="border border-slate-400 p-2">وضعیت تایید و انتشار</th>
                  <th className="border border-slate-400 p-2">تاریخ نظر</th>
                </tr>
              </thead>
              <tbody>
                {(reportReviewApproved === 'all' 
                  ? reviews.filter(r => !r.isRejected) 
                  : reviews.filter(r => reportReviewApproved === 'approved' ? r.isApproved : (!r.isApproved && !r.isRejected))).map((re, i) => (
                  <tr key={re.id}>
                    <td className="border border-slate-400 p-2 font-mono">{i + 1}</td>
                    <td className="border border-slate-400 p-2">{re.customerName}</td>
                    <td className="border border-slate-400 p-2 font-mono">{re.rating} از ۵ ستاره</td>
                    <td className="border border-slate-400 p-2">{SERVICE_LABELS[re.serviceType as any] || re.serviceType || 'خدمات عمومی'}</td>
                    <td className="border border-slate-400 p-2 max-w-[220px]">{re.comment}</td>
                    <td className="border border-slate-400 p-2">{re.isApproved ? 'تایید و منتشر فنی' : 'درانتظار تایید'}</td>
                    <td className="border border-slate-400 p-2 font-mono">{new Date(re.createdDate).toLocaleDateString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signature Lines at bottom of PDF page */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-[10px] text-slate-800">
          <div>
            <span className="block font-bold">مهر و امضای ادمین ارشد:</span>
            <div className="h-10 mt-2 text-[8px] text-slate-350 flex items-center justify-center border border-dashed border-slate-200 rounded">مدیریت لایو EasyDriver</div>
          </div>
          <div>
            <span className="block font-bold">بخش کنترل کیفی و ناظر خدمات ریموت:</span>
            <div className="h-10 mt-2 text-[8px] text-slate-350 flex items-center justify-center border border-dashed border-slate-200 rounded">تاییدیه استانداردهای فنی</div>
          </div>
          <div>
            <span className="block font-bold"> تاییدیه نهایی دفتر مرکزی شرکت:</span>
            <div className="h-10 mt-2 text-[8px] text-slate-350 flex items-center justify-center border border-dashed border-slate-200 rounded">دفتر کل فناوری</div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar for Selected Requests Batch Operations/Reporting */}
      <AnimatePresence>
        {selectedRequestIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl bg-slate-900 border border-slate-700/80 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white"
          >
            <div className="flex items-center gap-3 text-right">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
              <div>
                <span className="font-extrabold text-xs block text-rose-350">عملیات گروهی ({selectedRequestIds.length} درخواست انتخابی)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">امکان ویرایش دسته‌جمعی وضعیت کار با مشتری یا چاپ فوری گزارش رسمی شکیل</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto text-[10px] font-black">
              {/* Batch Status Dropdown */}
              <div className="flex items-center bg-slate-850 rounded-lg px-2 border border-slate-700 h-9">
                <span className="text-slate-400 pl-1 shrink-0 text-[9px] font-bold">تغییر وضعیت به:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusUpdate(e.target.value as any);
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent text-white outline-none border-none py-1.5 px-1 font-bold text-[10px] cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled className="bg-slate-900">انتخاب کنید...</option>
                  <option value="pending" className="bg-slate-900">در انتظار</option>
                  <option value="in_progress" className="bg-slate-900">در دست اقدام</option>
                  <option value="completed" className="bg-slate-900">تکمیل شده</option>
                  <option value="cancelled" className="bg-slate-900">لغو شده</option>
                </select>
              </div>

              {/* Print Report */}
              <button
                onClick={() => triggerPrintLayout('requests')}
                className="flex-1 sm:flex-none h-9 px-3 bg-gradient-to-r from-rose-600 to-pink-650 hover:from-rose-700 hover:to-pink-700 text-white rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <Printer className="h-3.5 w-3.5 text-amber-300 animate-pulse animate-duration-1000" />
                <span>گزارش PDF ویژه</span>
              </button>

              {/* Batch Deletion */}
              <button
                onClick={handleBulkDelete}
                className="flex-1 sm:flex-none h-9 px-3 bg-red-950/40 hover:bg-slate-800 text-rose-400 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>حذف گروهی</span>
              </button>

              {/* Dismiss */}
              <button
                onClick={() => setSelectedRequestIds([])}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                title="لغو انتخاب"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Image overlay Modal */}
      <AnimatePresence>
        {selectedFullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFullScreenImage(null)}
            className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-700/60 p-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col cursor-default text-right"
            >
              <button
                onClick={() => setSelectedFullScreenImage(null)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-950/70 hover:bg-slate-950 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                title="بستن"
              >
                <X className="h-4 w-4" />
              </button>

              <img
                src={selectedFullScreenImage}
                alt="Fullscreen Preview"
                className="w-full h-auto max-h-[75vh] object-contain rounded-2xl"
              />

              <div className="p-4 text-center text-slate-300 text-xs font-semibold leading-relaxed border-t border-slate-800/80 mt-2">
                سند مستندات ثبت‌شده دسکتاپ مشتری از سیستم نظارتی AnyDesk کارشناس ریموت
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
