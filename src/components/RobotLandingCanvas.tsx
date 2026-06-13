import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Settings, 
  Activity, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  ArrowDown, 
  RefreshCw, 
  Play, 
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';

// Interfaces for 3D graphics projection
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Edge {
  a: number; // vertex index a
  b: number; // vertex index b
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
  phase: number;
  speed: number;
}

interface RobotLandingCanvasProps {
  scrollProgress: number;
  setActiveTab: (tab: string) => void;
}

export const RobotLandingCanvas: React.FC<RobotLandingCanvasProps> = ({ scrollProgress, setActiveTab }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Smooth interpolated scroll state (momentum smoothing)
  const smoothedScroll = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Particle systems
  const dataParticles = useRef<Particle3D[]>([]);
  const networkPulses = useRef<{pos: number; speed: number; id: number}[]>([]);

  // Local state for interactive diagnostic alerts
  const [hudMessage, setHudMessage] = useState<string>("در انتظار آماده‌سازی...");
  const [robotStatus, setRobotStatus] = useState<"standby" | "diagnostic" | "repairing" | "optimized">("standby");

  // Keep track of current robot action status in Farsi
  useEffect(() => {
    if (scrollProgress < 0.15) {
      setRobotStatus("standby");
      setHudMessage("ربات نجات در وضعیت استندبای | اسکرول کنید");
    } else if (scrollProgress >= 0.15 && scrollProgress < 0.5) {
      setRobotStatus("diagnostic");
      setHudMessage("اسکن پورت‌ها و تحلیل عیوب سخت‌افزاری...");
    } else if (scrollProgress >= 0.5 && scrollProgress < 0.8) {
      setRobotStatus("repairing");
      setHudMessage("در حال تزریق بسته‌های ارجینال درایور ریموت...");
    } else {
      setRobotStatus("optimized");
      setHudMessage("رفع عیب ۱۰۰٪! سلامت کامل ویندوز تایید شد");
    }
  }, [scrollProgress]);

  // Handle dimensions & state loops
  useEffect(() => {
    // Generate initial neon particles
    const particles: Particle3D[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 300,
        z: (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        color: i % 2 === 0 ? '#38bdf8' : '#818cf8',
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
      });
    }
    dataParticles.current = particles;

    // Create AnyDesk data pulses
    networkPulses.current = [
      { pos: 0.1, speed: 0.01, id: 1 },
      { pos: 0.4, speed: 0.012, id: 2 },
      { pos: 0.7, speed: 0.008, id: 3 }
    ];

    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // 3D Math rotation helper formulas
    const rotateX = (p: Point3D, angle: number): Point3D => {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x,
        y: p.y * cos - p.z * sin,
        z: p.y * sin + p.z * cos
      };
    };

    const rotateY = (p: Point3D, angle: number): Point3D => {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos + p.z * sin,
        y: p.y,
        z: -p.x * sin + p.z * cos
      };
    };

    const rotateZ = (p: Point3D, angle: number): Point3D => {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
        z: p.z
      };
    };

    // Project 3D vector to 2D screen coordinates
    const project = (p: Point3D, width: number, height: number, customZScale: number = 420): { x: number; y: number; dev: boolean } => {
      const focalLength = customZScale;
      const distance = 300;
      const zOffset = p.z + distance;
      if (zOffset <= 50) return { x: 0, y: 0, dev: false };
      
      const scale = focalLength / zOffset;
      const xTranslate = width / 2;
      const yTranslate = height / 2;
      
      return {
        x: p.x * scale + xTranslate,
        y: p.y * scale + yTranslate,
        dev: true
      };
    };

    // Construct various 3D wireframe mesh geometries
    const getHeadVertices = (): Point3D[] => {
      // 3D Hexagonal prism (Robotic Helmet skull)
      const r = 24;
      const h = 28;
      const vertices: Point3D[] = [];
      // Top plate (8 vertices)
      for (let i = 0; i < 8; i++) {
        const theta = (i * Math.PI) / 4 + Math.PI / 8;
        vertices.push({ x: r * Math.cos(theta), y: -h/2, z: r * Math.sin(theta) });
      }
      // Bottom plate (8 vertices)
      for (let i = 0; i < 8; i++) {
        const theta = (i * Math.PI) / 4 + Math.PI / 8;
        vertices.push({ x: (r * 0.8) * Math.cos(theta), y: h/2, z: (r * 0.8) * Math.sin(theta) });
      }
      return vertices;
    };

    const getHeadEdges = (): Edge[] => {
      const edges: Edge[] = [];
      // Connect top plate
      for (let i = 0; i < 8; i++) {
        edges.push({ a: i, b: (i + 1) % 8 });
      }
      // Connect bottom plate
      for (let i = 0; i < 8; i++) {
        edges.push({ a: i + 8, b: ((i + 1) % 8) + 8 });
      }
      // Connect vertical seams
      for (let i = 0; i < 8; i++) {
        edges.push({ a: i, b: i + 8 });
      }
      return edges;
    };

    // Computer Component 3D model: Motherboard/GPU
    const getPCVertices = (): Point3D[] => {
      const rX = 45;
      const rY = 6;
      const rZ = 45;
      const yPos = 85; 
      
      return [
        { x: -rX, y: yPos - rY, z: -rZ }, // 0
        { x: rX, y: yPos - rY, z: -rZ },  // 1
        { x: rX, y: yPos - rY, z: rZ },   // 2
        { x: -rX, y: yPos - rY, z: rZ },  // 3
        { x: -rX, y: yPos + rY, z: -rZ }, // 4
        { x: rX, y: yPos + rY, z: -rZ },  // 5
        { x: rX, y: yPos + rY, z: rZ },   // 6
        { x: -rX, y: yPos + rY, z: rZ },  // 7
      ];
    };

    const getPCEdges = (): Edge[] => {
      return [
        { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
        { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
        { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 },
      ];
    };

    // 3D Concentric Ring generator
    const getRingPoints = (radius: number, segments: number, offsetHeight: number): Point3D[] => {
      const verts: Point3D[] = [];
      for (let i = 0; i < segments; i++) {
        const theta = (i * Math.PI * 2) / segments;
        verts.push({ x: radius * Math.cos(theta), y: offsetHeight, z: radius * Math.sin(theta) });
      }
      return verts;
    };

    // Master Render Loop
    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId.current = requestAnimationFrame(renderLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId.current = requestAnimationFrame(renderLoop);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      timeRef.current += 1.0;
      const t = timeRef.current;

      // Apply inertia formula (lerp) to smooth out scroll movements
      smoothedScroll.current += (scrollProgress - smoothedScroll.current) * 0.08;
      const s = smoothedScroll.current;

      // Transparent clear
      ctx.clearRect(0, 0, w, h);

      // Draw subtle background cybernetic grid coordinates inside viewport
      ctx.strokeStyle = "rgba(79, 70, 229, 0.04)";
      ctx.lineWidth = 1;
      const gridCount = 8;
      for (let i = 0; i <= gridCount; i++) {
        const xPos = (w / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, h);
        ctx.stroke();

        const yPos = (h / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(w, yPos);
        ctx.stroke();
      }

      // Draw a subtle green check grid or warning lines with laser scans
      if (s > 0.15 && s < 0.5) {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.14)";
        ctx.lineWidth = 2;
        const scanY = h * (0.2 + 0.6 * Math.abs(Math.sin(t * 0.015)));
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
        
        // Horizontal laser highlight mesh
        ctx.fillStyle = "rgba(244, 63, 94, 0.02)";
        ctx.fillRect(0, scanY - 30, w, 60);
      }

      // Global scene-wide lazy hover oscillations (prevents static display when idle)
      const hoverY = Math.sin(t * 0.03) * 8.5;
      const totalRobotRotationY = t * 0.006 + Math.sin(t * 0.01) * 0.1;
      
      // Calculate dynamic joints based on current smoothed scroll value 's'
      // Boot stage folds, diagnostics expands arms, repairs flashes, optimization thumbs up!
      const shoulderExpand = s < 0.2 ? s * 5 : 1 + (s - 0.2) * 0.2;
      const wingsDeployAngle = s < 0.4 ? s * (Math.PI / 4) : (Math.PI / 4) + (s - 0.4) * 0.3;
      const headNodAngle = s < 0.15 ? -0.25 * (1 - s / 0.15) : 0;
      const activeVisorColor = s < 0.15 ? "rgb(239, 68, 68)" : s < 0.8 ? "rgb(56, 189, 248)" : "rgb(16, 185, 129)";

      // Build coordinates of our 3D entities
      // Vector stack holds point queues for layered drawings
      const projectedElements: { draw: () => void; depth: number }[] = [];

      // 1. BACKPACK THRUST WINGS (Rendered first as they are behind the robot torso)
      for (const side of [-1, 1]) {
        // Draw 3-panel geometric wing grids
        const wingPoints: Point3D[] = [
          { x: side * 15, y: -20, z: -10 },
          { x: side * (18 + shoulderExpand * 35), y: -38 + Math.sin(t * 0.04) * 5, z: -20 },
          { x: side * (32 + shoulderExpand * 50), y: -5 + Math.sin(t * 0.04) * 3, z: -15 },
          { x: side * (12 + shoulderExpand * 25), y: 15, z: -8 }
        ];

        // Apply back oscillations and relative translations
        const mutatedWings = wingPoints.map(p => {
          let np = rotateY(p, side * wingsDeployAngle);
          np.y += hoverY;
          np = rotateY(np, totalRobotRotationY);
          return np;
        });

        projectedElements.push({
          depth: mutatedWings.reduce((acc, p) => acc + p.z, 0) / 4,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(0, 0); // Placeholder relative
            const screenPts = mutatedWings.map(p => project(p, w, h));
            
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            screenPts.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.closePath();
            
            // Neon cyan / blue edge glow matching deep-tech themes
            ctx.strokeStyle = side === 1 ? 'rgba(99, 102, 241, 0.45)' : 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.fillStyle = side === 1 ? 'rgba(99, 102, 241, 0.03)' : 'rgba(56, 189, 248, 0.03)';
            ctx.fill();

            // Inner sub-fins
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            ctx.lineTo(screenPts[2].x, screenPts[2].y);
            ctx.strokeStyle = 'rgba(79, 70, 229, 0.2)';
            ctx.stroke();
          }
        });
      }

      // 2. ROBOTIC SKULL (HEAD)
      const headRawPoints = getHeadVertices();
      const headEdges = getHeadEdges();

      // Apply local nod tilt -> hover oscillation -> global rotY
      const mutatedHeadPoints = headRawPoints.map(p => {
        let np = rotateX(p, headNodAngle); // Nod / standby tilt
        np.y += -38 + hoverY; // Raise head above neck y=-35
        np = rotateY(np, totalRobotRotationY);
        return np;
      });

      projectedElements.push({
        depth: mutatedHeadPoints.reduce((acc, p) => acc + p.z, 0) / mutatedHeadPoints.length,
        draw: () => {
          const screenHdPts = mutatedHeadPoints.map(p => project(p, w, h));
          
          // Draw shell edges
          ctx.strokeStyle = s < 0.15 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1.2;
          headEdges.forEach(edge => {
            if (screenHdPts[edge.a].dev && screenHdPts[edge.b].dev) {
              ctx.beginPath();
              ctx.moveTo(screenHdPts[edge.a].x, screenHdPts[edge.a].y);
              ctx.lineTo(screenHdPts[edge.b].x, screenHdPts[edge.b].y);
              ctx.stroke();
            }
          });

          // Draw the robotic light visor (represented as a curved front bar)
          // Front of octagonal prism are points near indices [3, 4, 11, 12] depending on rotation
          // We construct a dedicated visor line relative to head local angles
          const visorLeft = { x: -14, y: -2, z: 18 };
          const visorCenter = { x: 0, y: -2, z: 24 };
          const visorRight = { x: 14, y: -2, z: 18 };

          const rawVisor = [visorLeft, visorCenter, visorRight];
          const transVisor = rawVisor.map(p => {
            let np = rotateX(p, headNodAngle);
            np.y += -38 + hoverY;
            np = rotateY(np, totalRobotRotationY);
            return project(np, w, h);
          });

          ctx.beginPath();
          ctx.moveTo(transVisor[0].x, transVisor[0].y);
          ctx.lineTo(transVisor[1].x, transVisor[1].y);
          ctx.lineTo(transVisor[2].x, transVisor[2].y);
          ctx.strokeStyle = activeVisorColor;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();

          // visor outer bloom glow effect
          ctx.strokeStyle = activeVisorColor.replace("rgb", "rgba").replace(")", ", 0.35)");
          ctx.lineWidth = 10;
          ctx.stroke();
        }
      });

      // 3. CYBER TORSO CORE (ROBO-BODY)
      // Torso contains multiple nested concentric wireframe rings representing our 3D CPU heart reactor
      const reactorSpeedMultiplier = s < 0.5 ? 0.05 : 0.15;
      const reactorPoints1 = getRingPoints(20, 12, hoverY);
      const reactorPoints2 = getRingPoints(15, 10, hoverY + 12 * Math.sin(t * 0.05));
      const reactorPoints3 = getRingPoints(25, 14, hoverY - 10);

      const transReactor1 = reactorPoints1.map(p => rotateY(p, totalRobotRotationY + t * reactorSpeedMultiplier));
      const transReactor2 = reactorPoints2.map(p => rotateY(p, -totalRobotRotationY - t * (reactorSpeedMultiplier * 1.5)));
      const transReactor3 = reactorPoints3.map(p => rotateY(p, totalRobotRotationY * 0.5));

      projectedElements.push({
        depth: 0, // Torso sits centrally at depth center
        draw: () => {
          // Inner core reactor 1
          ctx.strokeStyle = s < 0.8 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(16, 185, 129, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const screenRect1 = transReactor1.map(p => project(p, w, h));
          ctx.moveTo(screenRect1[0].x, screenRect1[0].y);
          screenRect1.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.stroke();

          // Reactor 2
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          const screenRect2 = transReactor2.map(p => project(p, w, h));
          ctx.moveTo(screenRect2[0].x, screenRect2[0].y);
          screenRect2.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.stroke();

          // Torso reactor cage lines (Vertical structural pillars linking reactor rings)
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
          ctx.lineWidth = 1.0;
          for (let i = 0; i < 6; i++) {
            const idx1 = Math.floor((i * screenRect1.length) / 6);
            const idx2 = Math.floor((i * screenRect2.length) / 6);
            ctx.beginPath();
            ctx.moveTo(screenRect1[idx1].x, screenRect1[idx1].y);
            ctx.lineTo(screenRect2[idx2].x, screenRect2[idx2].y);
            ctx.stroke();
          }

          // Outer shield cage reactor 3 (Base harness)
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
          ctx.beginPath();
          const screenRect3 = transReactor3.map(p => project(p, w, h));
          ctx.moveTo(screenRect3[0].x, screenRect3[0].y);
          screenRect3.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.stroke();
          
          // Reactor glowing core dot (energy source center)
          const coreProj = project({ x: 0, y: hoverY, z: 0 }, w, h);
          ctx.fillStyle = s < 0.8 ? 'rgb(56, 189, 248)' : 'rgb(52, 211, 153)';
          ctx.shadowColor = s < 0.8 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(52, 211, 153, 0.8)';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(coreProj.x, coreProj.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // 4. MULTI-JOINT MECHANICAL ARMS (UNFOLD AS SCROLL PROGRESSES)
      // Left shoulder / claw & Right shoulder / claw
      for (const side of [-1, 1]) {
        // Compute joint calculations
        // standby: arms locked down. diagnostics: hands wide, scans nodes.
        // repair: hands extend and fire packets. optimized: gestures proud salute.
        const startShoulder = { x: side * 28, y: -10 + hoverY, z: -2 };
        
        let elbowAngleY = side * (Math.PI / 4) + s * (Math.PI / 2);
        let elbowAngleX = 0.5 * Math.sin(t * 0.04) + s * 0.2;
        
        // Custom gestures on scroll phases
        if (s >= 0.8) {
          // Pride posture / Right arm folded thumb-up, Left arm docked or saluting
          elbowAngleY = side * 0.4;
          elbowAngleX = side === 1 ? -1.2 : 0.8; // raise right hand proudly
        }

        const elbowLocal = { x: side * 24, y: 15, z: 5 };
        const wristLocal = { x: side * 20, y: 10, z: 12 };

        // Rotate joints chain
        let elbowWorld = rotateY(elbowLocal, elbowAngleY);
        elbowWorld = rotateX(elbowWorld, elbowAngleX);
        elbowWorld.x += startShoulder.x;
        elbowWorld.y += startShoulder.y;
        elbowWorld.z += startShoulder.z;

        let wristWorld = rotateX(wristLocal, elbowAngleX * 1.5);
        wristWorld = rotateY(wristWorld, elbowAngleY * 1.2);
        wristWorld.x += elbowWorld.x;
        wristWorld.y += elbowWorld.y;
        wristWorld.z += elbowWorld.z;

        // Apply global scene rotations to joints
        const sJoint = rotateY(startShoulder, totalRobotRotationY);
        const eJoint = rotateY(elbowWorld, totalRobotRotationY);
        const wJoint = rotateY(wristWorld, totalRobotRotationY);

        projectedElements.push({
          depth: (sJoint.z + eJoint.z + wJoint.z) / 3,
          draw: () => {
            const sProj = project(sJoint, w, h);
            const eProj = project(eJoint, w, h);
            const wProj = project(wJoint, w, h);

            if (sProj.dev && eProj.dev && wProj.dev) {
              // Upper arm skeletal line
              ctx.strokeStyle = 'rgba(99, 102, 241, 0.65)';
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.moveTo(sProj.x, sProj.y);
              ctx.lineTo(eProj.x, eProj.y);
              ctx.stroke();

              // Forearm line
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(eProj.x, eProj.y);
              ctx.lineTo(wProj.x, wProj.y);
              ctx.stroke();

              // Joint circles (Actuator caps)
              ctx.fillStyle = '#818cf8';
              ctx.beginPath();
              ctx.arc(sProj.x, sProj.y, 4, 0, Math.PI * 2);
              ctx.arc(eProj.x, eProj.y, 3, 0, Math.PI * 2);
              ctx.fill();

              // Glowing probe tips
              ctx.fillStyle = s < 0.8 ? '#38bdf8' : '#34d399';
              ctx.beginPath();
              ctx.arc(wProj.x, wProj.y, 3, 0, Math.PI * 2);
              ctx.fill();

              // Draw neon holographic scanning line emanating from hand probes
              if (s > 0.15 && s < 0.5) {
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(wProj.x, wProj.y);
                ctx.lineTo(wProj.x + (side * 80), wProj.y + 110);
                ctx.stroke();
              }
            }
          }
        });
      }

      // 5. INTERACTIVE 3D COMPONENT BEING REPAIRED (GPU CORE & RAM SHIELD)
      // Visualized in coordinate space at the lower area y = 80
      if (s > 0.25) {
        const pcRawVerts = getPCVertices();
        const pcEdges = getPCEdges();

        // Oscillate and rotate components independently to show scanning interaction
        const mutatedPCVerts = pcRawVerts.map(p => {
          let np = rotateY(p, t * 0.007); // slowly spin
          np.y += 8 + Math.sin(t * 0.02) * 2; // slow drift
          np = rotateY(np, totalRobotRotationY); // global sync
          return np;
        });

        // Add to layered elements stack
        projectedElements.push({
          depth: mutatedPCVerts.reduce((acc, p) => acc + p.z, 0) / mutatedPCVerts.length,
          draw: () => {
            const screenPCPts = mutatedPCVerts.map(p => project(p, w, h));
            
            // Color shifts based on scroll (optimizing drivers)
            // Starts red/orange (needs driver help), shifts to pristine deep green (optimization final)
            const wireframeColor = s < 0.5 
              ? 'rgba(239, 68, 68, 0.35)' // Red alert
              : s < 0.8 
                ? 'rgba(245, 158, 11, 0.45)' // Orange loading
                : 'rgba(16, 185, 129, 0.6)'; // Green clear!

            ctx.strokeStyle = wireframeColor;
            ctx.lineWidth = 1.2;

            pcEdges.forEach(edge => {
              if (screenPCPts[edge.a].dev && screenPCPts[edge.b].dev) {
                ctx.beginPath();
                ctx.moveTo(screenPCPts[edge.a].x, screenPCPts[edge.a].y);
                ctx.lineTo(screenPCPts[edge.b].x, screenPCPts[edge.b].y);
                ctx.stroke();
              }
            });

            // Draw a spinning fan inside the wireframe GPU card to show mechanical response
            // Fan center is roughly at the index geometry center (midpoint flat surface)
            const fanCenterLocal1 = { x: -16, y: 80, z: 0 };
            const fanCenterLocal2 = { x: 16, y: 80, z: 0 };

            for (const fCenter of [fanCenterLocal1, fanCenterLocal2]) {
              let fWorld = rotateY(fCenter, t * 0.007);
              fWorld.y += 8 + Math.sin(t * 0.02) * 2;
              fWorld = rotateY(fWorld, totalRobotRotationY);

              const fProj = project(fWorld, w, h);
              if (fProj.dev) {
                const fanRot = t * (s < 0.5 ? 0.04 : 0.18); // fan spins ultra-fast during repairs!
                ctx.strokeStyle = s < 0.8 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(52, 211, 153, 0.65)';
                ctx.lineWidth = 1.0;
                
                // Draw 4 aesthetic blades
                for (let b = 0; b < 4; b++) {
                  const bAngle = fanRot + (b * Math.PI) / 2;
                  const bladeLength = 9;
                  ctx.beginPath();
                  ctx.moveTo(fProj.x, fProj.y);
                  ctx.lineTo(
                    fProj.x + bladeLength * Math.cos(bAngle), 
                    fProj.y + bladeLength * Math.sin(bAngle)
                  );
                  ctx.stroke();
                }

                // Inner circle
                ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
                ctx.beginPath();
                ctx.arc(fProj.x, fProj.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Draw hovering holographic system labels ("GPU CORE", "DRV_LOAD", etc)
            const labelPosLocal = { x: 0, y: 64, z: 0 };
            let lWorld = rotateY(labelPosLocal, t * 0.007);
            lWorld.y += 8 + Math.sin(t * 0.02) * 2;
            lWorld = rotateY(lWorld, totalRobotRotationY);
            
            const lProj = project(lWorld, w, h);
            if (lProj.dev) {
              ctx.fillStyle = s < 0.5 ? '#f43f5e' : s < 0.8 ? '#fbbf24' : '#34d399';
              ctx.font = 'bold 8px monospace';
              ctx.textAlign = 'center';
              const labelText = s < 0.5 ? "[SYS_WARN: OLD_DRIVERS]" : s < 0.8 ? "[INSTALLING_REMOTELY]" : "[ALL_DRIVERS_OPTIMAL]";
              ctx.fillText(labelText, lProj.x, lProj.y);
            }
          }
        });
      }

      // 6. DYNAMIC SIGNAL BEAM DEPLOYMENT (AnyDesk secure tunnels)
      // Visualizing data transmission between robot visor / core down onto motherboard
      if (s > 0.45) {
        projectedElements.push({
          depth: 200, // front overlays
          draw: () => {
            // Draw dual spiraling double-helix strands connecting heart to PC box
            const corePos = project({ x: 0, y: hoverY, z: 0 }, w, h);
            const tcLocalPoint = { x: 0, y: 80, z: 0 };
            let tcWorld = rotateY(tcLocalPoint, t * 0.007);
            tcWorld.y += 8 + Math.sin(t * 0.02) * 2;
            tcWorld = rotateY(tcWorld, totalRobotRotationY);
            const destPos = project(tcWorld, w, h);

            if (corePos.dev && destPos.dev) {
              const diffY = destPos.y - corePos.y;
              ctx.lineWidth = 1;
              const pointsCount = 20;

              for (const strand of [-1, 1]) {
                ctx.strokeStyle = strand === 1 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(139, 92, 246, 0.4)';
                ctx.beginPath();
                
                for (let i = 0; i <= pointsCount; i++) {
                  const factor = i / pointsCount;
                  const phaseVal = t * 0.15 + factor * Math.PI * 4;
                  const lateralOffset = Math.sin(phaseVal) * 15 * strand;
                  const stepX = corePos.x + (destPos.x - corePos.x) * factor + lateralOffset;
                  const stepY = corePos.y + diffY * factor;

                  if (i === 0) ctx.moveTo(stepX, stepY);
                  else ctx.lineTo(stepX, stepY);
                }
                ctx.stroke();
              }

              // Draw flying neon particles down the strands (Data packets)
              networkPulses.current.forEach(p => {
                p.pos += p.speed * (s < 0.8 ? 1.0 : 2.5); // Packets travel at mach speed!
                if (p.pos > 1.0) p.pos = 0;

                const factor = p.pos;
                const phaseVal = t * 0.15 + factor * Math.PI * 4;
                const lateralOffset = Math.sin(phaseVal) * 15;
                const px = corePos.x + (destPos.x - corePos.x) * factor + lateralOffset;
                const py = corePos.y + diffY * factor;

                ctx.fillStyle = s < 0.8 ? '#38bdf8' : '#34d399';
                ctx.shadowColor = s < 0.8 ? '#38bdf8' : '#34d399';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
              });
            }
          }
        });
      }

      // 7. AMBIENT FIELD PARTICLES (Outer Starfield)
      // Floating particles with depth projection
      dataParticles.current.forEach(pt => {
        // apply orbital rotation to starfield based on scroll interaction
        const globalSp = t * 0.001 + s * 0.005;
        let transP = rotateY(pt, globalSp);
        transP = rotateX(transP, t * 0.0004);
        transP.y += hoverY * 0.3;

        const projPt = project(transP, w, h);
        if (projPt.dev) {
          const distanceScale = 300 / (transP.z + 300);
          const size = pt.size * distanceScale;
          
          if (size > 0.1) {
            projectedElements.push({
              depth: transP.z,
              draw: () => {
                ctx.fillStyle = s < 0.8 ? pt.color : '#34d399';
                ctx.beginPath();
                ctx.arc(projPt.x, projPt.y, size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        }
      });

      // 8. PERSPECTIVE DEPTH DRAW SORTING
      // Sort in descending order of z coordinates so items further away (larger z) are drawn first
      projectedElements.sort((a, b) => b.depth - a.depth);
      projectedElements.forEach(item => item.draw());

      // 9. CYBER HUD SCHEMATIC GRAPHICS OVERLAY
      // Draws circular rotating geometric compass elements around robot
      const drawHUD = () => {
        const centerProj = project({ x: 0, y: hoverY, z: 0 }, w, h);
        if (!centerProj.dev) return;

        ctx.strokeStyle = s < 0.8 ? 'rgba(99, 102, 241, 0.09)' : 'rgba(52, 211, 153, 0.12)';
        ctx.lineWidth = 1;

        // Big outer tech circle
        ctx.beginPath();
        ctx.arc(centerProj.x, centerProj.y, 85, 0, Math.PI * 2);
        ctx.stroke();

        // Dashed inner ring
        ctx.beginPath();
        ctx.setLineDash([5, 8]);
        ctx.arc(centerProj.x, centerProj.y, 65, t * 0.005, t * 0.005 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // clear

        // Scrolling angle ticks
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 2;
        const tickCount = 12;
        for (let i = 0; i < tickCount; i++) {
          const angle = (i * Math.PI * 2) / tickCount + t * 0.002;
          const innerR = 85;
          const outerR = 91;
          ctx.beginPath();
          ctx.moveTo(
            centerProj.x + innerR * Math.cos(angle), 
            centerProj.y + innerR * Math.sin(angle)
          );
          ctx.lineTo(
            centerProj.x + outerR * Math.cos(angle), 
            centerProj.y + outerR * Math.sin(angle)
          );
          ctx.stroke();
        }

        // Floating diagnostic lock box
        if (s > 0.15 && s < 0.5) {
          const bx = centerProj.x - 70;
          const by = centerProj.y + 40;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
          ctx.fillRect(bx, by, 140, 25);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(bx, by, 140, 25);

          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`PORT SECURITY: ENCRYPTED`, bx + 130, by + 10);
          ctx.fillText(`HARDWARE SCANNING AT 60FPS`, bx + 130, by + 18);
        }
      };

      drawHUD();

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollProgress]);

  // Color helper based on repair phases
  const getPhaseGradient = () => {
    switch (robotStatus) {
      case 'standby': return "from-blue-500/20 to-indigo-500/10 border-indigo-500/20";
      case 'diagnostic': return "from-rose-500/20 to-orange-500/10 border-rose-500/20";
      case 'repairing': return "from-amber-500/20 to-pink-500/10 border-amber-500/20 animate-pulse";
      case 'optimized': return "from-emerald-500/25 to-teal-500/15 border-emerald-500/30";
    }
  };

  const getPhaseIcon = () => {
    switch (robotStatus) {
      case 'standby': return <Settings className="h-5 w-5 text-indigo-400 rotate-animation" />;
      case 'diagnostic': return <Activity className="h-5 w-5 text-rose-400 animate-pulse" />;
      case 'repairing': return <Zap className="h-5 w-5 text-amber-300 animate-bounce" />;
      case 'optimized': return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
    }
  };

  const getPercentageString = () => {
    return `${Math.floor(scrollProgress * 100)}%`;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex flex-col justify-end p-6 select-none font-sans">
      
      {/* 3D Render Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Holographic Control HUD Panel */}
      <div className={`relative z-20 w-full bg-slate-950/80 border backdrop-blur-md rounded-2xl p-4.5 text-right transition-all duration-500 bg-gradient-to-r ${getPhaseGradient()}`}>
        
        {/* TOP COMPACT HUD ROW */}
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 border border-white/10 rounded-lg shadow-sm">
              {getPhaseIcon()}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">دستگاه ناوبری هوشمند ۳بعدی</span>
              <h4 className="text-xs font-black text-slate-100 font-sans tracking-tight">ابرتکنسین اتوماتیک ایزی‌درایور (EasyBot)</h4>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-300 font-bold">
              FAZ: {robotStatus.toUpperCase()}
            </span>
            <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              {getPercentageString()}
            </span>
          </div>
        </div>

        {/* DETAILED CYBER LOG BASED ON PROGRESS */}
        <div className="space-y-2">
          
          <div className="flex items-start gap-2 text-[11px] leading-relaxed">
            <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full shrink-0 mt-1.5 animate-ping" />
            <p className="text-slate-200 font-medium">
              <span className="text-indigo-300 font-bold ml-1">وضعیت جاری:</span>
              {hudMessage}
            </p>
          </div>

          {/* DYNAMIC TELEMETRY PROGRESS METRE */}
          <div className="w-full bg-slate-900/60 h-1.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${scrollProgress * 100}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            />
          </div>

          {/* EXPANSIVE INTERCONNECTED CONTROLS */}
          <AnimatePresence mode="wait">
            {robotStatus === 'optimized' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between pt-1.5 pt-2 border-t border-white/5 mt-2"
              >
                <div className="text-[10px] text-slate-400">
                  <span className="text-emerald-400 font-black">✔</span> لایسنس دائمی آماده تزریق
                </div>
                
                <button
                  onClick={() => setActiveTab('new-request')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>ثبت و تحویل فوری به تکنسین واقعی</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
