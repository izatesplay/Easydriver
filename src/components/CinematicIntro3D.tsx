import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Laptop, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Compass, 
  ArrowDown, 
  Sparkles, 
  Monitor, 
  Volume2, 
  VolumeX,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface CinematicIntro3DProps {
  onEnterSite: () => void;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Edge {
  a: number;
  b: number;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
}

export const CinematicIntro3D: React.FC<CinematicIntro3DProps> = ({ onEnterSite }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Interactive scroll tracking
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const smoothedScroll = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Sound cues (web audio synth) for ultimate cinematic immersion!
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSynthSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.3, volume: number = 0.1) => {
    if (isAudioMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context could not start", e);
    }
  };

  const handleAudioToggle = () => {
    setIsAudioMuted(!isAudioMuted);
    if (isAudioMuted) {
      setTimeout(() => {
        playSynthSound(440, 'sine', 0.5, 0.15);
      }, 50);
    }
  };

  // Track page scroll percentage
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScrollY > 0) {
        const progress = Math.max(0, Math.min(1, scrollY / maxScrollY));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Trigger audio feedbacks on stepping phases
  const prevPhase = useRef<number>(0);
  useEffect(() => {
    const currentPhase = Math.floor(scrollProgress * 4);
    if (currentPhase !== prevPhase.current) {
      prevPhase.current = currentPhase;
      // Play cool tech sound trigger
      if (currentPhase === 1) playSynthSound(330, 'triangle', 0.4, 0.08);
      if (currentPhase === 2) playSynthSound(550, 'sawtooth', 0.2, 0.04);
      if (currentPhase === 3) playSynthSound(880, 'sine', 0.6, 0.12);
    }
  }, [scrollProgress]);

  // Set up 3D engine in Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive sizing
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Generate neon code particles
    const stars: Particle3D[] = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 600,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: (Math.random() - 0.5) * 0.8,
        color: i % 3 === 0 ? 'rgba(56, 189, 248, 0.45)' : i % 3 === 1 ? 'rgba(99, 102, 241, 0.45)' : 'rgba(168, 85, 247, 0.35)',
        size: Math.random() * 2 + 1
      });
    }

    // 3D rotation formulas with aspect scaling
    const rotateX = (p: Point3D, rad: number): Point3D => {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x,
        y: p.y * cos - p.z * sin,
        z: p.y * sin + p.z * cos
      };
    };

    const rotateY = (p: Point3D, rad: number): Point3D => {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos + p.z * sin,
        y: p.y,
        z: -p.x * sin + p.z * cos
      };
    };

    const rotateZ = (p: Point3D, rad: number): Point3D => {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
        z: p.z
      };
    };

    // Responsive focal scale factor based on screen size
    const getZScale = () => {
      if (window.innerWidth < 640) return 300; // mobile
      if (window.innerWidth < 1024) return 400; // tablet
      return 520; // desktop
    };

    // Project 3D vector to 2D coordinates representing responsive widescreen centering
    const project = (p: Point3D, w: number, h: number): { x: number; y: number; visible: boolean } => {
      const focalLength = getZScale();
      const distance = 400 + Math.sin(timeRef.current * 0.015) * 20; // zoom pulsation
      const zOffset = p.z + distance;
      if (zOffset <= 10) return { x: 0, y: 0, visible: false };

      const scale = focalLength / zOffset;
      
      // Shift robot slightly left on large screens to leave right space for text, and centered on mobile
      const leftShift = window.innerWidth >= 1024 ? -window.innerWidth * 0.15 : 0;

      return {
        x: p.x * scale + (w / 2) + leftShift,
        y: p.y * scale + (h / 2) - 30,
        visible: true
      };
    };

    // 3D Geometry generators
    const getHeadGeometry = (): { verts: Point3D[], edges: Edge[] } => {
      const r = 40;
      const h = 50;
      const verts: Point3D[] = [];
      const edges: Edge[] = [];
      
      // Top plate 8 points
      for (let i = 0; i < 8; i++) {
        const theta = (i * Math.PI) / 4 + Math.PI / 8;
        verts.push({ x: r * Math.cos(theta), y: -h / 2, z: r * Math.sin(theta) });
      }
      // Bottom plate 8 points
      for (let i = 0; i < 8; i++) {
        const theta = (i * Math.PI) / 4 + Math.PI / 8;
        verts.push({ x: r * 0.75 * Math.cos(theta), y: h / 2, z: r * 0.75 * Math.sin(theta) });
      }
      
      // Edge connections
      for (let i = 0; i < 8; i++) {
        edges.push({ a: i, b: (i + 1) % 8 });
        edges.push({ a: i + 8, b: ((i + 1) % 8) + 8 });
        edges.push({ a: i, b: i + 8 });
      }
      return { verts, edges };
    };

    const getMotherboardGeometry = (): { verts: Point3D[], edges: Edge[] } => {
      const sizeX = 85;
      const sizeZ = 85;
      const y = 140;
      const verts: Point3D[] = [
        { x: -sizeX, y: y - 5, z: -sizeZ },
        { x: sizeX, y: y - 5, z: -sizeZ },
        { x: sizeX, y: y - 5, z: sizeZ },
        { x: -sizeX, y: y - 5, z: sizeZ },
        { x: -sizeX, y: y + 5, z: -sizeZ },
        { x: sizeX, y: y + 5, z: -sizeZ },
        { x: sizeX, y: y + 5, z: sizeZ },
        { x: -sizeX, y: y + 5, z: sizeZ },
      ];
      const edges: Edge[] = [
        { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
        { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
        { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 }
      ];
      return { verts, edges };
    };

    const headGeom = getHeadGeometry();
    const mbGeom = getMotherboardGeometry();

    // Main animation ticking
    const drawFrame = () => {
      if (!canvasRef.current) return;
      
      const w = canvas.width;
      const h = canvas.height;
      timeRef.current += 1.0;
      const t = timeRef.current;

      // smooth interpolation of scroll
      smoothedScroll.current += (scrollProgress - smoothedScroll.current) * 0.08;
      const s = smoothedScroll.current;

      // Clear dark cosmic background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Draw subtle holographic backdrop matrix grid lines
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.03)';
      ctx.lineWidth = 1;
      const gridSpacing = 65;
      for (let x = 0; x < w; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw active scanner laser during Phase 2 (0.25 - 0.55)
      if (s > 0.22 && s < 0.58) {
        const laserY = h * (0.3 + 0.45 * Math.abs(Math.sin(t * 0.02)));
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, laserY);
        ctx.lineTo(w, laserY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.02)';
        ctx.fillRect(0, laserY - 45, w, 90);
      }

      // Model rotations depending on scroll linking
      // When s increases, the robot transforms and gets closer, rotating towards us.
      const baseRotationY = t * 0.007 + s * (Math.PI * 0.8);
      const verticalHover = Math.sin(t * 0.025) * 12;
      const headNodAngle = s < 0.2 ? -0.3 * (1 - s / 0.2) : 0;
      const statusColor = s < 0.25 
        ? 'rgb(239, 68, 68)' 
        : s < 0.75 
          ? 'rgb(56, 189, 248)' 
          : 'rgb(52, 211, 153)';

      // Stack of elements is rendered based on depth
      const stack: { depth: number; render: () => void }[] = [];

      // 1. STARFIELD ATMOSPHERE
      stars.forEach(pt => {
        let rotatedPt = rotateY(pt, t * 0.0005 + s * 0.002);
        rotatedPt = rotateX(rotatedPt, t * 0.0002);
        
        const proj = project(rotatedPt, w, h);
        if (proj.visible) {
          const depthScale = 400 / (rotatedPt.z + 400);
          const size = pt.size * depthScale;
          
          stack.push({
            depth: rotatedPt.z,
            render: () => {
              ctx.fillStyle = s < 0.75 ? pt.color : 'rgba(52, 211, 153, 0.4)';
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      });

      // 2. ROBOT BACKPACK ENGINE WINGS
      for (const side of [-1, 1]) {
        const wingDeploy = s < 0.35 ? s * (Math.PI / 3) : (Math.PI / 3) + (s - 0.35) * 0.25;
        const rawWings: Point3D[] = [
          { x: side * 30, y: -25, z: -15 },
          { x: side * (35 + s * 55), y: -65 + Math.sin(t * 0.035) * 8, z: -35 },
          { x: side * (55 + s * 80), y: -10 + Math.sin(t * 0.035) * 5, z: -25 },
          { x: side * 22, y: 25, z: -10 }
        ];

        const rotatedWings = rawWings.map(p => {
          let np = rotateY(p, side * wingDeploy);
          np.y += verticalHover;
          np = rotateY(np, baseRotationY);
          return np;
        });

        stack.push({
          depth: rotatedWings.reduce((acc, p) => acc + p.z, 0) / 4,
          render: () => {
            const screenPts = rotatedWings.map(p => project(p, w, h));
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            screenPts.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.closePath();
            
            ctx.strokeStyle = statusColor.replace("rgb", "rgba").replace(")", ", 0.45)");
            ctx.lineWidth = 1.6;
            ctx.stroke();

            ctx.fillStyle = statusColor.replace("rgb", "rgba").replace(")", ", 0.03)");
            ctx.fill();
          }
        });
      }

      // 3. ROBOT HEAD HELMET SKULL (3D wireframe hexagonal prism)
      const transHeadVerts = headGeom.verts.map(p => {
        let np = rotateX(p, headNodAngle);
        np.y += -55 + verticalHover; // raised position
        np = rotateY(np, baseRotationY);
        return np;
      });

      stack.push({
        depth: transHeadVerts.reduce((acc, p) => acc + p.z, 0) / transHeadVerts.length,
        render: () => {
          const screens = transHeadVerts.map(p => project(p, w, h));
          
          ctx.strokeStyle = s < 0.22 ? 'rgba(239, 68, 68, 0.3)' : s < 0.75 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.45)';
          ctx.lineWidth = 1.35;
          headGeom.edges.forEach(edge => {
            if (screens[edge.a].visible && screens[edge.b].visible) {
              ctx.beginPath();
              ctx.moveTo(screens[edge.a].x, screens[edge.a].y);
              ctx.lineTo(screens[edge.b].x, screens[edge.b].y);
              ctx.stroke();
            }
          });

          // Horizontal visor on helmet front (curver highlight)
          const localVisor = [
            { x: -28, y: -5, z: 32 },
            { x: 0, y: -5, z: 42 },
            { x: 28, y: -5, z: 32 }
          ];

          const transVisor = localVisor.map(p => {
            let np = rotateX(p, headNodAngle);
            np.y += -55 + verticalHover;
            np = rotateY(np, baseRotationY);
            return project(np, w, h);
          });

          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(transVisor[0].x, transVisor[0].y);
          ctx.lineTo(transVisor[1].x, transVisor[1].y);
          ctx.lineTo(transVisor[2].x, transVisor[2].y);
          ctx.stroke();

          // visor outer glow bloom
          ctx.strokeStyle = statusColor.replace("rgb", "rgba").replace(")", ", 0.45)");
          ctx.lineWidth = 11;
          ctx.stroke();
        }
      });

      // 4. CORE REACTOR TORSO (Multiple intersecting glowing CPU rings)
      const ringVerts1 = [];
      const ringVerts2 = [];
      const ringCount = 12;
      for (let i = 0; i < ringCount; i++) {
        const theta = (i * Math.PI * 2) / ringCount;
        ringVerts1.push({ x: 34 * Math.cos(theta), y: verticalHover + 5, z: 34 * Math.sin(theta) });
        ringVerts2.push({ x: 24 * Math.cos(theta), y: verticalHover - 15, z: 24 * Math.sin(theta) });
      }

      const transRing1 = ringVerts1.map(p => rotateY(p, baseRotationY + t * 0.04));
      const transRing2 = ringVerts2.map(p => rotateY(p, -baseRotationY - t * 0.05));

      stack.push({
        depth: 0,
        render: () => {
          const screens1 = transRing1.map(p => project(p, w, h));
          const screens2 = transRing2.map(p => project(p, w, h));

          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(screens1[0].x, screens1[0].y);
          screens1.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = s < 0.75 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.55)';
          ctx.beginPath();
          ctx.moveTo(screens2[0].x, screens2[0].y);
          screens2.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.stroke();

          // Central energy power pulse
          const coreNode = project({ x: 0, y: verticalHover - 5, z: 0 }, w, h);
          if (coreNode.visible) {
            ctx.fillStyle = statusColor;
            ctx.shadowColor = statusColor;
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(coreNode.x, coreNode.y, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          }
        }
      });

      // 5. MOTHERBOARD GRAPHICS BOARD CHIP (Fades in on scroll progress > 0.22)
      if (s > 0.22) {
        const transMbVerts = mbGeom.verts.map(p => {
          let np = rotateY(p, t * 0.008);
          np.y += 18 + Math.sin(t * 0.02) * 5;
          np = rotateY(np, baseRotationY * 0.6);
          return np;
        });

        stack.push({
          depth: transMbVerts.reduce((acc, p) => acc + p.z, 0) / transMbVerts.length,
          render: () => {
            const screens = transMbVerts.map(p => project(p, w, h));
            const boardColor = s < 0.45 
              ? 'rgba(239, 68, 68, 0.35)' 
              : s < 0.75 
                ? 'rgba(245, 158, 11, 0.4)' 
                : 'rgba(16, 185, 129, 0.55)';

            ctx.strokeStyle = boardColor;
            ctx.lineWidth = 1.35;
            mbGeom.edges.forEach(edge => {
              if (screens[edge.a].visible && screens[edge.b].visible) {
                ctx.beginPath();
                ctx.moveTo(screens[edge.a].x, screens[edge.a].y);
                ctx.lineTo(screens[edge.b].x, screens[edge.b].y);
                ctx.stroke();
              }
            });

            // Draw spinning fan on board
            const fanCenterLocal = { x: 0, y: 140, z: 0 };
            let fWorld = rotateY(fanCenterLocal, t * 0.008);
            fWorld.y += 18 + Math.sin(t * 0.02) * 5;
            fWorld = rotateY(fWorld, baseRotationY * 0.6);
            const fansProj = project(fWorld, w, h);

            if (fansProj.visible) {
              const rotSpeed = t * (s < 0.45 ? 0.05 : s < 0.75 ? 0.16 : 0.35);
              ctx.strokeStyle = s < 0.75 ? '#38bdf8' : '#34d399';
              ctx.lineWidth = 1.2;
              for (let b = 0; b < 4; b++) {
                const angle = rotSpeed + (b * Math.PI) / 2;
                ctx.beginPath();
                ctx.moveTo(fansProj.x, fansProj.y);
                ctx.lineTo(
                  fansProj.x + 15 * Math.cos(angle),
                  fansProj.y + 15 * Math.sin(angle)
                );
                ctx.stroke();
              }
            }
          }
        });
      }

      // 6. HELIX CONDUIT BEAM PIPELINE (Fades in on Phase 3: > 0.5)
      // Visualizing data transmission between robot CPU heart down onto GPU motherboard
      if (s > 0.48) {
        stack.push({
          depth: 180,
          render: () => {
            const hCore = project({ x: 0, y: verticalHover - 5, z: 0 }, w, h);
            const mbLocalPoint = { x: 0, y: 140, z: 0 };
            let mbWorld = rotateY(mbLocalPoint, t * 0.008);
            mbWorld.y += 18 + Math.sin(t * 0.02) * 5;
            mbWorld = rotateY(mbWorld, baseRotationY * 0.6);
            const hDest = project(mbWorld, w, h);

            if (hCore.visible && hDest.visible) {
              const distanceY = hDest.y - hCore.y;
              for (const strand of [-1, 1]) {
                ctx.strokeStyle = strand === 1 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(139, 92, 246, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                
                const steps = 24;
                for (let i = 0; i <= steps; i++) {
                  const factor = i / steps;
                  const lateral = Math.sin(t * 0.2 + factor * Math.PI * 5) * 22 * strand;
                  const targetX = hCore.x + (hDest.x - hCore.x) * factor + lateral;
                  const targetY = hCore.y + distanceY * factor;
                  
                  if (i === 0) ctx.moveTo(targetX, targetY);
                  else ctx.lineTo(targetX, targetY);
                }
                ctx.stroke();
              }
            }
          }
        });
      }

      // 7. ARMED PROTOCOLS AND MECHANICAL PROBES
      for (const side of [-1, 1]) {
        const startShoulder = { x: side * 44, y: 5 + verticalHover, z: 0 };
        let elbowAngleY = side * (Math.PI / 4) + s * (Math.PI / 1.8);
        let elbowAngleX = 0.3 * Math.sin(t * 0.04);

        if (s >= 0.78) {
          // salute/optimization posture
          elbowAngleY = side * 0.35;
          elbowAngleX = side === 1 ? -1.0 : 0.6;
        }

        const elbowLocal = { x: side * 30, y: 30, z: 10 };
        const wristLocal = { x: side * 25, y: 20, z: 20 };

        let elbowWorld = rotateY(elbowLocal, elbowAngleY);
        elbowWorld = rotateX(elbowWorld, elbowAngleX);
        elbowWorld.x += startShoulder.x;
        elbowWorld.y += startShoulder.y;
        elbowWorld.z += startShoulder.z;

        let wristWorld = rotateX(wristLocal, elbowAngleX * 1.5);
        wristWorld = rotateY(wristWorld, elbowAngleY * 1.25);
        wristWorld.x += elbowWorld.x;
        wristWorld.y += elbowWorld.y;
        wristWorld.z += elbowWorld.z;

        const sJoint = rotateY(startShoulder, baseRotationY);
        const eJoint = rotateY(elbowWorld, baseRotationY);
        const wJoint = rotateY(wristWorld, baseRotationY);

        stack.push({
          depth: (sJoint.z + eJoint.z + wJoint.z) / 3,
          render: () => {
            const sProj = project(sJoint, w, h);
            const eProj = project(eJoint, w, h);
            const wProj = project(wJoint, w, h);

            if (sProj.visible && eProj.visible && wProj.visible) {
              ctx.strokeStyle = 'rgba(99, 102, 241, 0.75)';
              ctx.lineWidth = 4.5;
              ctx.beginPath();
              ctx.moveTo(sProj.x, sProj.y);
              ctx.lineTo(eProj.x, eProj.y);
              ctx.stroke();

              ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
              ctx.lineWidth = 3.2;
              ctx.beginPath();
              ctx.moveTo(eProj.x, eProj.y);
              ctx.lineTo(wProj.x, wProj.y);
              ctx.stroke();

              // Joint circles
              ctx.fillStyle = '#818cf8';
              ctx.beginPath();
              ctx.arc(sProj.x, sProj.y, 6, 0, Math.PI * 2);
              ctx.arc(eProj.x, eProj.y, 4.5, 0, Math.PI * 2);
              ctx.fill();

              // Probe pointer tips
              ctx.fillStyle = statusColor;
              ctx.beginPath();
              ctx.arc(wProj.x, wProj.y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }

      // Render stack sorting by depth
      stack.sort((a, b) => b.depth - a.depth);
      stack.forEach(e => e.render());

      animationFrameId.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollProgress, isAudioMuted]);

  // Story sequence subtitle narration config
  const textSequences = [
    {
      title: "گام اول: خاموشی مطلق و استندبای سیستم",
      subtitle: "در حال ثبت امضای رجیستری و بررسی وضعیت پورت‌های محلی...",
      badge: "STANDBY CORE",
      desc: "دیگر نیازی به کابل‌کشی مجدد کیس یا جابجایی لپ‌تاپ به مراکز سنتی بازار ندارید. تکنسین‌های ارشد ما به کمک پروتکل‌های AnyDesk، روان‌ترین بسته‌ها و پایداری لایسنس‌ها را با مانیتورینگ زنده شخص شما نهایی می‌کنند.",
      color: "border-red-500/20 text-red-400 bg-red-500/5",
      progress: "۰٪ - ۲۵٪"
    },
    {
      title: "گام دوم: تحلیل و کاوش بایت به بایت سخت‌افزار",
      subtitle: "کدهای سخت‌افزاری PCI/VEN به صورت لحظه‌ای با دیتابیس مرجع سنجیده می‌شوند...",
      badge: "HARDWARE DIAGNOSTIC",
      desc: "سیستم هوشمند عیب‌یابی ما فرکانس رم، عملکرد پردازنده مرکزی و کلاک شتاب‌دهنده گرافیکی شما را بدون کوچک‌ترین تاخیری ردیابی می‌کند. تداخلات شناسایی شدند.",
      color: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5",
      progress: "۲۵٪ - ۵۰٪"
    },
    {
      title: "گام سوم: تزریق بسته‌های ارجینال ویندوز",
      subtitle: "برقراری اتصال فوق‌امـن AnyDesk به همراه تزریق درایورها ردیابی شده...",
      badge: "ANYDESK REMOTE EXPORT",
      desc: "فایل‌ها و پکیج‌های معتبر بدون خطر صفحه آبی مرگ (BSOD) یا بدافزار بارگذاری شده و با تایید کامل شما بر پایداری کامل سیستم‌عامل نصب می‌شوند.",
      color: "border-amber-500/20 text-amber-400 bg-amber-500/5",
      progress: "۵۰٪ - ۷۵٪"
    },
    {
      title: "گام چهارم: ثبات نهایی و بهره‌وری کامل",
      subtitle: "تمام بازی‌ها و شبیه‌سازهای سنگین مهندسی روان‌تر از لایسنس اول نصب شدند!",
      badge: "100% HEALTH & STABLE",
      desc: "پرونده فنی با ثبت تاییدیه اورژانس صادر شد. هم‌اکنون آماده هستید با سریع‌ترین سرعت وارد تارنمای اصلی EasyDriver شده و خدمات خود را ارتقا دهید.",
      color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
      progress: "۷۵٪ - ۱۰۰٪"
    }
  ];

  const currentActiveIndex = Math.min(3, Math.floor(scrollProgress * 4));

  return (
    <div ref={containerRef} className="relative bg-slate-950 text-white select-none selection:bg-indigo-500/30 font-sans" dir="rtl">
      
      {/* Immersive 3D sticky stage container */}
      <div className="fixed inset-0 w-full h-[100dvh] z-10 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        
        {/* Soft immersive overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/40 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        
        {/* Futuristic Grid backlights */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* FIXED HELPER HEADER HUD */}
      <div className="fixed top-0 inset-x-0 z-40 bg-gradient-to-b from-[#030712] to-transparent py-4 px-6 sm:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
            <Laptop className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">روایت تعاملی ۳بعدی</span>
            <span className="text-sm font-black text-white">ایـزی‌درایـور (EasyDriver)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio toggle helper for premium experience */}
          <button
            onClick={handleAudioToggle}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">صدا موقت خاموش</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
                <span className="hidden sm:inline">صدا فعال</span>
              </>
            )}
          </button>

          {/* Quick skip to standard dashboard for power users */}
          <button
            onClick={onEnterSite}
            className="px-4.5 py-2 bg-slate-900/90 hover:bg-slate-855 text-[10px] font-black border border-slate-800 text-indigo-300 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            رد کردن دمو تعاملی
          </button>
        </div>
      </div>

      {/* SCROLL TRIGGER CONTAINER - 4 FULL STORY PHASES (400vh) */}
      <div className="relative z-20 w-full" style={{ height: "350vh" }}>
        
        {/* LEFT/RIGHT MULTIPHASE TEXT CONTAINER STICKY OVERLAY */}
        <div className="sticky top-0 w-full h-[100dvh] flex flex-col justify-between py-24 px-4 sm:px-12 pointer-events-none">
          
          <div className="grow flex items-center h-full">
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Left intentionally empty or thin to let the 3D model shine on desktop */}
              <div className="hidden lg:col-span-6 lg:block" />

              {/* Right Column: Immersive story narrative panel */}
              <div className="col-span-1 lg:col-span-6 flex flex-col justify-center items-start text-right space-y-6 pointer-events-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentActiveIndex}
                    initial={{ opacity: 0, x: -25, y: 10, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 25, y: -10, filter: "blur(8px)" }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="w-full bg-slate-900/85 border border-slate-800/90 rounded-[28px] p-6 lg:p-8 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-5"
                  >
                    {/* Step indicator badge */}
                    <div className="flex items-center justify-between">
                      <div className={`px-3 py-1 border rounded-lg text-[9px] font-black ${textSequences[currentActiveIndex].color}`}>
                        {textSequences[currentActiveIndex].badge}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono font-extrabold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>فاز {textSequences[currentActiveIndex].progress} اسکرول</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                        {textSequences[currentActiveIndex].title}
                      </h3>
                      <p className="text-xs sm:text-sm text-indigo-300 font-bold">
                        {textSequences[currentActiveIndex].subtitle}
                      </p>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-normal">
                      {textSequences[currentActiveIndex].desc}
                    </p>

                    {/* Interactive Telemetry Details inside card */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
                        <span>PCI EXPORT LATENCY:</span>
                        <span className="text-emerald-400">0.8ms (SECURE)</span>
                      </div>
                      
                      {/* Dynamic visual graph line */}
                      <div className="flex h-3 items-end gap-1 gap-y-0 text-slate-500 w-full">
                        {[...Array(24)].map((_, i) => {
                          const heightVal = Math.sin(scrollProgress * 25 + i * 0.5) * 35 + 50;
                          return (
                            <div 
                              key={i} 
                              className={`w-full rounded-sm ${currentActiveIndex === 3 ? 'bg-emerald-500/45' : 'bg-indigo-500/35'}`}
                              style={{ height: `${heightVal}%` }} 
                            />
                          );
                        })}
                      </div>
                    </div>

                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* LOWER NARRATIVE INSTRUCTION COMPONENT */}
          <div className="w-full flex justify-between items-center pt-6 text-[11px] text-slate-400 font-semibold max-w-7xl mx-auto border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>امولاسیون اتوماتیک: فعال (۶۰ فریم)</span>
            </div>

            <div className="flex items-center gap-2">
              <span>اسکرول کنید تا انیمیشن تغییر کند</span>
              <ArrowDown className="h-4 w-4 animate-bounce text-indigo-400" />
            </div>
          </div>

        </div>

      </div>

      {/* FINAL STEP: PERSISTENT CALL TO ENTER MAIN SITE (SHOWS ON SCROLL END) */}
      <AnimatePresence>
        {scrollProgress >= 0.88 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.45 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 font-sans p-4 text-center selection:bg-indigo-550/30"
          >
            {/* Ambient cyber lights background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-indigo-650/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-xl w-full p-6 sm:p-10 bg-slate-900 border border-slate-800 rounded-[35px] shadow-[0_0_80px_rgba(99,102,241,0.25)] space-y-8">
              
              {/* Success Badge */}
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto shadow-xl relative animate-pulse">
                <CheckCircle2 className="h-10 w-10 text-slate-950" />
                <span className="absolute -inset-2 rounded-full border border-emerald-500/20" />
              </div>

              <div className="space-y-3.5">
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full w-fit mx-auto">
                  عیب‌یابی با موفقیت ثبت و کالیبره شد
                </span>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  سیستم شما آماده پرواز است!
                </h2>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal max-w-md mx-auto">
                  تمام تداخلات شبیه‌سازی درایو با موفقیت برطرف شدند. اکنون زمان ثبت درخواست واقعی و رفع مشکلات با پشتیبانی مکرر اورژانس ایزی‌درایور از راه دور است.
                </p>
              </div>

              {/* ENTER WEBSITE CALL-TO-ACTION BUTTON */}
              <motion.button
                onClick={onEnterSite}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative py-4 sm:py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-[0_8px_35px_rgba(99,102,241,0.45)] hover:shadow-[0_8px_45px_rgba(99,102,241,0.65)] transition-all cursor-pointer flex items-center justify-center gap-3 group overflow-hidden border border-white/10"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] group-hover:animate-chevron-scroll pointer-events-none" />
                <Play className="h-4.5 w-4.5 fill-white" />
                <span>ورود به صفحه اصلی و کارتابل سایت اصلی</span>
              </motion.button>

              {/* Footer info line */}
              <div className="flex justify-center items-center gap-4 text-[10px] text-slate-500 font-extrabold font-mono uppercase">
                <span>PLATFORM: ANYDESK CLOUD</span>
                <span>•</span>
                <span>AUTOSAVE: LOCAL</span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
