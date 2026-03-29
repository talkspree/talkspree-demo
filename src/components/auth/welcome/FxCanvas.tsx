import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface FxCanvasHandle {
  fire: (x: number, y: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  drag: number;
  gravity: number;
  size: number;
}

const FxCanvas = forwardRef<FxCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  const createParticles = (x: number, y: number) => {
    const particleCount = 60;
    const colors = [
      '#3b82f6', '#60a5fa', '#a855f7',
      '#c084fc', '#e879f9', '#fbbf24'
    ];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        drag: 0.96,
        gravity: 0.1,
        size: Math.random() * 3 + 1
      });
    }
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.05);

    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.alpha *= 0.96;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (particlesRef.current.length > 0) {
      frameRef.current = requestAnimationFrame(update);
    }
  };

  useImperativeHandle(ref, () => ({
    fire: (x: number, y: number) => {
      createParticles(x, y);
      cancelAnimationFrame(frameRef.current);
      update();
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === parent) {
          canvas.width = entry.contentRect.width;
          canvas.height = entry.contentRect.height;
        }
      }
    });

    resizeObserver.observe(parent);
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    return () => resizeObserver.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute top-0 left-0 w-full h-full z-50" />;
});

FxCanvas.displayName = 'FxCanvas';

export default FxCanvas;
