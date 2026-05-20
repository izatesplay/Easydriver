import React, { useState, useEffect, useRef } from 'react';
import { 
  Laptop, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
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
  Gauge
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';

interface HeroProps {
  setActiveTab: (tab: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ setActiveTab }) => {
  const { reviews } = useApp();
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  
  // Interactive Simulator States
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedDrivers, setDetectedDrivers] = useState<{ name: string; status: 'outdated' | 'optimal'; version: string; type: string }[]>([]);
  const [activeDiagnosticTab, setActiveDiagnosticTab] = useState<'gpu' | 'audio' | 'chipset'>('gpu');

  // Load approved reviews
  const approvedReviews = reviews.filter(r => r.isApproved);

  useEffect(() => {
    if (approvedReviews.length === 0) return;
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % approvedReviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [approvedReviews.length]);

  // Card Mouse Parallax Effect hook-like setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-15, 15]), springConfig);

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

  // Run a real-time smart browser hardware diagnostic scanning sequence
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
              // Extract a readable name
              if (rawGpu.includes("NVIDIA")) return rawGpu.split("/")[0].trim();
              if (rawGpu.includes("AMD") || rawGpu.includes("Radeon")) return "AMD Radeon Series Accelerator";
              if (rawGpu.includes("Apple")) return "Apple Silicon Integrated GPU";
              return rawGpu;
            }
          }
        }
      } catch (e) {}
      return 'NVIDIA GeForce Graphics Driver';
    };

    const getRealOS = () => {
      const ua = navigator.userAgent;
      if (ua.includes("Windows NT 10.0")) {
        return ua.includes("Windows NT 10.0; Win64") ? "Windows 11 Professional (64-bit)" : "Windows 10 System";
      }
      if (ua.includes("Macintosh")) return "Apple macOS Desktop";
      if (ua.includes("Linux")) return "GNU/Linux Kernel OS";
      return "Windows Core operating System";
    };

    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as any).deviceMemory || 16;
    const isOnlineState = navigator.onLine ? "اتصال اینترنت پایدار" : "عدم اتصال محلی";

    // Progressive scanning increment
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 12) + 6;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Transition to analyzing
        setScanStep('analyzing');
        setTimeout(() => {
          setDetectedDrivers([
            { name: getRealGPU(), status: 'outdated', version: 'v528.24 (قدیمی)', type: 'شتاب‌دهنده گرافیک' },
            { name: `${cores} Cores System CPU Handler`, status: 'optimal', version: 'پایدار و هوشمند', type: 'پردازشگر مرکزی' },
            { name: `DDR System RAM (${memory} GB Verified)`, status: 'optimal', version: 'سرعت تراکنش عالی', type: 'ماژول حافظه موقت' },
            { name: `${getRealOS()}`, status: 'outdated', version: `${isOnlineState}`, type: 'سیستم‌عامل فرعی' }
          ]);
          setScanStep('complete');
        }, 1200);
      }
      setScanProgress(Math.min(progress, 100));
    }, 100);
  };

  const stats = [
    { value: '۴,۸۰۰+', label: 'خدمت نصب موفق ریموت', icon: Zap, color: 'text-amber-500 bg-amber-500/10' },
    { value: '۱۰۰٪', label: 'رضایت خریداران', icon: Star, color: 'text-emerald-500 bg-emerald-500/10' },
    { value: '۱۲ک+', label: 'کاربر فعال ثبتی', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  ];

  const services = [
    {
      title: 'نصب هوشمند درایورهای سخت‌افزار',
      description: 'شناسایی خودکار و تزریق باکیفیت‌ترین بسته‌های درایور اورجینال سازگار با مدل دقیق لپ‌تاپ یا مادربورد بدون ریسک صفحه آبی مرگ (BSOD).',
      icon: Cpu,
      gradient: 'from-blue-600 via-cyan-550 to-teal-500 border-cyan-100',
      badge: 'پرطرفدار ترین',
    },
    {
      title: 'حل عیوب و فعال‌سازی دائمی لایسنس',
      description: 'نصب برنامه‌های سنگین، نرم‌افزارهای مهندسی عمران، معماری، گرافیک و اداری با فعال‌سازی اصولی و دائم به دور از بدافزارها.',
      icon: Laptop,
      gradient: 'from-purple-650 via-purple-600 to-pink-600 border-purple-150',
      badge: 'تضمینی ویژه',
    },
    {
      title: 'اتصال ریموت محافظت‌شده AnyDesk',
      description: 'ارائه راهکار در قالب کانال امن و اختصاصی، نظارت کامل صفر تا صد شما روی نمایشگر، همراه با چت زنده و فاکتور شفاف سیستمی.',
      icon: Headphones,
      gradient: 'from-emerald-500 via-teal-500 to-blue-500 border-emerald-100',
      badge: 'پشتیبانی زنده',
    },
  ];

  return (
    <div className="font-sans min-h-screen bg-slate-950 text-white relative overflow-hidden" dir="rtl">
      
      {/* 3D background elements with extreme premium feeling */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/15 to-blue-600/10 blur-[130px] rounded-full -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 to-teal-400/15 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-indigo-505/10 blur-[140px] rounded-full -z-10" />

      {/* Decorative Grid Patterns for subtle tech feel */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* Hero Section Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 md:pt-20 md:pb-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Dynamic Text Elements */}
          <div className="lg:col-span-6 space-y-8 text-right">
            
            {/* Super creative premium floating badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/85 border border-slate-800 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.15)] text-slate-205 text-xs font-semibold backdrop-blur-md"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin duration-3000" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-indigo-350">اولین سامانه‌ هوشمند اورژانسی درایورها از راه دور</span>
            </motion.div>

            {/* Glowing Main Heading */}
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.25] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-350"
              >
                سلامت سیستم شما، <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-[0_2px_15px_rgba(99,102,241,0.2)]">
                  در ۳ فاز کاملاً آنلاین!
                </span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl font-medium"
              >
                دیگر نیاز به جدا کردن سیم‌کشی‌های کیس یا حمل پر دردسر لپ‌تاپ به بازار ندارید! با ایزی‌درایور، مهندسان فوق‌ارشد ما با امن‌ترین پروتکل ریموت متصل شده، سخت‌ترین درایورها و نقص‌های سیستمی را فوری برایتان شاداب و هموار می‌کنند.
              </motion.p>
            </div>

            {/* Futuristic Magnetic Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <button
                onClick={() => setActiveTab('new-request')}
                className="relative px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-750 hover:to-purple-750 text-white rounded-2xl text-xs sm:text-sm font-black shadow-[0_4px_25px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_35px_rgba(99,102,241,0.6)] transition-all flex items-center gap-2.5 group cursor-pointer overflow-hidden border border-white/10"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                <span>شروع و سفارش درایور ریموت</span>
                <ArrowLeft className="h-4.5 w-4.5 group-hover:-translate-x-1.5 transition-transform" />
              </button>
              
              <button
                onClick={() => setActiveTab('tickets')}
                className="px-8 py-4 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-inner"
              >
                <span>مشاوره و پشتیبانی چت زنده</span>
              </button>
            </motion.div>

            {/* Staggered Stats row */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-900/90"
            >
              {stats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="space-y-1.5 p-3.5 bg-slate-900/40 rounded-2xl border border-slate-900/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${s.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-base sm:text-lg font-black text-slate-100">{s.value}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold block">{s.label}</span>
                  </div>
                );
              })}
            </motion.div>

          </div>

          {/* Right Side: The Interactive 3D Hologram Diagnostic Station */}
          <div className="lg:col-span-6 flex justify-center items-center">
            
            <motion.div
              style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-lg bg-slate-900/60 border border-slate-800 rounded-[35px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-lg relative overflow-hidden group/card text-right"
            >
              {/* Outer neon scanner ring */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none rounded-[35px]" />
              
              {/* Animated corner decorations */}
              <div className="absolute top-5 left-5 w-4 h-4 border-t-2 border-l-2 border-indigo-500/40 pointer-events-none" />
              <div className="absolute top-5 right-5 w-4 h-4 border-t-2 border-r-2 border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-5 left-5 w-4 h-4 border-b-2 border-l-2 border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-5 right-5 w-4 h-4 border-b-2 border-r-2 border-indigo-500/40 pointer-events-none" />

              {/* Holographic scanner laser line when active */}
              {scanStep === 'scanning' && (
                <motion.div 
                  initial={{ y: -20 }}
                  animate={{ y: '280px' }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#22d3ee] z-20"
                />
              )}

              {/* Station header layout */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <Gauge className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">شبیه‌ساز آنلایـن عیب‌یاب</span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-100">تحلیل سازگاری و سلامت سخت‌افزار مـحیطی</h3>
                  </div>
                </div>
                
                <span className="text-[9px] bg-slate-800 px-2 py-1 rounded-lg text-slate-400 font-mono">
                  EASY-STATION v4
                </span>
              </div>

              {/* Simulation Content Body */}
              <div className="space-y-5 min-h-[220px] flex flex-col justify-between">
                
                {scanStep === 'idle' && (
                  <div className="text-center py-6 space-y-4">
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      شخصاً سخت‌افزار کامپیوتر خود را تست کنید! دکمه اسکن زیر را بـزنید تا ابزار هوشمند ما، درایورهای نیازمند آپدیت را نشان دهد.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setActiveDiagnosticTab('gpu')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          activeDiagnosticTab === 'gpu' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-850 text-slate-400 hover:text-slate-250'
                        }`}
                      >
                        کارت گرافیک
                      </button>
                      <button
                        onClick={() => setActiveDiagnosticTab('audio')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          activeDiagnosticTab === 'audio' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-850 text-slate-400 hover:text-slate-250'
                        }`}
                      >
                        کارت صدا
                      </button>
                      <button
                        onClick={() => setActiveDiagnosticTab('chipset')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          activeDiagnosticTab === 'chipset' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-850 text-slate-400 hover:text-slate-250'
                        }`}
                      >
                        مادربورد
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={startSimulation}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] flex items-center gap-2 mx-auto cursor-pointer"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>اسکن نمادین کارت {activeDiagnosticTab === 'gpu' ? 'گرافیـک' : activeDiagnosticTab === 'audio' ? 'صـدا' : 'مادربـورد'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {scanStep === 'scanning' && (
                  <div className="py-6 space-y-4 text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-indigo-400">
                        {scanProgress}%
                      </div>
                    </div>
                    <p className="text-xs text-indigo-200 font-bold tracking-wide animate-pulse">
                      ... در حال دریافت و شناسایی کدهای سخت‌افزاری PCI/VEN ...
                    </p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      سیستم هوشمند ایزی‌درایور در حال بازیابی دیتابیس درایورهای معتبر است.
                    </p>
                  </div>
                )}

                {scanStep === 'analyzing' && (
                  <div className="py-8 space-y-3 text-center">
                    <div className="flex justify-center gap-1.5 mb-1.5">
                      <span className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-bounce" />
                      <span className="h-2.5 w-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="h-2.5 w-2.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <p className="text-xs text-blue-300 font-bold">
                      ... یافتن تداخل نسخه‌های قدیمی در سیستم‌عامل ...
                    </p>
                    <p className="text-[10px] text-slate-400 font-normal max-w-xs mx-auto leading-relaxed">
                      نسخه‌های معتبر جدید با لایسنس دائم در حال پردازش هستند.
                    </p>
                  </div>
                )}

                {scanStep === 'complete' && (
                  <div className="space-y-3">
                    <p className="text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>تحلیل موفق! فایلهای نصب قدیمی و معیوب شناسایی شدند</span>
                    </p>

                    <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-850 text-[10px] leading-relaxed max-h-[140px] overflow-y-auto font-mono text-slate-300 antialiased">
                      {detectedDrivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-slate-900/40 pb-1.5">
                          <div className="flex flex-col text-right">
                            <span className="font-sans font-semibold text-slate-100">{driver.name}</span>
                            <span className="text-[8px] text-slate-405 font-sans">بخش: {driver.type} • ورژن فعلی: {driver.version}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-sans font-bold text-[8px] ${
                            driver.status === 'outdated' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-450'
                          }`}>
                            {driver.status === 'outdated' ? 'نیازمند بهینه‌سازی ریموت' : 'کاملاً بهینه'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={startSimulation}
                        className="py-2.5 bg-transparent border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-xl text-[10px] font-bold w-1/3 transition-all cursor-pointer"
                      >
                        اسکن مجدد
                      </button>
                      <button
                        onClick={() => setActiveTab('new-request')}
                        className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-white rounded-xl text-[10px] w-2/3 shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>اکنون واگذار به تکنسین ریموت کنید</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Glowing Interactive Badge */}
              <div className="pt-4 border-t border-slate-850 mt-4 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>انتقال داده‌ها کامپکت و امن</span>
                </span>
                <span className="text-indigo-400">تایم‌لاین عیب‌یابی: کمتر از ۳ ثانیه</span>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* 2. Core Services Grid (Dark Premium Aesthetic) */}
      <section className="bg-slate-950/90 border-y border-slate-900 py-18 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs text-indigo-400 font-black tracking-widest uppercase block">کاتالوگ خدمات تخصصی</span>
            <h2 className="text-2xl sm:text-3.5xl font-black text-slate-100">سرویس‌های قابل واگذاری ریموت</h2>
            <p className="text-xs text-slate-450 leading-relaxed font-normal">
              ما بستری جامع برای برون‌سپاری نصب درایورهای مبهم مادربرد، گرافیک، لپ‌تاپ و رفع تمامی خطاهای مضحک سیستم‌عامل ارائه داده‌ایم.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((srv, idx) => {
              const SrvIcon = srv.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className="p-7 bg-slate-900/50 rounded-3xl border border-slate-850/60 hover:border-slate-800 hover:bg-slate-900 transition-all duration-300 shadow-sm flex flex-col justify-between items-start text-right space-y-6 relative group"
                >
                  {/* Floating badge inside cards */}
                  <span className="absolute top-5 left-5 text-[9px] bg-slate-800 text-indigo-300 font-bold px-2 py-0.5 rounded-md">
                    {srv.badge}
                  </span>

                  <div className="space-y-4">
                    <div className={`p-3.5 bg-gradient-to-br ${srv.gradient} text-white rounded-2xl shadow-lg w-fit`}>
                      <SrvIcon className="h-5.5 w-5.5" />
                    </div>
                    
                    <h3 className="text-base font-extrabold text-slate-100 group-hover:text-white transition-colors">
                      {srv.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {srv.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('new-request')}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer pt-2"
                  >
                    <span>سفارش نصب درایور</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 3. Creative Interactive Bento Box benefits with visual satisfaction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="absolute top-[20%] right-[30%] w-[250px] h-[250px] bg-purple-500/5 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-4 space-y-5 text-right">
            <span className="text-xs text-blue-400 font-black uppercase tracking-widest block">استاندارهای کیفی ایزی‌درایور (Standards)</span>
            <h2 className="text-2xl sm:text-3.5xl font-black text-slate-100 tracking-tight leading-[1.3]">
              چرا هزاران کاربر به خدمات ریموت ما تکیه کرده‌اند؟
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              ما یک پین‌بورد تکنیکالی امن ایجاد کرده‌ایم تا مشتریان دغدغه دستکاری فایل‌های آلوده یا سوختن قطعات بر اثر ناسازگاری لایسنس را نداشته باشند.
            </p>
            
            <div className="pt-3">
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>مشاهده بازخورد مشتریان</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/40 rounded-3xl border border-slate-900 hover:border-slate-800 shadow-xs text-right space-y-3"
            >
              <div className="h-9 w-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">بدون نیاز به خروج از منزل</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                بدون دردسرهای جابجایی ترافیک تهران و شهرستان‌ها، با نظارت زنده خودتان بر روی AnyDesk خدمات می‌گیرید.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/40 rounded-3xl border border-slate-900 hover:border-slate-800 shadow-xs text-right space-y-3"
            >
              <div className="h-9 w-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">ضمانت سلامت لایسنس و فایلها</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                ما تمام نرم‌افزارها را از منابع اصلی بررسی، هماهنگ و بدون داشتن کوچکترین تروجان یا بدافزار بارگذاری می‌نماییم.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/40 rounded-3xl border border-slate-900 hover:border-slate-800 shadow-xs text-right space-y-3"
            >
              <div className="h-9 w-9 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">تحویل آنی و سرعت عمل بالا</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                تکنسین‌های مجرب بلافاصله پس از بررسی ادمین متصل شده و دتکت سیستم را در کمتر از ۴ ساعت نهایی می‌کنند.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 bg-slate-900/40 rounded-3xl border border-slate-900 hover:border-slate-800 shadow-xs text-right space-y-3"
            >
              <div className="h-9 w-9 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                <Star className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">پرداخت امن و فاکتور شفاف</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                امکان تضمین بازگشت کامل وجه در صورت عدم امکان نصب و ارائه گزارش جزئیات کارکرد به کاربران گرامی.
              </p>
            </motion.div>

          </div>

        </div>
      </section>

      {/* 4. Customer Reviews Slider Carousel (Gorgeous Ambient Dark Theme Card) */}
      {approvedReviews.length > 0 && (
        <section className="bg-slate-900/60 text-white py-18 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
            
            <div className="text-center space-y-2 mb-12">
              <span className="text-[10px] bg-indigo-505/20 text-indigo-300 font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider block w-fit mx-auto">
                بازخورد کاربران (Testimonials)
              </span>
              <h2 className="text-2xl font-black text-slate-100">صدا و اعتماد مشتریان ما</h2>
            </div>

            <div className="min-h-56 bg-gradient-to-tr from-slate-900 to-slate-850 border border-slate-800 rounded-[30px] p-6 sm:p-10 flex flex-col justify-between text-right relative overflow-hidden shadow-xl">
              <div className="absolute top-4 left-6 text-slate-800 font-serif text-8xl select-none leading-none opacity-40">
                ”
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentReviewIndex}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-1">
                    {[...Array(approvedReviews[currentReviewIndex].rating)].map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal italic">
                    « {approvedReviews[currentReviewIndex].comment} »
                  </p>

                  <div className="pt-5 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white">
                        {approvedReviews[currentReviewIndex].customerName}
                      </h4>
                      {approvedReviews[currentReviewIndex].serviceType && (
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                          سرویس: {approvedReviews[currentReviewIndex].serviceType}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Slider Control Arrows */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() =>
                    setCurrentReviewIndex(
                      (prev) => (prev === 0 ? approvedReviews.length - 1 : prev - 1)
                    )
                  }
                  className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-850"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentReviewIndex((prev) => (prev + 1) % approvedReviews.length)
                  }
                  className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-850"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 5. Fluid Contact Info Segment */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-7 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-[35px] p-8 sm:p-12 space-y-6 max-w-4xl mx-auto shadow-2xl"
        >
          <h2 className="text-2.5xl sm:text-3xl font-black text-slate-100">نیاز به ارتباط مستقیم و فوری دارید؟</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed font-normal">
            مهندسین و پشتیبان‌های اورژانس درایور به صورت برخط و همیشگی آماده پاسخگویی به ابهامات شما هستند. درایور مناسب را پیدا نکرده‌اید؟ سیستم شما صفحه سیاه دارد؟ مکالمه زنده را با ما همین الان شروع کنید.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-3">
            <button
              onClick={() => setActiveTab('tickets')}
              className="px-7 py-4 bg-white hover:bg-slate-100 text-slate-950 text-xs sm:text-sm font-black rounded-2xl transition-all cursor-pointer shadow-lg hover:shadow-white/10"
            >
              ثبت تیکت فنی برخط
            </button>
            <button
              onClick={() => setActiveTab('support-chat')}
              className="px-7 py-4 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-250 text-xs sm:text-sm font-black rounded-2xl transition-all border border-slate-750 cursor-pointer"
            >
              چت آنلاین با پشتیبان زنده
            </button>
          </div>
        </motion.div>
      </section>

    </div>
  );
};
