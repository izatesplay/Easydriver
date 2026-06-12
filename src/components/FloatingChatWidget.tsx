import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Headset, MessageSquare, Send, Paperclip, ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw, X, ShieldAlert, CheckCircle, FilePlus, Inbox, Check } from 'lucide-react';
import { getFullFileUrl } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const FloatingChatWidget: React.FC<{ activeTabState?: string; setActiveTab?: (tab: string) => void }> = ({ activeTabState, setActiveTab }) => {
  const {
    currentUser,
    tickets,
    addTicketMessage,
    updateTicket,
    loadFreshData
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tickets, activeChatId, isTyping, isOpen]);

  // Find all active of 'general' tickets (which serve as live chat logs)
  const generalTickets = currentUser
    ? tickets.filter(t => t.createdBy === currentUser.id && t.category === 'general')
    : [];

  const activeChat = generalTickets.find(t => t.id === activeChatId) || (generalTickets.length > 0 ? generalTickets[0] : null);

  // Sync activeChatId if changed
  useEffect(() => {
    if (activeChat && !activeChatId) {
      setActiveChatId(activeChat.id);
    }
  }, [activeChat, activeChatId]);

  // Handle typing simulation when user sends message
  useEffect(() => {
    if (activeChat && activeChat.messages && activeChat.messages.length > 0) {
      const lastMsg = activeChat.messages[activeChat.messages.length - 1];
      const customerMessages = activeChat.messages.filter(m => m.senderRole === 'customer');
      
      // Only auto-reply the very first time the user sends a message
      if (lastMsg && lastMsg.senderRole === 'customer' && customerMessages.length === 1) {
        // Only trigger if no admin replies are younger than 10 seconds
        const hasRecentReply = activeChat.messages.some(m => m.senderRole === 'admin' && (Date.now() - new Date(m.timestamp).getTime() < 10000));
        if (!hasRecentReply) {
          setIsTyping(true);
          const typingTimer = setTimeout(() => {
            setIsTyping(false);
            let simulatedReplyText = "سلام، جزئیات شما ثبت شد. به زودی در ریموت خدمترسانی میکنیم";

            // Push simulated answer using addTicketMessage for live-feel
            addTicketMessage(activeChat.id, simulatedReplyText, 'admin');
          }, 2000);

          return () => clearTimeout(typingTimer);
        }
      }
    }
  }, [activeChat?.messages?.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChat) return;

    addTicketMessage(activeChat.id, typedMessage.trim(), 'customer');
    setTypedMessage('');
  };

  const handleInitiateChat = async () => {
    if (!currentUser) return;
    setIsInitiating(true);
    try {
      const response = await fetch('/api/support-chat/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userEmail: currentUser.email,
          message: ''
        })
      });
      const data = await response.json();
      if (data.success) {
        await loadFreshData();
        setActiveChatId(data.chatId);
      }
    } catch (err) {
      console.error("Initiation chat failure:", err);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleConvertChatToTicket = async () => {
    if (!activeChat) return;
    if (!confirm('آیا مطمئن هستید که می‌خواهید این گفتگوی آنلاین را جهت بررسی عمیق و طولانی‌مدت به یک تیکت رسمی درایورها ارتقا دهید؟')) return;

    setIsConverting(true);
    try {
      const response = await fetch(`/api/support-chat/${activeChat.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'technical',
          subject: 'ارجاع چت پشتیبانی: ' + activeChat.subject
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('گفتگوی آنلاین شما با موفقیت به تیکت رسمی ارتقا یافت! کارشناسان به زودی پاسخ رسمی را در بخش «تیکت‌ها» ارائه خواهند داد.');
        setActiveChatId(null);
        await loadFreshData();
        if (setActiveTab) {
          setActiveTab('tickets');
        }
      }
    } catch (err) {
      console.error("Convert chat failure:", err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            base64Data: base64Data
          })
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          const mockLogMessage = `فایل پیوست شده: ATTACHMENT_FILE:${file.name} \nلینک فایل: ${uploadData.url}`;
          addTicketMessage(activeChat.id, mockLogMessage, 'customer');
        } else {
          alert('بارگذاری فایل متوقف شد: ' + (uploadData.error || 'خطای سرور'));
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Chat Upload err:", err);
      setIsUploading(false);
    }
  };

  const renderMessageText = (msg: string, isMe: boolean) => {
    if (msg.includes('/uploads/')) {
      const uploadRegex = /\/uploads\/[^\s)"]+/i;
      const match = msg.match(uploadRegex);
      if (match) {
        const fileUrl = getFullFileUrl(match[0]);
        let displayName = "فایل ضمیمه شده";
        const nameMatch = msg.match(/ATTACHMENT_FILE:([^\s\n]+)/);
        if (nameMatch) {
          displayName = nameMatch[1];
        } else {
          displayName = fileUrl.split('/').pop()?.split('_')[0] || "فایل";
        }
        
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl);
        return (
          <div className="space-y-1.5 text-right w-full">
            <span className="block text-[10px] text-slate-400 font-bold">فایل فرستاده شده کلاینت:</span>
            {isImage ? (
              <div className="rounded-xl overflow-hidden border border-slate-200/60 max-w-[180px] bg-white">
                <img src={fileUrl} alt={displayName} className="max-h-28 object-contain w-full cursor-zoom-in" onClick={() => window.open(fileUrl, '_blank')} />
                <div className="p-1.5 bg-slate-100 text-[9px] flex justify-between items-center text-slate-500">
                  <span className="truncate max-w-[100px]">{displayName}</span>
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">دریافت</a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[10px]">
                <Inbox className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="truncate max-w-[110px] font-bold">{displayName}</span>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline shrink-0 pr-1 border-r border-slate-200">دانلود</a>
              </div>
            )}
          </div>
        );
      }
    }
    return <p className="whitespace-pre-line leading-relaxed text-right">{msg}</p>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-45 font-sans" dir="rtl" id="floating-live-chat">
      
      {/* 1. Floating round button trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer border border-slate-700/50 hover:shadow-xl relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6 text-cyan-400" />
            </motion.div>
          ) : (
            <motion.div
              key="open-icon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center"
            >
              <Headset className="h-5 w-5 text-cyan-400" />
              <span className="text-[7.5px] font-black text-cyan-200 mt-0.5">پشتیبانی زنده</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow and unread notification counter if logged in and has active ticket messages */}
        {currentUser && generalTickets.length > 0 && (
          <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white border border-white">
            {generalTickets.length}
          </span>
        )}
      </motion.button>

      {/* 2. Embedded Slide-Over Panel Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30, x: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="absolute bottom-16 right-0 w-[340px] h-[480px] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header section with brand and statuses */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 relative">
                  <Headset className="h-5 w-5 text-cyan-450" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-900 animate-pulse"></span>
                </div>
                <div className="text-right">
                  <h4 className="text-[12px] font-extrabold text-slate-100 flex items-center gap-1">
                    <span>گفتگوی آنلاین زنده</span>
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                  </h4>
                  <span className="text-[9px] text-slate-400 font-bold block">پاسخ فنی تکنسین در چند دقیقه</span>
                </div>
              </div>
              
              {/* Close panel */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Core Body Viewport based on login status */}
            <div className="grow flex flex-col bg-slate-50 min-h-0 relative">
              {!currentUser ? (
                /* USER NOT LOGGED IN */
                <div className="grow p-6 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 px-2">
                    <h5 className="font-extrabold text-xs text-slate-800">گفتگوی امن پشتیبانی نیاز به احراز دارد</h5>
                    <p className="text-[10.5px] text-slate-500 leading-relaxed font-normal">
                      برای محافظت از حریم کار درخواست‌ها، ارسال کد اتصال و تعیین اطلاعات تکنسین، مقتضی است ابتدا وارد حساب کاربری خود شوید.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (setActiveTab) {
                        setActiveTab('auth');
                      } else {
                        // fallback
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black shadow-sm transition-all cursor-pointer"
                  >
                    ورود به حساب کاربری / عضویت سریع
                  </button>
                </div>
              ) : !activeChat ? (
                /* LOGGED IN AND NO ACTIVE CHAT SESSIONS */
                <div className="grow p-6 flex flex-col justify-center items-center text-center space-y-4">
                  <div className="h-14 w-14 bg-blue-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 px-3">
                    <h5 className="font-extrabold text-xs text-slate-800">مکالمه آنلاین زنده با تکنسین</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                      سلام {currentUser.fullName}! هیچ گفتگوی زنده فعالی روی حساب شما نیست. همین حالا برای شروع گفتگو و حل آنلاین با AnyDesk کلیک کنید.
                    </p>
                  </div>
                  <button
                    onClick={handleInitiateChat}
                    disabled={isInitiating}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-[11px] font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isInitiating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        <span>درحال ساخت کانال امن...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                        <span>شروع گفتگوی زنده با کارشناس</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* LOGGED IN AND VIEWING ACTIVE CHAT HISTORY */
                <div className="grow flex flex-col min-h-0">
                  {/* Upgrades or controls toolline */}
                  <div className="px-3 py-2 bg-indigo-50/70 border-b border-indigo-100/50 flex justify-between items-center text-[9.5px]">
                    <span className="font-bold text-indigo-850 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-indigo-600 shrink-0" />
                      <span>اتصال گفتگوی آنلاین برقرار است ({activeChat.subject})</span>
                    </span>
                    
                    <button
                      onClick={handleConvertChatToTicket}
                      disabled={isConverting}
                      title="تبدیل به تیکت رسمی درایورها جهت بررسی نهایی گروه فنی"
                      className="px-2 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-md font-black text-indigo-700 flex items-center gap-0.5 cursor-pointer transition-colors"
                    >
                      {isConverting ? (
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                      ) : (
                        <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      <span>ارتقا به تیکت رسمی</span>
                    </button>
                  </div>

                  {/* Messages Viewport Container */}
                  <div 
                    ref={scrollRef}
                    className="grow p-4 overflow-y-auto space-y-3 min-h-0 flex flex-col"
                  >
                    {activeChat.messages && activeChat.messages.map((m) => {
                      const isMe = m.senderRole === 'customer';
                      return (
                        <div 
                          key={m.id}
                          className={`flex flex-col max-w-[82%] ${isMe ? 'self-start items-start' : 'self-end items-end'}`}
                        >
                          <span className="text-[8.5px] text-slate-400 font-bold block mb-0.5 px-1">
                            {m.senderName} ({isMe ? 'شما' : m.senderRole === 'admin' ? 'پشتیبان' : 'سیستم'})
                          </span>
                          <div 
                            className={`p-2.5 rounded-2xl text-[11px] shadow-xxs ${
                              isMe 
                                ? 'bg-slate-900 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-850 rounded-tl-none'
                            }`}
                          >
                            {renderMessageText(m.message, isMe)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Simulating typing dot loading */}
                    {isTyping && (
                      <div className="self-end items-end max-w-[80%]">
                        <span className="text-[8.5px] text-slate-400 font-bold block mb-0.5 pr-1">کارشناس پشتیبان</span>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }}></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer message inputs */}
                  <form 
                    onSubmit={handleSendMessage}
                    className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
                  >
                    {/* Attachment trigger */}
                    <label className="h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 cursor-pointer relative transition-all">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        accept="image/*,.pdf,.zip,.rar,.txt"
                      />
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                      ) : (
                        <Paperclip className="h-4.5 w-4.5" />
                      )}
                    </label>

                    <input
                      type="text"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder="پیامی بنویسید (کد ریموت، تستر، تصویر)..."
                      className="grow bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400/80 rounded-xl px-3 py-2 text-[11px] outline-none transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!typedMessage.trim()}
                      className="h-10 w-10 bg-slate-900 disabled:opacity-35 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-all"
                    >
                      <Send className="h-4 w-4 transform rotate-180" />
                    </button>
                  </form>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
