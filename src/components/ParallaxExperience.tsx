import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  onEnterLogin?: (role?: "controller" | "captain") => void;
}

const TOTAL_FRAMES_SEQ1 = 209;
const TOTAL_FRAMES_SEQ2 = 60;
const TOTAL_FRAMES = TOTAL_FRAMES_SEQ1 + TOTAL_FRAMES_SEQ2; // 269 total
const SEQ1_RATIO = TOTAL_FRAMES_SEQ1 / TOTAL_FRAMES; // ~0.777 (77.7%)

function getFrameUrl(seq: 1 | 2, frameNum: number): string {
  const padded = String(frameNum).padStart(3, "0");
  return `/sequence/${seq}/ezgif-frame-${padded}.jpg`;
}

export default function ParallaxExperience({ onEnterLogin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSeq, setCurrentSeq] = useState<1 | 2>(1);
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Cached Image instances for smooth canvas rendering
  const imagesCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafId = useRef<number | null>(null);
  const playIntervalRef = useRef<any>(null);

  // Draw current frame on canvas with high-dpi cover scaling
  const drawFrame = useCallback((seq: 1 | 2, frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const url = getFrameUrl(seq, frame);
    const cached = imagesCache.current.get(url);

    if (cached && cached.complete) {
      renderImageToCanvas(ctx, canvas, cached);
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        imagesCache.current.set(url, img);
        renderImageToCanvas(ctx, canvas, img);
      };
    }
  }, []);

  const renderImageToCanvas = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement
  ) => {
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || img.width || 1920;
    const ih = img.naturalHeight || img.height || 1080;

    // Object-fit: cover calculations
    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const nx = (cw - nw) / 2;
    const ny = (ch - nh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, nx, ny, nw, nh);
  };

  // Preload frames progressively
  useEffect(() => {
    let isMounted = true;

    // Initial critical batch: first 25 frames of Folder 1 and 15 frames of Folder 2
    const initialUrls: string[] = [];
    for (let i = 1; i <= Math.min(25, TOTAL_FRAMES_SEQ1); i++) {
      initialUrls.push(getFrameUrl(1, i));
    }
    for (let i = 1; i <= Math.min(15, TOTAL_FRAMES_SEQ2); i++) {
      initialUrls.push(getFrameUrl(2, i));
    }

    const loadInitial = initialUrls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          if (isMounted) imagesCache.current.set(url, img);
          resolve();
        };
        img.onerror = () => resolve();
      });
    });

    Promise.all(loadInitial).then(() => {
      if (isMounted) {
        setIsReady(true);
        drawFrame(1, 1);
      }

      // Progressively load remaining frames
      const remainingUrls: string[] = [];
      for (let i = 26; i <= TOTAL_FRAMES_SEQ1; i++) {
        remainingUrls.push(getFrameUrl(1, i));
      }
      for (let i = 16; i <= TOTAL_FRAMES_SEQ2; i++) {
        remainingUrls.push(getFrameUrl(2, i));
      }

      let idx = 0;
      const loadNextBatch = () => {
        if (!isMounted || idx >= remainingUrls.length) return;
        const batch = remainingUrls.slice(idx, idx + 12);
        idx += 12;

        batch.forEach((url) => {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            if (isMounted) imagesCache.current.set(url, img);
          };
        });

        setTimeout(loadNextBatch, 40);
      };

      loadNextBatch();
    });

    return () => {
      isMounted = false;
    };
  }, [drawFrame]);

  // Resize canvas to match display size
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      drawFrame(currentSeq, currentFrame);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentSeq, currentFrame, drawFrame]);

  // Update frame based on normalized total progress (0 to 1)
  const applyProgress = useCallback(
    (progress: number) => {
      const p = Math.max(0, Math.min(1, progress));
      setScrollProgress(p);

      let seq: 1 | 2 = 1;
      let frame = 1;

      if (p < SEQ1_RATIO) {
        // Folder 1 sequence (frames 1 to 240)
        seq = 1;
        const localProgress = p / SEQ1_RATIO;
        frame = Math.max(1, Math.min(TOTAL_FRAMES_SEQ1, Math.floor(localProgress * TOTAL_FRAMES_SEQ1) + 1));
      } else {
        // Folder 2 sequence (frames 1 to 60)
        seq = 2;
        const localProgress = (p - SEQ1_RATIO) / (1 - SEQ1_RATIO);
        frame = Math.max(1, Math.min(TOTAL_FRAMES_SEQ2, Math.floor(localProgress * TOTAL_FRAMES_SEQ2) + 1));
      }

      setCurrentSeq(seq);
      setCurrentFrame(frame);
      drawFrame(seq, frame);
    },
    [drawFrame]
  );

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (isPlaying) return; // let auto-play handle if active

      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const totalScrollable = container.offsetHeight - window.innerHeight;
        if (totalScrollable <= 0) return;

        // Progress from 0 (top of section) to 1 (bottom of section)
        const progress = Math.max(0, Math.min(1, -rect.top / totalScrollable));
        applyProgress(progress);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [applyProgress, isPlaying]);

  // Auto-play animation loop
  const togglePlay = () => {
    if (isPlaying) {
      clearInterval(playIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let p = scrollProgress >= 0.99 ? 0 : scrollProgress;

      playIntervalRef.current = setInterval(() => {
        p += 0.004;
        if (p >= 1) {
          p = 1;
          applyProgress(1);
          clearInterval(playIntervalRef.current);
          setIsPlaying(false);
        } else {
          applyProgress(p);
        }
      }, 33); // ~30 fps
    }
  };

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  // Milestone info for dynamic storytelling
  const getMilestoneInfo = () => {
    if (scrollProgress < 0.25) {
      return {
        stage: "Sequence 1 • Stage 01",
        title: "Deep-Ocean Passage Optimization",
        desc: "Satellite meteorological routing & dynamic currents bypass high-drag wave fields.",
        badge: "Route Pathfinding",
      };
    } else if (scrollProgress < 0.55) {
      return {
        stage: "Sequence 1 • Stage 02",
        title: "Hydrodynamic Trim & Pitch Balance",
        desc: "Automated weight distribution aligns vessel draft to minimize stern wave friction.",
        badge: "Hull Hydrodynamics",
      };
    } else if (scrollProgress < 0.8) {
      return {
        stage: "Sequence 1 • Stage 03",
        title: "Kinetics & Dual-Fuel Modulation",
        desc: "Intelligent switching between LNG, Methanol, and Ammonia power cycles.",
        badge: "Alternative Fuels",
      };
    } else if (scrollProgress < 0.92) {
      return {
        stage: "Sequence 2 • Stage 04",
        title: "Terminal Approach & Port Decarbonization",
        desc: "Low-emission slow steaming approach into green maritime corridors (Folder 2).",
        badge: "ECA Compliance",
      };
    } else {
      return {
        stage: "Sequence 2 • Stage 05",
        title: "Cold-Ironing & Shore Power Docking",
        desc: "High-voltage AMP connectivity eliminating harbor auxiliary emissions.",
        badge: "Harbor Operations",
      };
    }
  };

  const milestone = getMilestoneInfo();

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        height: "400vh", // Tall scroll track to allow smooth scrubbing through 300 frames
        background: "#081424",
      }}
    >
      {/* Sticky Fullscreen Cinematic Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Canvas for 60fps Frame Sequence Rendering */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: isReady ? 1 : 0.8 }}
        />

        {/* Ambient Dark Gradient Overlays for Readability & Depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(8, 20, 36, 0.88) 0%, rgba(8, 20, 36, 0.2) 40%, rgba(8, 20, 36, 0.6) 100%)",
          }}
        />

        {/* Top Header Indicator Bar */}
        <div className="absolute top-6 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-[#182350]/90 backdrop-blur-md border border-[#AFD2FA]/30 text-white text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ background: currentSeq === 1 ? "#2E9B68" : "#AFD2FA" }}
              />
              <span>
                {currentSeq === 1
                  ? `Folder 1 Sequence (${currentFrame}/${TOTAL_FRAMES_SEQ1})`
                  : `Folder 2 Sequence (${currentFrame}/${TOTAL_FRAMES_SEQ2})`}
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono text-[#AFD2FA] drop-shadow-md">
              Scroll or Scrub to Animate
            </span>
          </div>

          {/* Sequence 1 -> Sequence 2 Transition Indicator & Auto-Play */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={togglePlay}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
                isPlaying
                  ? "bg-[#C94B4B] text-white"
                  : "bg-[#2E9B68] hover:bg-[#258257] text-white"
              }`}
            >
              <span>{isPlaying ? "❚❚ Pause" : "▶ Play Tour"}</span>
            </button>

            <div
              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                currentSeq === 1
                  ? "bg-[#AFD2FA] text-[#182350] shadow-md scale-105"
                  : "bg-black/40 text-white/60 border border-white/10"
              }`}
            >
              1. Ocean Transit (240f)
            </div>
            <span className="text-white/40 text-xs">→</span>
            <div
              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                currentSeq === 2
                  ? "bg-[#2E9B68] text-white shadow-md scale-105"
                  : "bg-black/40 text-white/60 border border-white/10"
              }`}
            >
              2. Port Arrival (60f)
            </div>
          </div>
        </div>

        {/* Parallax Floating Storytelling Card (Dynamically updates with scroll) */}
        <div className="absolute bottom-10 left-6 right-6 sm:left-12 sm:right-auto max-w-xl z-20 pointer-events-auto">
          <div className="p-6 rounded-2xl bg-[#0B1A2E]/90 backdrop-blur-xl border border-[#AFD2FA]/30 shadow-2xl space-y-3 transition-all duration-300">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#AFD2FA] font-bold">
                {milestone.stage}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#182350] text-[#AFD2FA] border border-[#AFD2FA]/40">
                {milestone.badge}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              {milestone.title}
            </h2>

            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed font-sans">
              {milestone.desc}
            </p>

            {/* Interactive Scrub Slider */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-[#AFD2FA]">
                <span>
                  {currentSeq === 1 ? "Folder 1 (Ocean Transit)" : "Folder 2 (Port Approach)"}
                </span>
                <span className="font-bold">
                  Frame {currentSeq === 1 ? currentFrame : TOTAL_FRAMES_SEQ1 + currentFrame} / {TOTAL_FRAMES} (
                  {Math.round(scrollProgress * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.002"
                value={scrollProgress}
                onChange={(e) => {
                  if (isPlaying) {
                    clearInterval(playIntervalRef.current);
                    setIsPlaying(false);
                  }
                  applyProgress(parseFloat(e.target.value));
                }}
                className="w-full accent-[#AFD2FA] cursor-pointer"
              />
            </div>

            {/* Quick CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onEnterLogin && onEnterLogin("controller")}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#AFD2FA] hover:bg-white text-[#182350] transition-all cursor-pointer shadow-md"
              >
                Controller Portal →
              </button>
              <button
                onClick={() => onEnterLogin && onEnterLogin("captain")}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              >
                Captain Bridge ⚓
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Prompt Indicator on Bottom Right */}
        <div className="absolute bottom-10 right-8 z-20 hidden md:flex flex-col items-center gap-2 pointer-events-none text-[#AFD2FA]">
          <span className="text-[10px] uppercase font-bold tracking-widest animate-bounce">
            Scroll to Advance Sequence
          </span>
          <div className="w-5 h-8 rounded-full border-2 border-[#AFD2FA]/60 flex items-start justify-center p-1">
            <div className="w-1.5 h-2 rounded-full bg-[#AFD2FA] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
