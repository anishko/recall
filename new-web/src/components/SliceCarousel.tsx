"use client";
import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface Highlight {
  x: number;
  y: number;
  r: number;
  sliceIndex?: number;
}

interface SliceCarouselProps {
  slices: string[];
  highlight?: Highlight;
  className?: string;
  showControls?: boolean;
}

export function SliceCarousel({ slices, highlight, className, showControls = true }: SliceCarouselProps) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [showHighlight, setShowHighlight] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slices.length) % slices.length);
    setZoom(1); setPanX(0); setPanY(0);
  }, [slices.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slices.length);
    setZoom(1); setPanX(0); setPanY(0);
  }, [slices.length]);

  const resetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
    if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 1));
    if (e.key === "Escape") { resetView(); setFullscreen(false); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setPanX(panStart.current.panX + (e.clientX - panStart.current.x));
    setPanY(panStart.current.panY + (e.clientY - panStart.current.y));
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.max(1, Math.min(z + delta, 4)));
    if (e.deltaY > 0) { setPanX(0); setPanY(0); }
  };

  const hasHighlight = showHighlight && highlight &&
    (highlight.sliceIndex == null || highlight.sliceIndex === index);

  const imageStyle = {
    transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
    cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
    transition: isPanning ? "none" : "transform 0.15s ease",
  };

  return (
    <div className={cn("space-y-2 select-none", className)}>
      {/* Main viewer */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-xl overflow-hidden bg-black",
          fullscreen
            ? "fixed inset-0 z-50 rounded-none aspect-auto"
            : "aspect-square"
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={`CT imaging: slice ${index + 1} of ${slices.length}`}
      >
        {/* Image with pan/zoom */}
        <div
          className="w-full h-full overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slices[index]}
            alt={`CT scan slice ${index + 1}`}
            draggable={false}
            style={imageStyle}
            className="w-full h-full object-contain"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              if (!el.src.includes("placehold")) {
                el.src = `https://placehold.co/512x512/0a0a0a/2a4a6a?text=CT+Slice+${index + 1}%0APlace+image+in%0Apublic%2Fradrelay_images%2F`;
              }
            }}
          />

          {/* SVG highlight */}
          {hasHighlight && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Outer pulse ring */}
              <circle
                cx={highlight.x} cy={highlight.y} r={highlight.r + 3}
                fill="none" stroke="var(--color-annotation)" strokeWidth="0.3" opacity="0.4"
              >
                <animate attributeName="r" values={`${highlight.r + 2};${highlight.r + 5};${highlight.r + 2}`} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Main circle */}
              <circle
                cx={highlight.x} cy={highlight.y} r={highlight.r}
                fill="var(--color-annotation-bg)"
                stroke="var(--color-annotation)" strokeWidth="0.7"
                filter="url(#glow)"
              >
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Label */}
              <text
                x={highlight.x + highlight.r + 1.5}
                y={highlight.y - 1}
                fontSize="3.5"
                fill="var(--color-annotation)"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                Finding
              </text>
              <line
                x1={highlight.x + highlight.r} y1={highlight.y}
                x2={highlight.x + highlight.r + 1.5} y2={highlight.y}
                stroke="var(--color-annotation)" strokeWidth="0.4" opacity="0.7"
              />
            </svg>
          )}
        </div>

        {/* Top-right controls */}
        {showControls && (
          <div className="absolute top-2 right-2 flex gap-1">
            <ControlButton
              onClick={() => setShowHighlight((v) => !v)}
              title={showHighlight ? "Hide finding" : "Show finding"}
              active={showHighlight}
            >
              <div className="h-3 w-3 rounded-full border-2 border-current" />
            </ControlButton>
            <ControlButton onClick={() => setZoom((z) => Math.min(z + 0.5, 4))} title="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </ControlButton>
            <ControlButton onClick={() => { setZoom((z) => Math.max(z - 0.5, 1)); if (zoom <= 1.5) resetView(); }} title="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </ControlButton>
            <ControlButton onClick={resetView} title="Reset view">
              <RotateCcw className="h-3.5 w-3.5" />
            </ControlButton>
            <ControlButton onClick={() => { setFullscreen((v) => !v); resetView(); }} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <Maximize2 className="h-3.5 w-3.5" />
            </ControlButton>
          </div>
        )}

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
            CT · Axial
          </span>
          <span className="text-[10px] font-mono text-white/70">
            {index + 1}/{slices.length}
            {zoom > 1 && ` · ${Math.round(zoom * 100)}%`}
          </span>
        </div>

        {/* Fullscreen close */}
        {fullscreen && (
          <button
            onClick={() => { setFullscreen(false); resetView(); }}
            className="absolute top-4 left-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80 transition-colors"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Navigation */}
      {slices.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            aria-label="Previous slice"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--color-muted)]" />
          </button>

          <div className="flex gap-1.5 items-center">
            {slices.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); resetView(); }}
                aria-label={`Slice ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "rounded-full transition-all",
                  i === index
                    ? "w-5 h-1.5 bg-[var(--color-primary)]"
                    : "w-1.5 h-1.5 bg-[var(--color-border)]"
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next slice"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-[10px] text-[var(--color-muted-2)] text-center">
        ← → to navigate · scroll to zoom · drag when zoomed
      </p>
    </div>
  );
}

function ControlButton({
  onClick, title, children, active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      style={
        active
          ? { background: "var(--color-annotation)", color: "#000" }
          : { background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }
      }
    >
      {children}
    </button>
  );
}
