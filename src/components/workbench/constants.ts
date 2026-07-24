import { Bot, ChartCandlestick, Layers3, Newspaper, Settings } from "lucide-react";
import type { ComponentType } from "react";
import type { AgentRun, BriefItem, View } from "@/components/workbench/types";

export const navItems: Array<{ view: View; label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { view: "brief", label: "自选速览", icon: Newspaper },
  { view: "market", label: "当日大盘", icon: ChartCandlestick },
  { view: "agent", label: "研究", icon: Bot },
  { view: "watchlist", label: "自选", icon: Layers3 },
  { view: "settings", label: "设置", icon: Settings },
];

export const kindLabel: Record<BriefItem["kind"], string> = {
  news: "新闻",
  research: "研报",
  announcement: "公告",
  event: "事件",
};

export const statusLabel: Record<AgentRun["status"], string> = {
  created: "已创建",
  planning: "规划中",
  fetching_data: "取证中",
  running_skill: "执行中",
  completed: "已完成",
  failed: "失败",
};
