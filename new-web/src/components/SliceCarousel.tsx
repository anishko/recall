"use client";
import { useState, useCallback, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

interface SliceCarouselProps {
  slices: string[];
  className?: string;
  showControls?: boolean;
  /** Clinical = zoom/fullscreen; patient = swipe-friendly, simpler chrome */
  mode?: "clinical" | "patient";
  overlay?: ReactNode;
}

export function SliceCarousel({
  slices,
  className,
  showControls,
  mode = "clinical",
  overlay,
}: SliceCarouselProps) {
  const isPatient = mode === "patient";
  const controlsVisible = showControls ?? !isPatient;
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStartX = useRef<number | null>(null);
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
    if (isPatient) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.max(1, Math.min(z + delta, 4)));
    if (e.deltaY > 0) { setPanX(0); setPanY(0); }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || zoom > 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 48) prev();
    else if (dx < -48) next();
    touchStartX.current = null;
  };

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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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

        </div>

        {overlay}

        {/* Top-right controls */}
        {controlsVisible && (
          <div className="absolute top-2 right-2 flex gap-1.5">
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
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
            {isPatient ? "CT · Patient view" : "CT · Axial"}
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
      {!isPatient && (
        <p className="text-[10px] text-[var(--color-muted-2)] text-center">
          ← → to navigate · scroll to zoom · drag when zoomed
        </p>
      )}
      {isPatient && slices.length > 1 && (
        <p className="text-[10px] text-[var(--color-muted-2)] text-center font-sans">
          Swipe left or right · tap dots to jump between slices
        </p>
      )}
    </div>
  );
}

function ControlButton({
  onClick, title, children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}
    >
      {children}
    </button>
  );
}
