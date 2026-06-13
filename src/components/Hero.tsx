import React, { useState, useEffect, useRef } from 'react';
import { 
  Laptop, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  ArrowDown, 
  Zap, 
  RefreshCw, 
  Cpu, 
  Headphones, 
  Activity, 
  Sparkles, 
  Compass, 
  Shield, 
  Check, 
  Search, 
  Wrench,
  Gauge,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Terminal,
  MousePointerClick,
  Monitor
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';
import { RobotLandingCanvas } from './RobotLandingCanvas';

interface HeroProps {
  setActiveTab: (tab: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ setActiveTab }) => {
  const { reviews } = useApp();
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Simulator States
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedDrivers, setDetectedDrivers] = useState<{ name: string; status: 'outdated' | 'optimal'; version: string; type: string }[]>([]);
  const [activeDiagnosticTab, setActiveDiagnosticTab] = useState<'gpu' | 'audio' | 'chipset'>('gpu');

  // Unified Scroll Tracking state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Load approved reviews
  const approvedReviews = reviews.filter(r => r.isApproved);

  useEffect(() => {
    if (approvedReviews.length === 0) return;
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % approvedReviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [approvedReviews.length]);

  // Handle local scrolling inside the main Hero container
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const currentScroll = -rect.top;
      const maxScroll = rect.height - window.innerHeight;
      
      if (maxScroll > 0) {
        // Calculate precise 0 to 1 scroll position
        const progress = Math.max(0, Math.min(1, currentScroll / maxScroll));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // Initial execution trace
    setTimeout(() => {
      handleScroll();
    }, 150);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Card Mouse Parallax Effect for details card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-10, 10]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Run real-time diagnostic scanning sequence
  const startSimulation = () => {
    if (scanStep === 'scanning' || scanStep === 'analyzing') return;
    
    setScanStep('scanning');
    setScanProgress(0);
    setDetectedDrivers([]);

    // Query actual client hardware parameters
    const getRealGPU = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const rawGpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (rawGpu) {
              if (rawGpu.includes("NVIDIA")) return rawGpu.split("/")[0].trim();
              if (rawGpu.includes("AMD") || rawGpu.includes("Radeon")) return "AMD Radeon XT Accelerator";
              if (rawGpu.includes("Apple")) return "Apple Silicon Graphics core";
              return rawGpu;
            }
          }
        }
      } catch (e) {}
      return 'NVIDIA GeForce RTX Engine';
    };

    const getRealOS = () => {
      const ua = navigator.userAgent;
      if (ua.includes("Windows NT 10.0")) {
        return ua.includes("Windows NT 10.0; Win64") ? "Windows 11 (64-bit)" : "Windows 10 Operating System";
      }
      if (ua.includes("Macintosh")) return "macOS Intel Desktop";
      if (ua.includes("Linux")) return "Linux Kernel OS";
      return "Windows OS";
    };

    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as any).deviceMemory || 16;
    const isOnlineState = navigator.onLine ? "اتصال اینترنت پایدار" : "عدم اتصال محلی";

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setScanStep('analyzing');
        setTimeout(() => {
          setDetectedDrivers([
            { name: getRealGPU(), status: 'outdated', version: 'v528.24 (نیازمند آپدیت ریموت)', type: 'شتاب‌دهنده گرافیک' },
            { name: `${cores} Cores CPU System Logic`, status: 'optimal', version: 'پایدار و معتبر', type: 'پردازشگر مرکزی' },
            { name: `DDR Volatile RAM (${memory} GB Verified)`, status: 'optimal', version: 'سرعت تراکنش عالی', type: 'حافظه موقت' },
            { name: `${getRealOS()}`, status: 'outdated', version: `${isOnlineState}`, type: 'سیستم‌عامل فرعی' }
          ]);
          setScanStep('complete');
        }, 1100);
      }
      setScanProgress(Math.min(progress, 100));
    }, 80);
  };

  const stats = [
    { value: '۴,۸۰۰+', label: 'خدمت نصب موفق ریموت', icon: Zap, color: 'text-amber-400 bg-amber-400/10' },
    { value: '۱۰۰٪', label: 'رضایت خریداران', icon: Star, color: 'text-emerald-400 bg-emerald-400/10' },
    { value: '۱۲ک+', label: 'کاربر فعال ثبتی', icon: Users, color: 'text-blue-400 bg-blue-400/10' },
  ];

  const services = [
    {
      title: 'نصب خودکار درایورهای مادربرد و گرافیک',
      description: 'شناسایی و تزریق اورجینال‌ترین بسته‌های درایور سازگار با مدل دقیق لپ‌تاپ یا سیستم دسکتاپ از راه دور بدون ریسک صفحه آبی مرگ (BSOD).',
      icon: Cpu,
      gradient: 'from-blue-600 to-indigo-650',
      badge: 'پرطرفدار ترین',
    },
    {
      title: 'نصب و معتبرسازی دائم برنامه‌ها',
      description: 'نصب تمامی ابزارهای مهندسی عمران، متلب، مهندسی مکانیک، معماری، گرافیکی نظیر اتوکد و ادوبی به همراه فعال‌سازی آفلاین اصولی.',
      icon: Laptop,
      gradient: 'from-purple-650 to-pink-600',
      badge: 'پشتیبانی ویژه',
    },
    {
      title: 'ریموت اختصاصی و فوق‌امن AnyDesk',
      description: 'فرآیند اتصال محافظت‌شده؛ شما بر روی مانیتور خود به صورت ۱۰۰٪ نظارت داشته و هر زمان که اراده کنید اتصال قطع می‌گردد.',
      icon: Headphones,
      gradient: 'from-emerald-500 to-teal-500',
      badge: 'پشتیبانی فوری',
    },
  ];

  return (
    <div ref={containerRef} className="font-sans min-h-screen bg-slate-950 text-white relative selection:bg-indigo-500/30" dir="rtl">
      
      {/* Dynamic 3D Immersive Split-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-screen">
        
        {/* ==========================================
            LEFT SIDE: STICKY 3D ROBOT LANDING CANVAS
            ========================================== */}
        <div className="lg:col-span-5 h-[340px] sm:h-[420px] lg:h-screen lg:sticky lg:top-0 w-full bg-slate-950 border-b lg:border-b-0 lg:border-l border-slate-900 overflow-hidden relative z-20 shadow-[0_4px_30px_rgba(0,0,0,0.4)] md:shadow-none">
          
          {/* Subtle Cyber Grid Backdrops inside sticky column */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1.5px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none opacity-80" />
          
          <RobotLandingCanvas scrollProgress={scrollProgress} setActiveTab={setActiveTab} />

          {/* Scrolling Helper Badge overlay */}
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-slate-800/80 rounded-xl px-3 py-1.5 backdrop-blur-md flex items-center gap-1.5 pointer-events-none shadow-lg">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] text-slate-300 font-extrabold">ارتباط زنده ۳ بعدی: روشن</span>
          </div>

          {/* Mouse hover cue on mobile */}
          <div className="absolute bottom-4 left-4 block lg:hidden bg-slate-900/90 border border-slate-850 rounded-xl px-2.5 py-1 text-[9px] text-slate-400 font-bold backdrop-blur-sm shadow-md">
            🔽 اسکرول کنید تا انیمیشن تغییر کند
          </div>
        </div>

        {/* ==========================================
            RIGHT SIDE: SCROLLABLE CORE COPY & FLOW PANELS
            ========================================== */}
        <div className="lg:col-span-7 relative z-10 bg-slate-950 px-4 sm:px-8 lg:px-14 py-10 lg:py-16 space-y-24">
          
          {/* Neon cosmic blurs */}
          <div className="absolute top-[10%] right-[-10%] w-[450px] h-[450px] bg-gradient-to-tr from-purple-600/10 to-indigo-600/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
          <div className="absolute top-[50%] left-[-10%] w-[380px] h-[380px] bg-gradient-to-tr from-cyan-500/5 to-teal-400/8 blur-[110px] rounded-full -z-10 pointer-events-none" />

          {/* 1. INTRODUCTION HERO PANEL */}
          <section className="space-y-8 pt-4">
            
            {/* Super premium floating badge with motion bounce */}
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900/85 border border-slate-800 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.12)] text-xs backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin duration-3000 shrink-0" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-indigo-300 font-bold">سامانه‌ یکپارچه و هوشمند خدمات ریموت رایانه‌ای</span>
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-3.5xl sm:text-5xl xl:text-5.5xl font-black tracking-tight leading-[1.25] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-350">
                سلامت سیستم شما، <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-[0_2px_15px_rgba(99,102,241,0.15)]">
                  هماهنگ با اسکرول زمان!
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal max-w-xl">
                دیگر نیازی به کابل‌کشی مجدد کیس یا جابجایی لپ‌تاپ به مراکز سنتی بازار ندارید. تکنسین‌های ارشد ما به کمک پروتکل‌های AnyDesk، روان‌ترین بسته‌ها و پایداری لایسنس‌ها را با مانیتورینگ زنده شخص شما نهایی می‌کنند.
              </p>
            </div>

            {/* Scrolling Trigger Cue */}
            <div className="p-4 bg-slate-900/40 border border-slate-850/80 rounded-2xl max-w-xl text-right space-y-1.5 flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 mt-0.5 animate-bounce">
                <ArrowDown className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-100">جهت بیدار کردن ربات اسکرول کنید!</h4>
                <p className="text-[10px] text-slate-400">انیمیشن ربات سمت چپ دقیقا همزمان با اسکرول صفحه تغییر حالت داده و فرآیند عیب‌یابی را شبیه‌سازی می‌کند.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setActiveTab('new-request')}
                className="relative px-7 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-750 hover:to-purple-750 text-white rounded-2xl text-[11px] sm:text-xs font-black shadow-[0_4px_25px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_35px_rgba(99,102,241,0.5)] transition-all flex items-center gap-2 group cursor-pointer overflow-hidden border border-white/5"
              >
                <span>شروع و ارسال فوری سفارش ریموت</span>
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => setActiveTab('tickets')}
                className="px-7 py-3.5 bg-slate-900 hover:bg-slate-855 text-slate-350 hover:text-white border border-slate-800/80 hover:border-slate-700/80 rounded-2xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-inner"
              >
                <span>مکالمه با واحد مهندسی</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3.5 pt-6 border-t border-slate-900/80 max-w-xl">
              {stats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="p-3 bg-slate-900/30 rounded-2xl border border-slate-900/60 backdrop-blur-sm space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1 rounded-md ${s.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-black text-slate-200">{s.value}</span>
                    </div>
                    <span className="text-[9px] text-slate-450 font-semibold block">{s.label}</span>
                  </div>
                );
              })}
            </div>

          </section>

          {/* 2. CORE SERVICES PANELS */}
          <section className="space-y-8 border-t border-slate-900/80 pt-12">
            
            <div className="space-y-2">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block">کاتالوگ خدمات تخصصی</span>
              <h2 className="text-xl sm:text-2.5xl font-black text-slate-100">سرویس‌های قابل واگذاری ریموت</h2>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                ما بستری جامع برای حل عیوب گرافیک، پورت کام و نصب برنامه‌های تخصصی به دور از بدافزارها داریم.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map((srv, idx) => {
                const SrvIcon = srv.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="p-5.5 bg-slate-900/40 rounded-2.5xl border border-slate-850/60 hover:border-slate-800 hover:bg-slate-900/70 transition-all duration-300 flex flex-col justify-between items-start text-right space-y-4 relative group"
                  >
                    <span className="absolute top-4 left-4 text-[8px] bg-slate-850 text-indigo-300 font-extrabold px-1.5 py-0.5 rounded">
                      {srv.badge}
                    </span>

                    <div className="space-y-3 pt-2">
                      <div className={`p-2.5 bg-gradient-to-br ${srv.gradient} text-white rounded-xl shadow-md w-fit`}>
                        <SrvIcon className="h-4.5 w-4.5" />
                      </div>
                      
                      <h3 className="text-xs sm:text-sm font-black text-slate-150 group-hover:text-white transition-colors">
                        {srv.title}
                      </h3>
                      
                      <p className="text-[10px] text-slate-400 leading-relaxed font-normal line-clamp-3">
                        {srv.description}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setActiveTab('new-request')}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer pt-1"
                    >
                      <span>ثبت درخواست</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

          </section>

          {/* 3. INTERACTIVE BROWSER HARDWARE DIAGNOSTIC STATION */}
          <section className="space-y-8 border-t border-slate-900/80 pt-12">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-[9px] text-rose-400 font-bold uppercase tracking-wider">شبیه‌سازی زنده</span>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">ابزار عیب‌یابی آزمایشی مرورگر</span>
              </div>
              <h2 className="text-xl sm:text-2.5xl font-black text-slate-100">تحلیل فنی و عیب‌یابی آنی سیستم شما</h2>
              <p className="text-[11px] text-slate-400 font-normal">
                برقراری ارتباط دوطرفه سخت‌افزاری! با اجرای تست زیر، دیتای گرافیکی فعلی شما استخراج شده و همزمان ربات ۳بعدی سمت چپ با بیشترین دور سرعت شروع به بهینه‌سازی می‌کند.
              </p>
            </div>

            <motion.div
              style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-[28px] p-5 sm:p-6 shadow-xl relative overflow-hidden text-right"
            >
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t border-l border-indigo-500/40 pointer-events-none" />
              <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t border-r border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b border-l border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b border-r border-indigo-500/40 pointer-events-none" />

              {scanStep === 'scanning' && (
                <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] z-20 animate-pulse" style={{ top: `${scanProgress}%` }} />
              )}

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Monitor className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-150">بررسی پورت مانیتورینگ محلی</h3>
                    <span className="text-[9px] text-indigo-400 font-mono">PCI-NODE CONTROLLER v3.8</span>
                  </div>
                </div>
              </div>

              {/* Station Body */}
              <div className="min-h-[170px] flex flex-col justify-between">
                
                {scanStep === 'idle' && (
                  <div className="text-center py-4 space-y-4">
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                      بخش مورد نظر را انتخاب و دکمه عیب‌یابی را فشار دهید تا تداخل سیستم به شما نشان داده شود.
                    </p>

                    <div className="flex justify-center gap-2">
                      {(['gpu', 'audio', 'chipset'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveDiagnosticTab(tab)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            activeDiagnosticTab === tab ? 'bg-indigo-600 text-white shadow' : 'bg-slate-850/85 text-slate-400 hover:text-slate-205'
                          }`}
                        >
                          {tab === 'gpu' ? 'شتاب‌دهنده گرافیک' : tab === 'audio' ? 'کارت صدای مادربرد' : 'باس چیپست اصلی'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={startSimulation}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all shadow-md hover:scale-103 mx-auto flex items-center gap-2 cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>کنکاش و عیب‌یابی آنلاین {activeDiagnosticTab === 'gpu' ? 'کارت گرافیک' : activeDiagnosticTab === 'audio' ? 'کارت صدا' : 'چیپست اصلی'}</span>
                    </button>
                  </div>
                )}

                {scanStep === 'scanning' && (
                  <div className="py-4 space-y-3 text-center">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 rounded-full border border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-t border-indigo-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-indigo-400">
                        {scanProgress}%
                      </div>
                    </div>
                    <p className="text-[11px] text-indigo-300 font-bold animate-pulse">
                      در حال دریافت کدهای سخت‌افزاری PCI/VEN ...
                    </p>
                  </div>
                )}

                {scanStep === 'analyzing' && (
                  <div className="py-6 space-y-2 text-center">
                    <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto mb-1" />
                    <p className="text-[11px] text-blue-300 font-bold">
                      یافتن همپوشانی و خطاهای رجیستری مادربرد...
                    </p>
                  </div>
                )}

                {scanStep === 'complete' && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-[10px] flex items-center gap-2 font-bold justify-center">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>تحلیل موفقیت‌آمیز! فایل‌های ناسازگار با موفقیت رهگیری شدند</span>
                    </div>

                    <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-850 max-h-[120px] overflow-y-auto font-mono text-[9px] text-slate-300">
                      {detectedDrivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-1 select-text">
                          <span className="font-semibold text-slate-200">{driver.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-sans ${
                            driver.status === 'outdated' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {driver.status === 'outdated' ? 'درایور معیوب/قدیمی' : 'پایدار اورجینال'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={startSimulation}
                        className="py-2 bg-transparent border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-[9px] w-1/3 transition-all cursor-pointer font-bold"
                      >
                        تست مجدد
                      </button>
                      <button
                        onClick={() => setActiveTab('new-request')}
                        className="py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-black text-slate-950 rounded-lg text-[10px] w-2/3 shadow flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>تحویل پرونده به مهندس از راه دور</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>

          </section>

          {/* 4. STANDARDS & BENTO GRID ADVANTAGES */}
          <section className="space-y-8 border-t border-slate-900/80 pt-12">
            
            <div className="space-y-2">
              <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest block">مزیت رقابتی ما (standards)</span>
              <h2 className="text-xl sm:text-2.5xl font-black text-slate-100">چرا هزاران کاربر به خدمات ما تکیه دارند؟</h2>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                امنیت، سرعت و دسترسی بدون محدودیت مزیتی است که به صورت تضمینی برای شما فراهم کرده‌ایم.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 space-y-2 text-right">
                <div className="h-8 w-8 bg-blue-500/15 text-blue-400 rounded-xl flex items-center justify-center">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-extrabold text-xs text-slate-150">بدون نیاز به خروج از منزل</h4>
                <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                  سیستم خود را در خانه بگذارید. با امن‌ترین استاندارد ریموت بدون کوچکترین دغدغه ترافیک خدمات بگیرید.
                </p>
              </div>

              <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 space-y-2 text-right">
                <div className="h-8 w-8 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-extrabold text-xs text-slate-150">ضمانت فایل و پایداری ویندوز</h4>
                <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                  سورس برنامه‌ها کاملا هماهنگ، تست‌شده و عاری از هرگونه ویروس یا تروجان استخراج و بر سیستم شما فعال می‌شوند.
                </p>
              </div>

              <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 space-y-2 text-right">
                <div className="h-8 w-8 bg-purple-500/15 text-purple-400 rounded-xl flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-extrabold text-xs text-slate-150">تحویل آنی و سریع ریموت</h4>
                <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                  تکنسین متخصص بلافاصله بعد از بررسی اولیه ادمین با شما هماهنگ شده و اقدامات لایسنسینگ را نهایی می‌کند.
                </p>
              </div>

              <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 space-y-2 text-right">
                <div className="h-8 w-8 bg-amber-500/15 text-amber-400 rounded-xl flex items-center justify-center">
                  <Star className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-extrabold text-xs text-slate-150">پرداخت امن به همراه پشتیبانی مکرر</h4>
                <p className="text-[10px] text-slate-450 leading-relaxed font-normal">
                  در صورت حل نشدن مشکل مبالغ تحت نظر شما عودت داده شده و تیکت‌ها مکررا بازبینی می‌گردند.
                </p>
              </div>

            </div>

          </section>

          {/* 5. CUSTOMER TESTIMONIALS CAROUSEL */}
          {approvedReviews.length > 0 && (
            <section className="space-y-6 border-t border-slate-900/80 pt-12">
              
              <div className="space-y-1">
                <span className="text-[9px] bg-slate-900 text-indigo-300 font-extrabold px-2.5 py-1 rounded mb-2 block w-fit">
                  تاییدهای نهایی مشتریان (Testimonials)
                </span>
                <h2 className="text-xl font-black text-slate-200">صدا و اعتماد کاربران ما</h2>
              </div>

              <div className="bg-gradient-to-tr from-slate-900 to-slate-850 border border-slate-800 rounded-2.5xl p-6 relative overflow-hidden shadow-lg">
                <div className="absolute top-2 left-4 text-slate-850 font-serif text-7xl select-none leading-none opacity-40">
                  ”
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentReviewIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex gap-0.5">
                      {[...Array(approvedReviews[currentReviewIndex].rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal italic select-text">
                      « {approvedReviews[currentReviewIndex].comment} »
                    </p>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <h4 className="text-[11px] font-black text-white">
                          {approvedReviews[currentReviewIndex].customerName}
                        </h4>
                        {approvedReviews[currentReviewIndex].serviceType && (
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            سرویس: {approvedReviews[currentReviewIndex].serviceType === 'driver_install' ? 'نصب درایور سخت‌افزار' : 'برنامه‌های کاربردی'}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Arrow slide keys */}
                <div className="flex justify-end gap-1.5 mt-4">
                  <button
                    onClick={() =>
                      setCurrentReviewIndex(
                        (prev) => (prev === 0 ? approvedReviews.length - 1 : prev - 1)
                      )
                    }
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-850"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentReviewIndex((prev) => (prev + 1) % approvedReviews.length)
                    }
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-850"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

            </section>
          )}

          {/* 6. FAQ ACCORDION SECTION */}
          <section className="space-y-8 border-t border-slate-900/80 pt-12">
            
            <div className="space-y-2">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block">سوالات متداول (FAQ)</span>
              <h2 className="text-xl sm:text-2.5xl font-black text-slate-100">پاسخ به دغدغه‌های مکرر شما</h2>
              <p className="text-[11px] text-slate-400">
                هر آنچه در مورد امنیت اتصال، گارانتی تراکنش‌ها و نحوه کار باید بدانید.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "چه خدماتی در ایزی‌درایور (EasyDriver) ارائه می‌شود؟",
                  a: "ایزی‌درایور پوم تخصصی نصب، بروزرسانی و تنظیم صحیح درایورهای سخت‌افزاری انواع سیستم‌ها و نصب برنامه‌های سنگین مهندسی نظیر متلب، در محیط‌های AnyDesk با فعال‌سازی و لایسنس همیشگی است."
                },
                {
                  q: "امنیت فرآیند اتصال از راه دور چگونه تایید می‌شود؟",
                  a: "اتصال کاملاً دوطرفه و مشروط بر تایید مکرر با AnyDesk است. شخص شما در حال نظارت زنده تمام کلیک‌های مهندسی مانیتور خود بوده و با بستن پنجره ریموت بلافاصله اتصال در لحظه قطع و غیرقابل برگشت می‌شود."
                },
                {
                  q: "شیوه‌های ضمانت تراکنش‌ها به چه صورت است؟",
                  a: "تمامی خدمات فازهای تسویه ایزی‌درایور در برگیرنده گارانتی بازگشت ۱۰۰٪ تراکنش‌های مالی در صورت عدم قابلیت ارتقا سخت‌افزار توسط متخصص ارشد فنی است."
                }
              ].map((item, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div 
                    key={index} 
                    className="bg-slate-900/40 border border-slate-850/80 rounded-xl overflow-hidden transition-all hover:border-slate-750"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full p-4 text-right flex items-center justify-between gap-3 font-black text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span>{item.q}</span>
                      </div>
                      <div className="p-1.5 bg-slate-850 rounded-lg text-slate-400">
                        {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="p-4 pt-0 border-t border-slate-850/40 text-[10px] text-slate-400 leading-relaxed select-text">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

          </section>

          {/* 7. CTA DIRECT TECHNICAL ACTIONS */}
          <section className="space-y-6 border-t border-slate-900/80 pt-12">
            
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-tr from-slate-900 to-indigo-950/20 border border-slate-850 p-6 sm:p-8 space-y-4 rounded-3xl"
            >
              <h3 className="text-lg font-black text-slate-100">نیاز به مشورت مستقیم و فوری دارید؟</h3>
              <p className="text-[11px] text-slate-450 leading-relaxed font-normal">
                مهندسین پشتیبان اورژانس ایزی‌درایور به صورت مستمر پاسخگوی ابهامات شما هستند. درایور نادرست بر روی سیستم دارید؟ ویندوز شما کند کار می‌کند؟ بلافاصله تیکت خود را ثبت یا چت زنده را آغاز کنید.
              </p>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-right flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[10px] text-slate-400 font-bold">ارتباط تلفنی مستقیم با مدیریت مـجموعه:</span>
                <span className="text-xs sm:text-sm font-black text-indigo-300 font-mono hover:text-white transition-colors">۰۹۹۲۱۷۵۸۵۰۵</span>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="px-5 py-3 bg-white text-slate-950 hover:bg-slate-100 text-[10px] sm:text-xs font-black rounded-xl transition-all cursor-pointer shadow hover:shadow-white/5"
                >
                  ایجاد تیکت عیب‌یابی مکرر
                </button>
                <button
                  onClick={() => setActiveTab('support-chat')}
                  className="px-5 py-3 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 text-[10px] sm:text-xs font-bold rounded-xl transition-all border border-slate-750 cursor-pointer"
                >
                  شروع چت برخط با اپراتور فنی
                </button>
              </div>
            </motion.div>

          </section>

        </div>

      </div>

    </div>
  );
};
