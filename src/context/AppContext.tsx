import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Request, Review, Ticket, Technician, ChatMessage, UserRole, RequestStatus, RequestPriority, TicketStatus, TicketPriority, TicketCategory } from '../types';
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

  // Load initial data or localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('ed_user');
    const storedRequests = localStorage.getItem('ed_requests');
    const storedTickets = localStorage.getItem('ed_tickets');
    const storedReviews = localStorage.getItem('ed_reviews');
    const storedTechs = localStorage.getItem('ed_technicians');

    // Default to mock customer initially if nothing is selected yet to make it fully functional out of box
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

    if (storedRequests) {
      try { setRequests(JSON.parse(storedRequests)); } catch (e) { setRequests(INITIAL_REQUESTS); }
    } else {
      setRequests(INITIAL_REQUESTS);
      localStorage.setItem('ed_requests', JSON.stringify(INITIAL_REQUESTS));
    }

    if (storedTickets) {
      try { setTickets(JSON.parse(storedTickets)); } catch (e) { setTickets(INITIAL_TICKETS); }
    } else {
      setTickets(INITIAL_TICKETS);
      localStorage.setItem('ed_tickets', JSON.stringify(INITIAL_TICKETS));
    }

    if (storedReviews) {
      try { setReviews(JSON.parse(storedReviews)); } catch (e) { setReviews(INITIAL_REVIEWS); }
    } else {
      setReviews(INITIAL_REVIEWS);
      localStorage.setItem('ed_reviews', JSON.stringify(INITIAL_REVIEWS));
    }

    if (storedTechs) {
      try { setTechnicians(JSON.parse(storedTechs)); } catch (e) { setTechnicians(INITIAL_TECHNICIANS); }
    } else {
      setTechnicians(INITIAL_TECHNICIANS);
      localStorage.setItem('ed_technicians', JSON.stringify(INITIAL_TECHNICIANS));
    }
  }, []);

  // Save changes wrapper helpers
  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('ed_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ed_user');
    }
  };

  const saveRequests = (newRequests: Request[]) => {
    setRequests(newRequests);
    localStorage.setItem('ed_requests', JSON.stringify(newRequests));
  };

  const saveTickets = (newTickets: Ticket[]) => {
    setTickets(newTickets);
    localStorage.setItem('ed_tickets', JSON.stringify(newTickets));
  };

  const saveReviews = (newReviews: Review[]) => {
    setReviews(newReviews);
    localStorage.setItem('ed_reviews', JSON.stringify(newReviews));
  };

  const saveTechs = (newTechs: Technician[]) => {
    setTechnicians(newTechs);
    localStorage.setItem('ed_technicians', JSON.stringify(newTechs));
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
    saveRequests([newRequest, ...requests]);
    return newRequest;
  };

  const updateRequest = (updated: Request) => {
    const next = requests.map(r => r.id === updated.id ? { ...updated, updatedDate: new Date().toISOString() } : r);
    saveRequests(next);
  };

  const deleteRequest = (id: string) => {
    saveRequests(requests.filter(r => r.id !== id));
  };

  // Tickets functions
  const addTicket = (ticketData: Omit<Ticket, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'status'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `tick-${Date.now()}`,
      status: 'open',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser?.id || 'anonymous',
          senderName: currentUser?.fullName || ticketData.userName || 'کاربر',
          senderRole: currentUser?.role || 'customer',
          message: ticketData.message,
          timestamp: new Date().toISOString(),
        }
      ],
    };
    saveTickets([newTicket, ...tickets]);
    return newTicket;
  };

  const updateTicket = (updated: Ticket) => {
    const next = tickets.map(t => t.id === updated.id ? { ...updated, updatedDate: new Date().toISOString() } : t);
    saveTickets(next);
  };

  const addTicketMessage = (ticketId: string, messageText: string, senderRole?: UserRole) => {
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) return;

    const ticket = tickets[ticketIndex];
    const sender = currentUser || { id: 'anonymous', fullName: 'ناشناس', role: 'customer' as UserRole, email: '', phone: '' };

    const roleToSend = senderRole || sender.role;
    const nameToSend = roleToSend === 'admin' ? 'مدیریت پشتیبانی (تکنسین)' : (sender.fullName || ticket.userName || 'کاربر');

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
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

    const updatedTickets = tickets.map(t => t.id === ticketId ? updatedTicket : t);
    saveTickets(updatedTickets);

    // Dynamic support assistant! If the user sent the message (customer), trigger a real Gemini response from our server-side API
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
        const autoMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          senderId: 'admin-1',
          senderName: 'پشتیبان هوشمند EasyDriver',
          senderRole: 'admin',
          message: data.text || 'سلام، جزئیات خطای ریموت سیستم شما دریافت شد. در حال هماهنگی با مهندسان هستیم.',
          timestamp: new Date().toISOString(),
        };

        // Reload fresh list from state or storage to prevent overwriting
        const currentTickets = JSON.parse(localStorage.getItem('ed_tickets') || '[]');
        const targetTick = currentTickets.find((t: Ticket) => t.id === ticketId);
        if (targetTick) {
          targetTick.messages = [...(targetTick.messages || []), autoMessage];
          targetTick.updatedDate = new Date().toISOString();
          const savedList = currentTickets.map((t: Ticket) => t.id === ticketId ? targetTick : t);
          setTickets(savedList);
          localStorage.setItem('ed_tickets', JSON.stringify(savedList));
        }
      })
      .catch(err => {
        console.error("AI chat assistant fetch error:", err);
      });
    }
  };

  // Reviews functions
  const addReview = (reviewData: Omit<Review, 'id' | 'createdDate' | 'updatedDate' | 'createdBy' | 'isApproved'>) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      isApproved: false, // Default pending review
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy: currentUser?.id || 'anonymous',
    };
    saveReviews([newReview, ...reviews]);
    return newReview;
  };

  const updateReview = (updated: Review) => {
    const next = reviews.map(r => r.id === updated.id ? updated : r);
    saveReviews(next);
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
    saveTechs([...technicians, newTech]);
  };

  const updateTechnician = (updated: Technician) => {
    const next = technicians.map(t => t.id === updated.id ? { ...updated, updatedDate: new Date().toISOString() } : t);
    saveTechs(next);
  };

  const deleteTechnician = (id: string) => {
    saveTechs(technicians.filter(t => t.id !== id));
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
