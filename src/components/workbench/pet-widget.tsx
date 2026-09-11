import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PetMood = "normal" | "thinking" | "market_weak" | "hover_smile";

type PetPosition = {
  left: number;
  top: number;
};

const PET_POSITION_STORAGE_KEY = "investoday.pet.position.v1";
const EDGE_PADDING = 12;
const DEFAULT_MARGIN = 24;
const FALLBACK_WIDGET_SIZE = { width: 150, height: 270 };

const PET_MOOD_META: Record<PetMood, { src: string; alt: string; message: string; alwaysShowBubble: boolean }> = {
  normal: {
    src: "/pet/yellow-pet-look-at-me-320.gif",
    alt: "投研宠物：正常状态",
    message: "我在。",
    alwaysShowBubble: false,
  },
  thinking: {
    src: "/pet/yellow-pet-thinking-spinner-220.gif",
    alt: "投研宠物：正在分析",
    message: "我正在分析。",
    alwaysShowBubble: true,
  },
  market_weak: {
    src: "/pet/yellow-pet-market-weak-220.jpg",
    alt: "投研宠物：大盘偏弱",
    message: "今天盘面偏弱，先看风险。",
    alwaysShowBubble: true,
  },
  hover_smile: {
    src: "/pet/yellow-pet-hover-smile-loop-220.gif",
    alt: "投研宠物：开心大笑",
    message: "嘿嘿，我在这儿。",
    alwaysShowBubble: true,
  },
};

export function PetWidget({ busy, marketWeak }: { busy: boolean; marketWeak: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastPositionRef = useRef<PetPosition | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<PetPosition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const size = getWidgetSize(rootRef.current);
    const restored = readStoredPosition();
    const nextPosition = clampPosition(restored ?? defaultPosition(size), size);
    lastPositionRef.current = nextPosition;
    setPosition(nextPosition);
  }, []);

  useEffect(() => {
    if (position) lastPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleResize() {
      setPosition((current) => {
        const size = getWidgetSize(rootRef.current);
        const nextPosition = clampPosition(current ?? defaultPosition(size), size);
        lastPositionRef.current = nextPosition;
        writeStoredPosition(nextPosition);
        return nextPosition;
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mood: PetMood = useMemo(() => {
    if (busy) return "thinking";
    if (hovered && !dragging) return "hover_smile";
    if (marketWeak) return "market_weak";
    return "normal";
  }, [busy, dragging, hovered, marketWeak]);

  const meta = PET_MOOD_META[mood];
  const showBubble = meta.alwaysShowBubble || hovered || dragging;
  const style = position
    ? ({ left: position.left, top: position.top } satisfies CSSProperties)
    : ({ bottom: DEFAULT_MARGIN, right: DEFAULT_MARGIN } satisfies CSSProperties);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button > 0) return;
    const point = eventClientPoint(event);
    if (!point) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: point.x - rect.left,
      y: point.y - rect.top,
    };
    draggingRef.current = true;
    setDragging(true);
    setHovered(false);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const point = eventClientPoint(event);
      if (!point) return;
      event.preventDefault();
      const size = getWidgetSize(rootRef.current);
      const nextPosition = clampPosition(
        {
          left: point.x - dragOffsetRef.current.x,
          top: point.y - dragOffsetRef.current.y,
        },
        size
      );
      lastPositionRef.current = nextPosition;
      setPosition(nextPosition);
    },
    []
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      draggingRef.current = false;
      setDragging(false);
      setPosition((current) => {
        const size = getWidgetSize(rootRef.current);
        const nextPosition = clampPosition(lastPositionRef.current ?? current ?? defaultPosition(size), size);
        lastPositionRef.current = nextPosition;
        writeStoredPosition(nextPosition);
        return nextPosition;
      });
    },
    []
  );

  return (
    <div
      ref={rootRef}
      data-testid="pet-widget"
      aria-label="投研宠物"
      className={`fixed z-50 h-[270px] w-[150px] select-none touch-none transition-transform duration-150 max-sm:h-[210px] max-sm:w-[112px] ${
        dragging ? "scale-[1.03] cursor-grabbing" : "cursor-grab"
      }`}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div
        aria-live="polite"
        className={`pointer-events-none absolute bottom-full left-1/2 mb-2 max-w-[13rem] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/75 bg-white/90 px-3 py-2 text-xs font-semibold text-ink/70 shadow-[0_12px_28px_rgba(56,82,88,0.12)] backdrop-blur transition duration-150 ${
          showBubble ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        {meta.message}
      </div>
      <img
        key={meta.src}
        src={meta.src}
        alt={meta.alt}
        draggable={false}
        className="pointer-events-none absolute bottom-0 left-1/2 max-h-full max-w-full -translate-x-1/2 object-contain drop-shadow-[0_18px_28px_rgba(21,34,37,0.18)]"
      />
    </div>
  );
}

function getWidgetSize(element: HTMLElement | null) {
  const rect = element?.getBoundingClientRect();
  const width = rect && rect.width > 0 ? rect.width : FALLBACK_WIDGET_SIZE.width;
  const height = rect && rect.height > 0 ? rect.height : FALLBACK_WIDGET_SIZE.height;
  return { width, height };
}

function eventClientPoint(event: ReactPointerEvent<HTMLDivElement>) {
  const x = Number(event.clientX);
  const y = Number(event.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function defaultPosition(size: { width: number; height: number }) {
  if (typeof window === "undefined") return { left: DEFAULT_MARGIN, top: DEFAULT_MARGIN };
  return {
    left: window.innerWidth - size.width - DEFAULT_MARGIN,
    top: window.innerHeight - size.height - DEFAULT_MARGIN,
  };
}

function clampPosition(position: PetPosition, size: { width: number; height: number }) {
  if (typeof window === "undefined") return position;
  const maxLeft = Math.max(EDGE_PADDING, window.innerWidth - size.width - EDGE_PADDING);
  const maxTop = Math.max(EDGE_PADDING, window.innerHeight - size.height - EDGE_PADDING);
  return {
    left: clamp(position.left, EDGE_PADDING, maxLeft),
    top: clamp(position.top, EDGE_PADDING, maxTop),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredPosition(): PetPosition | null {
  try {
    const raw = window.localStorage.getItem(PET_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PetPosition>;
    if (typeof value.left !== "number" || typeof value.top !== "number") return null;
    if (!Number.isFinite(value.left) || !Number.isFinite(value.top)) return null;
    return { left: value.left, top: value.top };
  } catch {
    return null;
  }
}

function writeStoredPosition(position: PetPosition) {
  try {
    window.localStorage.setItem(PET_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}
