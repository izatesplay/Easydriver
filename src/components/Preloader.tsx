import React, { useState, useEffect } from 'react';
import { Laptop, Cpu, ShieldAlert, BadgeCheck, Zap, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [statusText, setStatusText] = useState('در حال راه‌اندازی و بررسی امضای دیجیتال...');
  const [sequenceIndex, setSequenceIndex] = useState(0);

  const steps = [
    { text: 'در حال راه‌اندازی و بررسی امضای دیجیتال سایت...', delay: 800 },
    { text: 'برقراری اتصال امن با سرورهای ریموت هوشمند...', delay: 900 },
    { text: 'بارگذاری بهینه بسته‌های درایور و ابزارهای عیب‌یابی...', delay: 900 },
    { text: 'تطابق کامل ساختار کارتابل ایمن با پایگاه‌داده...', delay: 800 },
    { text: 'آماده ورود به سامانه اورژانسی ریموت...', delay: 600 }
  ];

  useEffect(() => {
    let currentIdx = 0;
    
    const runNextStep = () => {
      if (currentIdx < steps.length - 1) {
        setTimeout(() => {
          currentIdx++;
          setSequenceIndex(currentIdx);
          setStatusText(steps[currentIdx].text);
          runNextStep();
        }, steps[currentIdx].delay);
      } else {
        // Complete the preloading sequence
        setTimeout(() => {
          onComplete();
        }, steps[currentIdx].delay);
      }
    };

    runNextStep();
  }, [onComplete]);

  // Letters of EASYDRIVER
  const brandLetters = "EASYDRIVER".split("");

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b13] overflow-hidden font-sans select-none" dir="rtl">
      {/* Dynamic ambient flows */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-650/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-purple-650/10 rounded-full blur-[140px] animate-pulse" />
      
      {/* Neo-Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.2)_1px,transparent_1px)] bg-[size:45px_45px] opacity-35" />

      <div className="relative z-10 max-w-md w-full px-8 flex flex-col items-center text-center space-y-10">
        
        {/* Futurist Logo Motion Stage */}
        <div className="relative flex items-center justify-center h-52 w-52">
          
          {/* Waves radiating outwards */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-indigo-500/30 bg-indigo-500/5"
              style={{ width: 100, height: 100 }}
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{
                scale: [0.8, 2.4],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Outer Concentric Rotating Ring 1 */}
          <motion.svg
            className="absolute w-44 h-44 text-indigo-500 opacity-60"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray="25 15 10 30"
            />
          </motion.svg>

          {/* Outer Concentric Rotating Ring 2 (counter-clockwise) */}
          <motion.svg
            className="absolute w-36 h-36 text-purple-650 opacity-50"
            viewBox="0 0 100 100"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="transparent"
              strokeDasharray="40 20 15 15"
            />
          </motion.svg>

          {/* Orbiting Satellite Dot / Spark */}
          <motion.div
            className="absolute col-span-1 h-3.5 w-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_12px_#fbbf24]"
            style={{
              translateX: 0,
              translateY: 0,
            }}
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="h-3 w-3 rounded-full bg-amber-400 absolute" style={{ transform: 'translate(68px, 0px)' }} />
          </motion.div>

          {/* Glowing central block with the brand logo */}
          <motion.div
            className="relative h-24 w-24 bg-gradient-to-tr from-indigo-650 via-indigo-700 to-purple-650 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.4)] flex items-center justify-center text-white"
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 0 35px rgba(99,102,241,0.4)",
                "0 0 55px rgba(168,85,247,0.5)",
                "0 0 35px rgba(99,102,241,0.4)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* The Logo: Laptop with some digital chip lines */}
            <motion.div
              animate={{
                rotateY: [0, 180, 180, 360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 1.5
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <Laptop className="h-11 w-11 drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
            </motion.div>
          </motion.div>

        </div>

        {/* Dynamic Holographic Typography */}
        <div className="space-y-2.5">
          <div className="flex justify-center gap-1">
            {brandLetters.map((char, index) => (
              <motion.span
                key={index}
                className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-200"
                style={{ display: "inline-block" }}
                initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  textShadow: [
                    "0 0 0px rgba(99,102,241,0)",
                    "0 0 15px rgba(99,102,241,0.6)",
                    "0 0 0px rgba(99,102,241,0)"
                  ]
                }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.08,
                  repeat: Infinity,
                  repeatDelay: 4
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          <motion.div
            className="flex items-center justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
              کارشناس نصب راه‌دور ریموت • ایمن و مطمئن
            </span>
          </motion.div>
        </div>

        {/* Changing Status Indicators with Particle Waves (replaces the boring line bar) */}
        <div className="w-full space-y-4 pt-2">
          {/* Audio Wave / Pulse Visualizer bar */}
          <div className="flex h-5 items-end justify-center gap-1.5 max-w-[140px] mx-auto">
            {[...Array(8)].map((_, i) => {
              const animDur = [1.2, 0.8, 1.5, 1.0, 1.3, 0.9, 1.4, 1.1][i];
              return (
                <motion.div
                  key={i}
                  className="w-1 bg-indigo-500/75 rounded-full"
                  style={{ height: "15%" }}
                  animate={{
                    height: ["15%", "90%", "15%"],
                    backgroundColor: ["rgba(99,102,241,0.4)", "rgba(168,85,247,0.8)", "rgba(99,102,241,0.4)"]
                  }}
                  transition={{
                    duration: animDur,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              );
            })}
          </div>

          {/* Status text details */}
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
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
