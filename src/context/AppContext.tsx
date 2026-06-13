import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Request, Review, Ticket, Technician, ChatMessage, UserRole, Notification } from '../types';
import { INITIAL_REQUESTS, INITIAL_REVIEWS, INITIAL_TICKETS, INITIAL_TECHNICIANS } from '../data/mockData';
import { getStoreData, saveStoreData, performanceMonitor } from '../utils/indexedDB';

interface AppContextProps {
  currentUser: User | null;
  login: (email: string, fullName: string, role: UserRole, extra?: Partial<User>) => void;
  logout: () => void;
  saveUser: (user: User | null) => void;
  requests: Request[];
  addRequest: (request: Omit<Request, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved' | 'status'>) => Request;
  updateRequest: (request: Request) => void;
  deleteRequest: (id: string) => void;
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'status'>) => Ticket;
  updateTicket: (ticket: Ticket) => void;
  addTicketMessage: (ticketId: string, message: string, senderRole?: UserRole) => void;
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved'> & { isApproved?: boolean }) => Review;
  updateReview: (review: Review) => void;
  deleteReview: (id: string) => void;
  technicians: Technician[];
  addTechnician: (tech: Omit<Technician, 'id' | 'createdDate' | 'updatedDate' | 'createdBy'> & { id?: string }) => void;
  updateTechnician: (tech: Technician) => void;
  deleteTechnician: (id: string) => void;
  notifications: Notification[];
  toasts: any[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  closeToast: (id: string) => void;
  loadFreshData: () => void;
  users: User[];
  addUser: (userInput: Omit<User, 'id'> & { password?: string, isActive?: boolean }) => Promise<boolean>;
  updateUser: (updated: User & { password?: string, isActive?: boolean }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Available roles mock accounts
export const MOCK_USERS: Record<UserRole, User> = {
  customer: {
    id: 'user-customer',
    fullName: 'سعید رستمی',
    email: 'saeed@customer.ir',
    phone: '09121234567',
    role: 'customer',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  },
  technician: {
    id: 'tech-1', // maps to Novid Moradi
    fullName: 'مهندس نوید مرادی',
    email: 'navid@easydriver.ir',
    phone: '09123456789',
    role: 'technician',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
  },
  admin: {
    id: 'admin-1',
    fullName: 'مدیر کل ایزی‌درایور',
    email: 'izatesplay@gmail.com',
    phone: '09386561626',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
  },
};

// Cookie standard management utilities for 30-minute session expiration
const setCookie = (name: string, value: string, minutes: number) => {
  const d = new Date();
  d.setTime(d.getTime() + (minutes * 60 * 1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string): string => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return "";
};

const eraseCookie = (name: string) => {
  document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Lax';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const wsRef = useRef<any>(null);
  
  // Ref to track if fresh server data has already loaded, avoiding cache overwrite race condition
  const isFreshLoadedRef = useRef({ requests: false, tickets: false, reviews: false });

  // Load initial cache from IndexedDB for standard data (speed & offline-capability)
  useEffect(() => {
    getStoreData<Request>('requests')
      .then(cached => {
        if (cached && cached.length > 0 && !isFreshLoadedRef.current.requests) {
          setRequests(cached);
        }
      })
      .catch(err => console.warn("Error reading requests from IndexedDB cache:", err));

    getStoreData<Ticket>('tickets')
      .then(cached => {
        if (cached && cached.length > 0 && !isFreshLoadedRef.current.tickets) {
          setTickets(cached);
        }
      })
      .catch(err => console.warn("Error reading tickets from IndexedDB cache:", err));

    getStoreData<Review>('reviews')
      .then(cached => {
        if (cached && cached.length > 0 && !isFreshLoadedRef.current.reviews) {
          setReviews(cached);
        }
      })
      .catch(err => console.warn("Error reading reviews from IndexedDB cache:", err));
  }, []);

  // Watch state changes and synchronize automatically into browser IndexedDB
  useEffect(() => {
    if (requests) {
      saveStoreData('requests', requests).catch(err => console.error("Error writing requests cache:", err));
    }
  }, [requests]);

  useEffect(() => {
    if (tickets) {
      saveStoreData('tickets', tickets).catch(err => console.error("Error writing tickets cache:", err));
    }
  }, [tickets]);

  useEffect(() => {
    if (reviews) {
      saveStoreData('reviews', reviews).catch(err => console.error("Error writing reviews cache:", err));
    }
  }, [reviews]);

  // Load backend synchronized data
  const loadFreshData = () => {
    // 1. Fetch Requests
    fetch("/api/requests")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          isFreshLoadedRef.current.requests = true;
          setRequests(data);
          saveStoreData('requests', data);
        }
      })
      .catch(err => console.error("Error loading requests:", err));

    // 2. Fetch Tickets
    fetch("/api/tickets")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          isFreshLoadedRef.current.tickets = true;
          setTickets(data);
          saveStoreData('tickets', data);
        }
      })
      .catch(err => console.error("Error loading tickets:", err));

    // 3. Fetch Reviews
    fetch("/api/reviews")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          isFreshLoadedRef.current.reviews = true;
          setReviews(data);
          saveStoreData('reviews', data);
        }
      })
      .catch(err => console.error("Error loading reviews:", err));

    // 4. Fetch Technicians
    fetch("/api/technicians")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sanitized = data.map((tech: any) => ({
            ...tech,
            isActive: tech.isActive === true || tech.isActive === 1 || tech.isActive === '1' || tech.isActive === 'true'
          }));
          setTechnicians(sanitized);
        }
      })
      .catch(err => console.error("Error loading technicians:", err));

    // 5. Fetch and Sync Users
    fetch("/api/users")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sanitizedUsers = data.map((u: any) => ({
            id: u.id,
            fullName: u.fullName || u.full_name || '',
            email: u.email || '',
            phone: u.phone || '',
            role: (u.role || 'customer') as UserRole,
            avatarUrl: u.avatarUrl || u.avatar_url || '',
            password: u.password || '123',
            isActive: u.isActive === true || u.isActive === 1 || u.isActive === '1' || u.isActive === 'true'
          }));
          setUsers(sanitizedUsers);
          localStorage.setItem('ed_registered_users', JSON.stringify(sanitizedUsers));
        }
      })
      .catch(err => console.error("Error loading and syncing users:", err));
  };

  useEffect(() => {
    // Current user authentication setup using safe 30-minute DB-backed cookie session lookup
    const userIdCookie = getCookie('ed_user_id');
    if (userIdCookie) {
      // Load user profile details directly from back-end SQL, storing no personal user info in cookie
      fetch(`/api/users/${encodeURIComponent(userIdCookie)}`)
        .then(res => {
          if (!res.ok) throw new Error('Invalid session');
          return res.json();
        })
        .then(user => {
          if (user && user.id) {
            setCurrentUser(user);
          } else {
            setCurrentUser(null);
            eraseCookie('ed_user_id');
          }
        })
        .catch(() => {
          setCurrentUser(null);
          eraseCookie('ed_user_id');
        })
        .finally(() => {
          loadFreshData();
        });
    } else {
      setCurrentUser(null);
      loadFreshData();
    }
  }, []);

  const loadNotifications = (userId: string, role: string) => {
    fetch(`/api/notifications?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(err => console.error("Error reading notifications client:", err));
  };

  const showFancyToast = (notif: Notification) => {
    const id = `toast-${Date.now()}`;
    const newToast = {
      id,
      notification: notif,
      visible: true
    };
    setToasts(prev => [...prev, newToast]);
    
    // Auto clear toast notification popup
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetch(`/api/notifications/${id}/read`, {
      method: 'POST'
    }).catch(err => console.error("Error marking read:", err));
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch(`/api/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, role: currentUser.role })
    }).catch(err => console.error("Error marking all read:", err));
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Synchronise WebSocket and Notifications of Active User
  useEffect(() => {
    if (!currentUser) return;

    loadNotifications(currentUser.id, currentUser.role);

    // Initialise real-time WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log("🔌 Initialising real-time updates socket loop:", wsUrl);
    
    let socket: any;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;
    } catch (e) {
      console.error("Browser unsupported WS:", e);
      return;
    }

    socket.onopen = () => {
      console.log("🔌 WebSocket active connected!");
      // Authenticate register on socket channel
      socket.send(JSON.stringify({
        type: "register",
        userId: currentUser.id,
        role: currentUser.role
      }));
    };

    // Ping loop every 6 seconds to track latency dynamically
    const pingInterval = setInterval(() => {
      if (socket && socket.readyState === 1) { // OPEN
        socket.send(JSON.stringify({
          type: "ping",
          timestamp: Date.now()
        }));
      }
    }, 6000);

    socket.onmessage = (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "pong") {
          const latency = Date.now() - payload.timestamp;
          performanceMonitor.logWsMessage(latency);
        } else if (payload.type === "notification") {
          const freshNotif = payload.data;
          
          let alertSelf = false;
          if (freshNotif.targetUserId && freshNotif.targetUserId === currentUser.id) {
            alertSelf = true;
          } else if (!freshNotif.targetUserId && freshNotif.targetRole && freshNotif.targetRole === currentUser.role) {
            alertSelf = true;
          } else if (!freshNotif.targetUserId && !freshNotif.targetRole) {
            alertSelf = true;
          }

          if (alertSelf) {
            setNotifications(prev => [freshNotif, ...prev]);
            showFancyToast(freshNotif);
            
            // Also load fresh table content depending on event to make it feel responsive!
            loadFreshData();
          }
        }
      } catch (err) {
        console.error("Error parsing browser socket payload:", err);
      }
    };

    socket.onerror = (err: any) => {
      console.warn("WS error boundary:", err);
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket clean closed");
    };

    return () => {
      clearInterval(pingInterval);
      if (socket) {
        socket.close();
      }
    };
  }, [currentUser]);

  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      setCookie('ed_user_id', user.id, 30); // Store ONLY user ID in cookie for exactly 30 minutes
    } else {
      eraseCookie('ed_user_id');
    }
  };

  const login = (email: string, fullName: string, role: UserRole, extra?: Partial<User>) => {
    const newUser: User = {
      id: extra?.id || `user-${Date.now()}`,
      fullName,
      email,
      phone: extra?.phone || '09120000000',
      role,
      avatarUrl: extra?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fullName}`,
    };
    saveUser(newUser);
  };

  const logout = () => {
    saveUser(null);
  };

  // Requests functions
  const addRequest = (reqData: Omit<Request, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved' | 'status'>) => {
    const newRequest: Request = {
      ...reqData,
      id: `req-${Date.now()}`,
      status: 'pending',
      isApproved: false,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
    };

    // Optimistic Update
    setRequests(prev => [newRequest, ...prev]);

    // DB POST
    fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRequest)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Post request sync err:", err));

    return newRequest;
  };

  const updateRequest = (updated: Request) => {
    const nextRequestObj = { ...updated, updatedDate: new Date().toISOString() };
    
    // Optimistic Update
    setRequests(prev => prev.map(r => r.id === updated.id ? nextRequestObj : r));

    // DB PUT
    return fetch(`/api/requests/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRequestObj)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Put request sync err:", err));
  };

  const deleteRequest = (id: string) => {
    // Optimistic Update
    setRequests(prev => prev.filter(r => r.id !== id));

    // DB DELETE
    return fetch(`/api/requests/${id}`, {
      method: "DELETE"
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Delete request sync err:", err));
  };

  // Tickets functions
  const addTicket = (ticketData: Omit<Ticket, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'status'>) => {
    const newTicketId = `tick-${Date.now()}`;
    const initialMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'anonymous',
      senderName: currentUser?.fullName || ticketData.userName || 'کاربر',
      senderRole: currentUser?.role || 'customer',
      message: ticketData.message,
      timestamp: new Date().toISOString(),
    };

    const initialWelcome: ChatMessage = {
      id: `msg-${Date.now() + 100}`,
      senderId: 'admin-1',
      senderName: 'پشتیبان هوشمند EasyDriver',
      senderRole: 'admin',
      message: 'سلام کاربر گرامی. خوش آمدید به پنل گفتگو و پشتیبانی هوشمند EasyDriver. همکارهای بخش فنی حاضر روی خط هستند. لطفاً شناسه ۹ رقمی AnyDesk یا جزئیات و کد خطای ویندوز خود را یادداشت و ارسال کنید تا برقراری اتصال ریموت هم‌اکنون به جریان افتد.',
      timestamp: new Date(Date.now() + 100).toISOString(),
    };

    const newTicket: Ticket = {
      ...ticketData,
      id: newTicketId,
      status: 'open',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
      messages: ticketData.message ? [initialMsg, initialWelcome] : [initialWelcome],
    };

    // Optimistic Update
    setTickets(prev => [newTicket, ...prev]);

    // DB POST
    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTicket)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Post ticket sync err:", err));

    return newTicket;
  };

  const updateTicket = (updated: Ticket) => {
    const nextTicketObj = { ...updated, updatedDate: new Date().toISOString() };

    // Optimistic Update
    setTickets(prev => prev.map(t => t.id === updated.id ? nextTicketObj : t));

    // DB PUT
    return fetch(`/api/tickets/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextTicketObj)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Put ticket sync err:", err));
  };

  const processedMessageHashesRef = useRef<Set<string>>(new Set());

  const addTicketMessage = (ticketId: string, messageText: string, senderRole?: UserRole) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const sender = currentUser || { id: 'anonymous', fullName: 'ناشناس', role: 'customer' as UserRole, email: '', phone: '' };

    // Smart role detection: Use the active currentUser role if logged in to prevent double-sends or conflicting role transmissions
    const roleToSend = (sender && sender.id !== 'anonymous' && sender.role) ? sender.role : (senderRole || 'customer');
    
    // De-duplication mechanism: prevent exact same message sent within 1.5 seconds
    const msgHash = `${ticketId}-${messageText.trim()}-${roleToSend}`;
    if (processedMessageHashesRef.current.has(msgHash)) {
      console.warn("🚫 Debounced duplicate ticket message transmission:", msgHash);
      return;
    }
    processedMessageHashesRef.current.add(msgHash);
    setTimeout(() => {
      processedMessageHashesRef.current.delete(msgHash);
    }, 1500);

    // Intelligently detect actual sender's name depending strictly on context role
    let nameToSend = sender.fullName || 'پشتیبان سیستم';
    if (roleToSend === 'admin') {
      nameToSend = sender.role === 'admin' ? (sender.fullName || 'مدیر کل ایزی‌درایور') : 'مدیریت پشتیبانی ایزی‌درایور';
    } else if (roleToSend === 'technician') {
      nameToSend = sender.role === 'technician' ? (sender.fullName || 'کارشناس پشتیبانی فنی') : 'کارشناس پشتیبانی فنی';
    } else if (roleToSend === 'customer') {
      nameToSend = sender.fullName || ticket.userName || 'کاربر متقاضی';
    }

    const newMessageId = `msg-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: newMessageId,
      senderId: roleToSend === 'admin' ? 'admin-1' : sender.id,
      senderName: nameToSend,
      senderRole: roleToSend,
      message: messageText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(ticket.messages || []), newMessage];
    const updatedTicket: Ticket = {
      ...ticket,
      status: roleToSend === 'admin' ? 'in_progress' : 'open',
      messages: updatedMessages,
      updatedDate: new Date().toISOString(),
    };

    // Optimistic Update
    setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));

    // DB Ticket Message POST
    fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgId: newMessageId,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        senderRole: newMessage.senderRole,
        message: newMessage.message,
        timestamp: newMessage.timestamp
      })
    })
    .then(() => {
      // Dynamic support assistant auto-response Trigger (for Gemini API Support Assistant)
      const customerMsgsCount = (updatedMessages || []).filter(m => m.senderRole === 'customer').length;
      if (roleToSend === 'customer' && customerMsgsCount === 1) {
        fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: ticket.subject,
            messageHistory: updatedMessages,
          })
        })
        .then(res => res.json())
        .then(data => {
          const autoMessageId = `msg-${Date.now() + 1}`;
          const autoMessage: ChatMessage = {
            id: autoMessageId,
            senderId: 'admin-1',
            senderName: 'پشتیبان هوشمند EasyDriver',
            senderRole: 'admin',
            message: data.text || 'سلام، جزئیات شما ثبت شد. به زودی در ریموت خدمت‌رسانی می‌کنیم.',
            timestamp: new Date().toISOString(),
          };

          // Show automated notification toast
          const autoNotification: Notification = {
            id: `notif-${Date.now()}`,
            title: "پاسخ جدید از پشتیبان هوشمند",
            message: autoMessage.message,
            type: "ticket_reply",
            createdDate: new Date().toISOString(),
            read: false
          };
          showFancyToast(autoNotification);

          // Optimistically show Gemini reply as well
          setTickets(prev => prev.map(t => {
            if (t.id === ticketId) {
              return {
                ...t,
                messages: [...(t.messages || []), autoMessage],
                updatedDate: new Date().toISOString()
              };
            }
            return t;
          }));

          // Post Gemini reply to DB in the background
          fetch(`/api/tickets/${ticketId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              msgId: autoMessageId,
              senderId: autoMessage.senderId,
              senderName: autoMessage.senderName,
              senderRole: autoMessage.senderRole,
              message: autoMessage.message,
              timestamp: autoMessage.timestamp
            })
          }).then(() => loadFreshData());

        })
        .catch(err => console.error("AI Assistant responder internal fetch err:", err));
      } else {
        loadFreshData();
      }
    })
    .catch(err => console.error("Post ticket message sync err:", err));
  };

  // Reviews functions
  const addReview = (reviewData: Omit<Review, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved'> & { isApproved?: boolean }) => {
    const newReview: Review = {
      isApproved: false, // Default pending review approval
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
    };

    // Optimistic Update
    setReviews(prev => [newReview, ...prev]);

    // DB POST
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReview)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Post review sync err:", err));

    return newReview;
  };

  const updateReview = (updated: Review) => {
    const nextReviewObj = { ...updated, updatedDate: new Date().toISOString() };

    // Optimistic Update
    setReviews(prev => prev.map(r => r.id === updated.id ? nextReviewObj : r));

    // DB PUT
    fetch(`/api/reviews/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextReviewObj)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Put review sync err:", err));
  };

  const deleteReview = (id: string) => {
    // Optimistic Update
    setReviews(prev => prev.filter(r => r.id !== id));

    // DB DELETE
    fetch(`/api/reviews/${id}`, {
      method: "DELETE"
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Delete review sync err:", err));
  };

  // Technicians functions
  const addTechnician = (techData: Omit<Technician, 'id' | 'createdDate' | 'updatedDate' | 'createdBy'> & { id?: string }) => {
    const techId = techData.id || `tech-${Date.now()}`;
    const newTech: Technician = {
      ...techData,
      id: techId,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'admin-1',
    };

    // Optimistic Update
    setTechnicians(prev => [...prev, newTech]);

    // DB POST
    fetch("/api/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTech)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Post technician sync err:", err));
  };

  const updateTechnician = (updated: Technician) => {
    const nextTechObj = { ...updated, updatedDate: new Date().toISOString() };

    // Optimistic Update
    setTechnicians(prev => prev.map(t => t.id === updated.id ? nextTechObj : t));

    // DB PUT
    fetch(`/api/technicians/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextTechObj)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Put technician sync err:", err));
  };

  const deleteTechnician = (id: string) => {
    // Optimistic Update
    setTechnicians(prev => prev.filter(t => t.id !== id));

    const registered = JSON.parse(localStorage.getItem('ed_registered_users') || '[]');
    const nextReg = registered.filter((u: any) => u.id !== id);
    localStorage.setItem('ed_registered_users', JSON.stringify(nextReg));

    // DB DELETE from users (which cascades to technicians in MySQL)
    fetch(`/api/users/${id}`, {
      method: "DELETE"
    })
    .then(() => {
      // Also delete from technicians specifically for fallback/coverage
      fetch(`/api/technicians/${id}`, {
        method: "DELETE"
      })
      .then(() => loadFreshData());
    })
    .catch(err => console.error("Delete technician sync err:", err));
  };

  const addUser = async (userInput: Omit<User, 'id'> & { password?: string, isActive?: boolean }): Promise<boolean> => {
    const rawId = userInput.role === 'technician' ? `tech_${Date.now()}` : `user_${Date.now()}`;
    const payload = {
      id: rawId,
      fullName: userInput.fullName,
      email: userInput.email,
      phone: userInput.phone,
      role: userInput.role,
      password: userInput.password || '123',
      avatarUrl: userInput.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
      isActive: userInput.isActive !== false
    };

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        if (payload.role === 'technician') {
          // Trigger companion technician registration
          await fetch("/api/technicians", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: payload.id,
              fullName: payload.fullName,
              phone: payload.phone,
              email: payload.email,
              specialty: "all",
              isActive: true,
              createdBy: currentUser?.id || "admin-1"
            })
          });
        }
        loadFreshData();
        return true;
      } else {
        alert(data.error || "خطایی در ثبت نام صورت گرفت.");
        return false;
      }
    } catch (err) {
      console.error("Error adding user:", err);
      return false;
    }
  };

  const updateUser = async (updated: User & { password?: string, isActive?: boolean }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (data.success) {
        loadFreshData();
        return true;
      } else {
        alert(data.error || "خطایی در بروزرسانی اطلاعات کاربر رخ داد.");
        return false;
      }
    } catch (err) {
      console.error("Error updating user:", err);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        loadFreshData();
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      logout,
      saveUser,
      requests,
      addRequest,
      updateRequest,
      deleteRequest,
      tickets,
      addTicket,
      updateTicket,
      addTicketMessage,
      reviews,
      addReview,
      updateReview,
      deleteReview,
      technicians,
      addTechnician,
      updateTechnician,
      deleteTechnician,
      notifications,
      toasts,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      closeToast,
      loadFreshData,
      users,
      addUser,
      updateUser,
      deleteUser,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
