import React, { useState, useEffect } from 'react';
import { Laptop, Cpu, ShieldAlert, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('در حال بررسی اعتبار سنجی و لایسنس ایمن...');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { threshold: 0, text: 'در حال بررسی اعتبار سنجی و لایسنس ایمن...', icon: Cpu },
    { threshold: 25, text: 'برقراری ارتباط دوطرفه مقتدر با MySQL دیتابیس...', icon: Laptop },
    { threshold: 55, text: 'راه‌اندازی ماژول‌های ریموت انی‌دسک و کلاینت...', icon: ShieldAlert },
    { threshold: 85, text: 'تطابق کامل زیرساخت‌های سی‌‌پنل هاست...', icon: BadgeCheck }
  ];

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Fast start, slight slow down near 80%, then speed up to finish
      const increment = currentProgress < 20 
        ? Math.floor(Math.random() * 12) + 5 
        : currentProgress < 75 
        ? Math.floor(Math.random() * 6) + 3 
        : Math.floor(Math.random() * 15) + 8;
        
      currentProgress = Math.min(currentProgress + increment, 100);
      setProgress(currentProgress);

      // Find the match text by threshold
      const matchedStep = [...steps].reverse().find(s => currentProgress >= s.threshold);
      if (matchedStep) {
        setStatusText(matchedStep.text);
      }

      if (currentProgress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, 90);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] overflow-hidden font-sans" dir="rtl">
      {/* Dynamic ambient vector glows in the background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
      
      {/* Decorative techno matrix lines background styling */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.2)_1px,transparent_1px)] bg-[size:40px_40px] opacity-25" />

      <div className="relative z-10 max-w-sm w-full px-6 flex flex-col items-center text-center space-y-8">
        
        {/* Animated Outer Glowing Frame containing Logo */}
        <div className="relative">
          <motion.div 
            className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 blur-xl opacity-60"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div 
            className="relative p-5.5 bg-gradient-to-tr from-blue-650 via-indigo-650 to-purple-650 rounded-3xl text-white shadow-2xl border border-white/10 flex items-center justify-center"
            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          >
            <Laptop className="h-10 w-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          </motion.div>
        </div>

        {/* Brand Information Section */}
        <div className="space-y-2">
          <motion.h1 
            className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-200"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            EASYDRIVER
          </motion.h1>
          <motion.span 
            className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            سامانه فوق‌پیشرفته و اورژانسی نصب راه‌دور
          </motion.span>
        </div>

        {/* Progress percent text indicator */}
        <div className="w-full space-y-3.5 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 leading-none">
            <span className="font-mono text-sm tracking-tight text-white">{progress}%</span>
            <span className="text-[10px] font-sans">هماهنگی لود فایل‌ها...</span>
          </div>

          {/* Core Sleek Glowing Loader Bar */}
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative"
              style={{ width: `${progress}%` }}
              layoutId="progress-bar-slider"
            >
              <div className="absolute top-0 right-0 bottom-0 w-3 bg-white/70 rounded-full blur-xs" />
            </motion.div>
          </div>

          {/* Changing status indicator log text with smooth transitions */}
          <AnimatePresence mode="wait">
            <motion.p 
              key={statusText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] text-indigo-300 font-extrabold max-w-xs mx-auto leading-relaxed h-7"
            >
              {statusText}
            </motion.p>
          </AnimatePresence>
        </div>

      </div>

      <div className="absolute bottom-8 text-[9px] text-slate-500 font-medium tracking-wide">
        EasyDriver Central Node • Secure 256-bit Encrypted Pipeline • v2.1.0
      </div>
    </div>
  );
};
