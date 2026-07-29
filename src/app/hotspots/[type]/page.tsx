import { notFound } from "next/navigation";
import { HotspotListView } from "@/components/workbench/hotspot-list-view";
import { fetchHotspotList, type HotspotType } from "@/lib/hotspots";

export default async function HotspotListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isHotspotType(type)) notFound();

  const pageSize = type === "industry" ? 40 : 1000;
  const [gains, declines] = await Promise.all([
    fetchHotspotList({ type, order: "desc", pageSize }),
    fetchHotspotList({ type, order: "asc", pageSize }),
  ]);

  return (
    <HotspotListView
      type={type}
      gains={gains.items}
      declines={declines.items}
      updatedAt={gains.updatedAt || declines.updatedAt}
    />
  );
}

function isHotspotType(type: string): type is HotspotType {
  return type === "industry" || type === "concept";
}
