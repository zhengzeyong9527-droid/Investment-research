import { notFound } from "next/navigation";
import { HotspotDetailView } from "@/components/workbench/hotspot-detail-view";
import { fetchHotspotDetail, type HotspotType } from "@/lib/hotspots";

export default async function HotspotPage({ params }: { params: Promise<{ type: string; code: string }> }) {
  const { type, code } = await params;
  if (!isHotspotType(type) || !code) {
    notFound();
  }

  try {
    const detail = await fetchHotspotDetail({ type, code: decodeURIComponent(code) });
    return <HotspotDetailView detail={detail} />;
  } catch {
    notFound();
  }
}

function isHotspotType(value: string): value is HotspotType {
  return value === "industry" || value === "concept";
}
