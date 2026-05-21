import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Hero } from './components/Hero';
import { NewRequest } from './components/NewRequest';
import { MyRequests } from './components/MyRequests';
import { Reviews } from './components/Reviews';
import { Tickets } from './components/Tickets';
import { SupportChat } from './components/SupportChat';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { TechnicianDashboard } from './components/TechnicianDashboard';
import { NotificationToasts } from './components/NotificationToasts';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const getActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <Hero setActiveTab={setActiveTab} />;
      case 'new-request':
        return <NewRequest setActiveTab={setActiveTab} />;
      case 'my-requests':
        return <MyRequests />;
      case 'reviews':
        return <Reviews />;
      case 'tickets':
        return (
          <Tickets
            setActiveTab={setActiveTab}
            setSelectedTicketId={(id) => setSelectedTicketId(id)}
          />
        );
      case 'support-chat':
        return (
          <SupportChat
            selectedTicketId={selectedTicketId || ''}
            setSelectedTicketId={setSelectedTicketId}
          />
        );
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'tech-dashboard':
        return <TechnicianDashboard />;
      case 'auth':
        return <Auth setActiveTab={setActiveTab} />;
      default:
        return <Hero setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 antialiased" dir="rtl">
      
      {/* 1. Header Navigation elements */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Transitioning Core Contents */}
      <main className="grow flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="grow flex flex-col"
          >
            {getActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Footer Segment */}
      <Footer setActiveTab={setActiveTab} />

      {/* 4. Sleek Floating account switcher for quick sandbox testing */}
      <RoleSwitcher />

      {/* 5. Floating real-time slide-in toasts notification stack */}
      <NotificationToasts />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
