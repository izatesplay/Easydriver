import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Request, Review, Ticket, Technician, ChatMessage, UserRole } from '../types';
import { INITIAL_REQUESTS, INITIAL_REVIEWS, INITIAL_TICKETS, INITIAL_TECHNICIANS } from '../data/mockData';

interface AppContextProps {
  currentUser: User | null;
  login: (email: string, fullName: string, role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  requests: Request[];
  addRequest: (request: Omit<Request, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved' | 'status'>) => Request;
  updateRequest: (request: Request) => void;
  deleteRequest: (id: string) => void;
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'status'>) => Ticket;
  updateTicket: (ticket: Ticket) => void;
  addTicketMessage: (ticketId: string, message: string, senderRole?: UserRole) => void;
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved'>) => Review;
  updateReview: (review: Review) => void;
  technicians: Technician[];
  addTechnician: (tech: Omit<Technician, 'id' | 'createdDate' | 'updatedDate' | 'createdBy'>) => void;
  updateTechnician: (tech: Technician) => void;
  deleteTechnician: (id: string) => void;
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
    fullName: 'مدیریت ایزی‌درایور (امین)',
    email: 'admin@easydriver.ir',
    phone: '09010009999',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
  },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Load backend synchronized data
  const loadFreshData = () => {
    // 1. Fetch Requests
    fetch("/api/requests")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRequests(data);
      })
      .catch(err => console.error("Error loading requests:", err));

    // 2. Fetch Tickets
    fetch("/api/tickets")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTickets(data);
      })
      .catch(err => console.error("Error loading tickets:", err));

    // 3. Fetch Reviews
    fetch("/api/reviews")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(err => console.error("Error loading reviews:", err));

    // 4. Fetch Technicians
    fetch("/api/technicians")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTechnicians(data);
      })
      .catch(err => console.error("Error loading technicians:", err));
  };

  useEffect(() => {
    // Current user authentication setup
    const storedUser = localStorage.getItem('ed_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        setCurrentUser(MOCK_USERS.customer);
      }
    } else {
      setCurrentUser(MOCK_USERS.customer);
      localStorage.setItem('ed_user', JSON.stringify(MOCK_USERS.customer));
    }

    // Load SQL-backed synchronised tables
    loadFreshData();
  }, []);

  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('ed_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ed_user');
    }
  };

  const login = (email: string, fullName: string, role: UserRole) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName,
      email,
      phone: '09120000000',
      role,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fullName}`,
    };
    saveUser(newUser);
  };

  const logout = () => {
    saveUser(null);
  };

  const switchRole = (role: UserRole) => {
    saveUser(MOCK_USERS[role]);
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
    fetch(`/api/requests/${updated.id}`, {
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
    fetch(`/api/requests/${id}`, {
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

    const newTicket: Ticket = {
      ...ticketData,
      id: newTicketId,
      status: 'open',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
      messages: [initialMsg],
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
    fetch(`/api/tickets/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextTicketObj)
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Put ticket sync err:", err));
  };

  const addTicketMessage = (ticketId: string, messageText: string, senderRole?: UserRole) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const sender = currentUser || { id: 'anonymous', fullName: 'ناشناس', role: 'customer' as UserRole, email: '', phone: '' };

    const roleToSend = senderRole || sender.role;
    const nameToSend = roleToSend === 'admin' ? 'مدیریت پشتیبانی (تکنسین)' : (sender.fullName || ticket.userName || 'کاربر');

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
      if (roleToSend === 'customer') {
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
  const addReview = (reviewData: Omit<Review, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved'>) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      isApproved: false, // Default pending review approval
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

  // Technicians functions
  const addTechnician = (techData: Omit<Technician, 'id' | 'createdDate' | 'updatedDate' | 'createdBy'>) => {
    const newTech: Technician = {
      ...techData,
      id: `tech-${Date.now()}`,
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

    // DB DELETE
    fetch(`/api/technicians/${id}`, {
      method: "DELETE"
    })
    .then(() => loadFreshData())
    .catch(err => console.error("Delete technician sync err:", err));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      logout,
      switchRole,
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
      technicians,
      addTechnician,
      updateTechnician,
      deleteTechnician,
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
