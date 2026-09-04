import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  onSequenceComplete?: () => void;
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

export default function HeroParallaxExperience({ onSequenceComplete, onEnterLogin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasTriggeredComplete = useRef<boolean>(false);

  const [currentSeq, setCurrentSeq] = useState<1 | 2>(1);
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Cached Image instances for smooth canvas rendering
  const imagesCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafId = useRef<number | null>(null);

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

    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const nx = (cw - nw) / 2;
    const ny = (ch - nh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, nx, ny, nw, nh);
  };

  // Preload initial frames immediately
  useEffect(() => {
    let isMounted = true;

    const initialUrls: string[] = [];
    for (let i = 1; i <= Math.min(30, TOTAL_FRAMES_SEQ1); i++) {
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

      // Stream remaining frames in background
      const remainingUrls: string[] = [];
      for (let i = 31; i <= TOTAL_FRAMES_SEQ1; i++) {
        remainingUrls.push(getFrameUrl(1, i));
      }
      for (let i = 16; i <= TOTAL_FRAMES_SEQ2; i++) {
        remainingUrls.push(getFrameUrl(2, i));
      }

      let idx = 0;
      const loadNextBatch = () => {
        if (!isMounted || idx >= remainingUrls.length) return;
        const batch = remainingUrls.slice(idx, idx + 15);
        idx += 15;

        batch.forEach((url) => {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            if (isMounted) imagesCache.current.set(url, img);
          };
        });

        setTimeout(loadNextBatch, 35);
      };

      loadNextBatch();
    });

    return () => {
      isMounted = false;
    };
  }, [drawFrame]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      drawFrame(currentSeq, currentFrame);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentSeq, currentFrame, drawFrame]);

  // Map normalized scroll progress [0..1] to frame index in sequence 1 or 2
  const applyProgress = useCallback(
    (progress: number) => {
      setScrollProgress(progress);
      let seq: 1 | 2;
      let frame: number;

      if (progress <= SEQ1_RATIO) {
        // Sequence 1: frames 1 to 209
        seq = 1;
        const p1 = progress / SEQ1_RATIO;
        frame = Math.min(
          TOTAL_FRAMES_SEQ1,
          Math.max(1, Math.floor(p1 * (TOTAL_FRAMES_SEQ1 - 1)) + 1)
        );
      } else {
        // Sequence 2: frames 1 to 60
        seq = 2;
        const p2 = (progress - SEQ1_RATIO) / (1 - SEQ1_RATIO);
        frame = Math.min(
          TOTAL_FRAMES_SEQ2,
          Math.max(1, Math.floor(p2 * (TOTAL_FRAMES_SEQ2 - 1)) + 1)
        );
      }

      setCurrentSeq(seq);
      setCurrentFrame(frame);
      drawFrame(seq, frame);
    },
    [drawFrame]
  );

  // Scroll listener with automatic navigation upon sequence completion
  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const totalScrollable = container.offsetHeight - window.innerHeight;
        if (totalScrollable <= 0) return;

        const progress = Math.max(0, Math.min(1, -rect.top / totalScrollable));
        applyProgress(progress);

        // Auto-navigate smoothly to next section when parallax sequence completes
        if (progress >= 0.985 && !hasTriggeredComplete.current) {
          hasTriggeredComplete.current = true;
          if (onSequenceComplete) {
            onSequenceComplete();
          } else {
            const nextSection = document.getElementById("gateway");
            if (nextSection) {
              nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        } else if (progress < 0.90) {
          hasTriggeredComplete.current = false;
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [applyProgress, onSequenceComplete]);

  return (
    <div
      ref={containerRef}
      id="hero-parallax"
      className="relative w-full"
      style={{
        height: "300vh", // Optimized scroll track: seamless scrub through 269 frames then auto-glides
        background: "#081424",
      }}
    >
      {/* Sticky Fullscreen Cinematic Hero Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Hardware-Accelerated 60fps Frame Sequence Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: isReady ? 1 : 0.9 }}
        />

        {/* Ambient Dark Gradient Overlays for High-Contrast Readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8, 20, 36, 0.45) 0%, rgba(8, 20, 36, 0.15) 45%, rgba(8, 20, 36, 0.85) 100%)",
          }}
        />

        {/* ── Hero Header Title (Clean, Minimalist) ── */}
        <div
          className="relative z-20 max-w-5xl mx-auto px-6 text-center transition-all duration-300 pointer-events-none"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 3.2),
            transform: `translate3d(0, -${scrollProgress * 50}px, 0)`,
          }}
        >
          {/* Main Hero Header Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] font-sans drop-shadow-lg">
            Quantum-Inspired <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#AFD2FA] to-[#B9915E]">
              Green Fleet Optimization
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
}
