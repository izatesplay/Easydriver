/**
 * Types & Interfaces for EasyDriver Platform
 */

export type UserRole = 'customer' | 'technician' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

export type ServiceType = 'driver_install' | 'software_install' | 'anydesk_support' | 'other';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  driver_install: 'نصب و بروزرسانی درایور',
  software_install: 'نصب نرم‌افزار تخصصی و عمومی',
  anydesk_support: 'پشتیبانی فنی از راه دور (AnyDesk)',
  other: 'سایر خدمات پشتیبانی و مشاوره',
};

export type RequestStatus = 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تایید شده توسط مدیریت',
  assigned: 'ارجاع به تکنسین',
  in_progress: 'در حال انجام',
  completed: 'کامل شده',
  cancelled: 'لغو شده',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  urgent: 'فوری و اضطراری',
};

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 animate-pulse border border-rose-200',
};

export interface Request {
  id: string;
  fullName: string;
  phone: string;
  serviceType: ServiceType;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  adminNotes?: string;
  scheduledDate?: string;
  assignedToId?: string;
  assignedToName?: string;
  isApproved: boolean;
  approvedAt?: string;
  assignedAt?: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string; // user id
  rating?: number; // 1-5 stars
  ratingComment?: string; // user feedback text
  ratedAt?: string; // rating timestamp
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  serviceType?: string;
  isApproved: boolean;
  createdDate: string;
  updatedDate: string;
  createdBy: string; // user id
  technicianId?: string; // ID of the rated technician (if any)
  technicianName?: string; // Name of the rated technician
}

export type TicketStatus = 'open' | 'in_progress' | 'closed';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'باز',
  in_progress: 'در حال بررسی',
  closed: 'بسته شده',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

export type TicketPriority = 'low' | 'medium' | 'high';

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
};

export type TicketCategory = 'technical' | 'billing' | 'general' | 'complaint';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: 'فنی و تخصص درایور',
  billing: 'مالی و فاکتورها',
  general: 'پشتیبانی عمومی و چت',
  complaint: 'شکایات و پیشنهادات',
};

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  adminReply?: string;
  userEmail?: string;
  userName?: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string; // user id
  messages?: ChatMessage[]; // Support chat messages
  attachedFile?: string; // Simulated file content (base64 or placeholder)
  attachedFileName?: string; // Name of the uploaded screenshot/file
  availabilityTime?: string; // Approximate time range the user is available
}

export type TechnicianSpecialty = 'driver_install' | 'software_install' | 'anydesk_support' | 'all';

export const SPECIALTY_LABELS: Record<TechnicianSpecialty, string> = {
  driver_install: 'نصب تخصصی درایور',
  software_install: 'نصب نرم‌افزار',
  anydesk_support: 'پشتیبانی راه دور',
  all: 'همه‌فن حریف (تمام خدمات)',
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
  iconName: string;
}

export interface Technician {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  specialty: TechnicianSpecialty;
  isActive: boolean;
  completedTasks: number;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  points?: number;
  unlockedAchievements?: Achievement[];
  certificationLevel?: 'Junior' | 'Senior' | 'Expert';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'request_created' | 'request_status' | 'ticket_created' | 'ticket_reply' | 'ticket_status' | 'review_created';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  targetUserId?: string;
  targetRole?: UserRole;
  referenceId?: string;
  createdDate: string;
  read: boolean;
}
