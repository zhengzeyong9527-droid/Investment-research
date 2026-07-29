const stockAliasEntries = [
  ["贵州茅台", "600519"],
  ["茅台", "600519"],
  ["宁德时代", "300750"],
  ["比亚迪", "002594"],
  ["平安银行", "000001"],
  ["招商银行", "600036"],
  ["中信证券", "600030"],
  ["东方财富", "300059"],
  ["五粮液", "000858"],
  ["迈瑞医疗", "300760"],
  ["恒瑞医药", "600276"],
  ["工业富联", "601138"],
  ["立讯精密", "002475"],
  ["长江电力", "600900"],
  ["紫金矿业", "601899"],
] as const;

const stockAliasMap = new Map(stockAliasEntries.map(([name, code]) => [normalizeAlias(name), code]));

export function lookupStockAlias(name: string) {
  return stockAliasMap.get(normalizeAlias(name));
}

export function findStockAliasInText(text: string) {
  const normalizedText = normalizeAlias(text);
  let bestMatch: { name: string; code: string } | null = null;
  for (const [name, code] of stockAliasEntries) {
    const normalizedName = normalizeAlias(name);
    if (!normalizedName || !normalizedText.includes(normalizedName)) continue;
    if (!bestMatch || normalizedName.length > normalizeAlias(bestMatch.name).length) {
      bestMatch = { name, code };
    }
  }
  return bestMatch;
}

function normalizeAlias(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}
