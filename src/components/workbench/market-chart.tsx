"use client";

import type { EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

export function MarketChart({
  option,
  ariaLabel,
  className = "h-[320px]",
}: {
  option: EChartsOption;
  ariaLabel: string;
  className?: string;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountChart() {
      if (!chartRef.current) return;
      if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) return;
      try {
        const echarts = await import("echarts");
        if (disposed || !chartRef.current) return;
        const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
        chart.setOption(option);

        const observer = new ResizeObserver(() => chart.resize());
        observer.observe(chartRef.current);
        cleanup = () => {
          observer.disconnect();
          chart.dispose();
        };
      } catch {
        cleanup = undefined;
      }
    }

    void mountChart();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [option]);

  return <div ref={chartRef} role="img" aria-label={ariaLabel} className={`market-chart ${className}`} />;
}
