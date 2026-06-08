import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, ChatMessage } from '../types';
import { ShieldAlert, Key, Send, Inbox, MessageSquare, Laptop, Headset, CornerDownLeft, Sparkles, Smile, RefreshCw, Plus, Paperclip, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupportChatProps {
  selectedTicketId: string;
  setSelectedTicketId: (id: string | null) => void;
  onNavigateToAuth?: () => void;
}

export const SupportChat: React.FC<SupportChatProps> = ({ selectedTicketId, setSelectedTicketId, onNavigateToAuth }) => {
  const { currentUser, tickets, addTicket, addTicketMessage } = useApp();
  const [typedMessage, setTypedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTicket) return;

    setIsUploading(true);

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
              activeTicket.id, 
              `ATTACHMENT_FILE:${file.name} url:${data.url}\nضمیمه فایل: ${file.name}`, 
              'customer'
            );
          } else {
            alert("خطا در بارگذاری فایل: " + (data.error || "خطای ناخواسته"));
          }
        } catch (err) {
          console.error("Upload error:", err);
          alert("خطا در برقراری ارتباط با پورتال بارگذاری سرور.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Reader error:", err);
      setIsUploading(false);
    }
  };

  // Get only general category tickets (support chat)
  const generalTickets = currentUser ? tickets.filter(t => t.createdBy === currentUser.id && t.category === 'general') : [];

  // Find active selected ticket object
  const activeTicket = generalTickets.find(t => t.id === selectedTicketId) || generalTickets[0];

  // Auto-scroll inside chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentUser) return;
    scrollToBottom();
  }, [activeTicket?.messages?.length, currentUser]);

  // Simulate "typing..." status when customer sends a message to make it feel super living
  useEffect(() => {
    if (!currentUser || !activeTicket) return;
    const msgLen = activeTicket.messages?.length || 0;
    if (msgLen > 0) {
      const lastMsg = activeTicket.messages?.[msgLen - 1];
      if (lastMsg && lastMsg.senderRole === 'customer') {
        setIsTyping(true);
        const timer = setTimeout(() => {
          setIsTyping(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTicket?.messages?.length, currentUser]);

  // Authenticated guard check
  if (!currentUser) {
    return (
      <div className="font-sans min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">نیاز به ورود به حساب کاربری</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              جهت ورود به سیستم چت زنده و هدایت خطاها به اپراتور حاضر روی خط، ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
            </p>
          </div>
          <div className="pt-2">
            {onNavigateToAuth ? (
              <button
                onClick={onNavigateToAuth}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Key className="h-4 w-4" />
                <span>انتقال به پرتال ورود و ثبت‌نام</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400 font-normal">لطفاً از دکمه بالا برای ورود به پرتال اقدام فرستید.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeTicket) return;

    // Send customer message
    addTicketMessage(activeTicket.id, typedMessage.trim(), 'customer');
    setTypedMessage('');
  };

  // Safe background ticket creator if none exist
  const handleCreateAutoChat = () => {
    const freshTicket = addTicket({
      subject: 'گفتگوی آنلاین حل خطای ویندوز',
      category: 'general',
      priority: 'medium',
      message: '',
      userName: currentUser.fullName,
      userEmail: currentUser.email,
    });
    setSelectedTicketId(freshTicket.id);
  };

  const renderMessageContent = (msgText: string, isMe: boolean) => {
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
        <div className="space-y-2">
          {msgText.includes('\n') && (
            <p className="whitespace-pre-line border-b border-dashed border-slate-200/50 pb-2 mb-1 opacity-90">
              {msgText.split('\n')[1]}
            </p>
          )}
          {isImage ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-[240px] shadow-sm">
              <img 
                src={fileUrl} 
                alt={displayName} 
                className="max-h-48 object-contain w-full cursor-zoom-in hover:brightness-95 transition-all"
                referrerPolicy="no-referrer"
                onClick={() => window.open(fileUrl, '_blank')}
              />
              <div className={`p-2 text-[10px] ${isMe ? 'bg-slate-900/40 text-slate-100' : 'bg-slate-50 text-slate-500'} flex items-center justify-between gap-2`}>
                <span className="truncate max-w-[140px] font-mono">{displayName}</span>
                <a 
                  href={fileUrl} 
                  download={displayName}
                  className="hover:underline font-extrabold text-blue-500 cursor-pointer text-[10px]"
                  target="_blank"
                  rel="noreferrer"
                >
                  دانلود
                </a>
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${isMe ? 'bg-slate-900/35 border-slate-700/50 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Inbox className="h-4 w-4" />
              </div>
              <div className="text-right overflow-hidden">
                <span className="block text-[11px] font-bold truncate max-w-[160px]">{displayName}</span>
                <a 
                  href={fileUrl} 
                  download={displayName}
                  className="text-[10px] text-blue-500 hover:underline block mt-0.5"
                  target="_blank"
                  rel="noreferrer"
                >
                  دریافت مستقیم فایل
                </a>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return <p className="whitespace-pre-line">{msgText}</p>;
  };

  return (
    <div className="font-sans min-h-[80vh] bg-slate-100 flex items-stretch py-6" dir="rtl">
      <div className="max-w-5xl w-full mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Sidebar Left: General Tickets Selection panel */}
        <div className="md:col-span-4 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                <Headset className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-extrabold text-xs text-slate-800">گفتگوهای پشتیبانی</h3>
            </div>

            {/* List entries */}
            {generalTickets.length === 0 ? (
              <div className="text-center py-8 space-y-3 text-slate-400">
                <p className="text-xs">هیچ روم چت فعالی ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                {generalTickets.map((tc) => {
                  const isActive = activeTicket?.id === tc.id;
                  const lastMsg = tc.messages?.[tc.messages.length - 1]?.message || tc.message;
                  return (
                    <button
                      key={tc.id}
                      onClick={() => setSelectedTicketId(tc.id)}
                      className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/20 shadow-xs'
                          : 'border-slate-100 bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[11px] text-slate-800 line-clamp-1">{tc.subject}</span>
                        <span className="text-[8px] bg-slate-100 text-slate-500 rounded px-1 shrink-0 font-mono">#{tc.id.substring(0, 7)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[200px] font-normal">{lastMsg}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleCreateAutoChat}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>شروع گفتگوی جدید</span>
            </button>
          </div>
        </div>

        {/* Main Chat Frame Right */}
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
          {activeTicket ? (
            <>
              {/* Header inside chat */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xs select-none shadow">
                    اپ
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">{activeTicket.subject}</h4>
                    <span className="text-[9px] text-slate-400">اپراتور پشتیبان شبانه روزی EasyDriver آنلاین است</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-emerald-505/15 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                    Live Chat Mode
                  </span>
                </div>
              </div>

              {/* Chat Messages scroll yard */}
              <div className="grow p-4 overflow-y-auto space-y-4 bg-slate-50/50 min-h-[350px] max-h-[500px]">
                {activeTicket.messages?.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2.5 items-end`}
                    >
                      {/* Left side profile bubble */}
                      {!isMe && (
                        <div className="h-7 w-7 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-[10px] select-none shrink-0 mb-1">
                          پش
                        </div>
                      )}

                      <div className="space-y-1 max-w-[75%]">
                        {/* Sender info */}
                        <span className="block text-[8px] text-slate-400 font-bold px-1 text-right">
                          {isMe ? 'شما' : msg.senderName}
                        </span>
                        
                        {/* Bubble content */}
                        <div
                          className={`p-3 rounded-2xl text-xs font-normal leading-relaxed ${
                            isMe
                              ? 'bg-blue-620 text-white rounded-br-none shadow-sm shadow-blue-600/5'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xxs'
                          }`}
                        >
                          {renderMessageContent(msg.message, isMe)}
                        </div>

                        {/* Timestamp */}
                        <span className="block text-[8px] text-slate-350 px-1 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                    </div>
                  );
                })}

                {/* Animated Typing Bubble simulation */}
                {isTyping && (
                  <div className="flex justify-start gap-2.5 items-end">
                    <div className="h-7 w-7 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                      پش
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-none flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-slate-450 rounded-full animate-bounce" />
                      <span className="h-1.5 w-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 bg-slate-450 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 shrink-0 bg-white flex items-center gap-2">
                <label className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl cursor-pointer transition-all flex items-center justify-center shrink-0 shadow-sm" title="ارسال فایل ضمیمه">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    accept="image/*,.pdf,.txt,.zip,.rar"
                  />
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </label>

                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="پیام خود را به مهندس پشتیبان بنویسید..."
                  className="grow px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs outline-none focus:bg-white focus:border-blue-600 transition-all font-normal"
                />
                
                <button
                  type="submit"
                  disabled={!typedMessage.trim()}
                  className="p-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-2xl shrink-0 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4 rotate-180" />
                </button>
              </form>
            </>
          ) : (
            <div className="grow p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-slate-800 text-sm">اتصال به چت آنلاین</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  لطفاً با فشردن دکمه زیر یک تیکت چت جدید ایجاد کنید تا خط گفتگوی آنلاین شما با کارشناس فعال گردد.
                </p>
              </div>
              <button
                onClick={handleCreateAutoChat}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                ایجاد کانال گفتگوی آنلاین زنده
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
