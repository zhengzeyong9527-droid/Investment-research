import { loadDotEnv } from "@/lib/load-env";
import { getDefaultRagService } from "@/rag/local-rag";

loadDotEnv();

const documents = [
  {
    title: "贵州茅台渠道风险跟踪样例",
    source: "demo-seed",
    content:
      "贵州茅台近30天跟踪重点包括渠道批价波动、社会库存压力、直营渠道结构变化和高端白酒需求恢复节奏。若批价连续回落且库存周转放慢，应降低对短期利润弹性的确定性表述。",
    metadata: { stockCode: "600519", stockName: "贵州茅台", topic: "risk" },
  },
  {
    title: "有色金属行业催化与风险样例",
    source: "demo-seed",
    content:
      "有色金属行业的短期变量包括美元指数、实际利率、国内基建需求、库存周期以及新能源金属价格。锂价上行通常需要库存去化、下游排产改善和供给扰动共同验证。",
    metadata: { industryName: "有色金属", topic: "industry" },
  },
  {
    title: "盘面播报证据口径样例",
    source: "demo-seed",
    content:
      "盘面解读应同时观察指数涨跌、上涨家数占比、成交额变化、主力净流、行业轮动和新闻催化。若指数上涨但上涨占比偏低，应提示结构性分化而非全面转强。",
    metadata: { topic: "market" },
  },
];

for (const item of documents) {
  const document = await getDefaultRagService().ingestDocument(item);
  console.log(`Seeded ${document.title}: ${document.chunkCount} chunk(s)`);
}
