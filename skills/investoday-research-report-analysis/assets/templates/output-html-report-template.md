# HTML 报告输出模板

本模板用于目标业务 Skill 明确需要生成 HTML、H5、Demo、页面链接、研究报告页、数据看板或类幻灯片报告页时使用。默认交付仍然是对话内 Markdown；只有用户明确要求 HTML，或在 Markdown 结果后确认需要继续生成 HTML 时，才读取并应用本模板。

生成 HTML 时必须保证 HTML 与 Markdown 报告同源：Markdown 承载可读文本、预测评级明细、来源说明和结论；HTML 承载同一内容的可视化表达，不得额外新增未由研报样本支持的判断、指标或来源。

## 设计系统要求

HTML 页面必须默认采用 `investoday-design / Investoday Premium Diffused`（粉紫弥散金融报告 UI）设计系统，除非用户明确指定其他设计系统。

必须遵守：

- 页面整体使用接近白底的 160deg 粉紫弥散渐变背景，并叠加低透明度、强模糊的粉紫光斑。
- 卡片、表格容器、页脚使用玻璃拟态：半透明背景、`backdrop-filter: blur(12px)`、细边框和紫色调阴影。
- 主强调色使用 `#7C3AED`；深色模式强调色切换为 `#C4B5FD`。
- 装饰、评级、图表序列使用 5 色图表色板：`#FF5F9D`、`#FF958A`、`#7C3AED`、`#8669FF`、`#B3A1CB`。
- A 股真实涨跌、收益率、净流入/流出等方向性数字使用上涨红、下跌绿，不得用装饰色覆盖市场语义。
- 顶部导航必须使用中文品牌名，例如“今日投资｜研究报告”，并提供深色模式切换按钮。
- 报告首屏使用紧凑报告标题卡，不做营销式大 Hero；首屏应尽量露出核心指标卡。
- 标题下方的股票代码、报告日期、样本范围、数据来源等元信息使用普通文字行，不做紫色 badge。
- 需要突出数据来源、免责声明、样本局限或关键观察时，使用浅黄色提示卡 `.hero-highlight`。
- 表格必须放入 `.table-wrap`，仅表格容器允许横向滚动；页面本身不得横向溢出。
- 内容卡片内部不使用紫色小字 eyebrow；模块定位由外部中文模块标题 `.module-title` 承担。
- 移动端单列或合理双列展示，文本不得裁切、重叠或遮挡。

## 使用条件

- 用户明确要求 `.html`、HTML、H5、Demo、页面、看板、研究报告页或类幻灯片报告页。
- 用户已经拿到默认 Markdown 结果，并确认需要继续生成 HTML。
- 业务交付物面向客户、投顾、研究员或内部评审展示，且未指定其他设计系统。

## 输出边界

- 默认生成单文件 HTML。若已有前端项目，优先沿用项目技术栈、组件库、图标库和图表库。
- 默认中文界面文案。
- 不编造研报、机构观点、预测样本、片段证据、接口字段或内部口径。缺少可展示内容时使用“—”作为结构化占位，正文仅说明当前结论基于已取得研报样本。
- 不输出买卖指令、收益承诺、自动交易、个股推荐结论或规避合规边界的表述。
- 不在 HTML 正文写入本机绝对路径、API Key、token、内部接口报错、生成过程、模型提示词或调试信息。
- 不把 PDF 提取痕迹、原文页码、`SOURCE TEXT`、文件统计、抽取日志或“由 AI 生成 HTML”等过程信息展示给终端用户。

## 信息结构

| 报告类型 | 页面模式 | 推荐章节 |
|---|---|---|
| 个股研报解读 | `stock-report-analysis` | 结论卡片、样本口径摘要、近期研报舆情、研报观点/分歧/风险、预测评级与盈利预测、综合结论、数据来源与代表性研报 |
| 行业研报解读 | `industry-report-analysis` | 结论卡片、样本口径摘要、近期研报舆情、研报观点/分歧/风险、关键指标与证据、综合结论、数据来源与代表性研报 |
| 指定研报解读 | `selected-report-analysis` | 研报信息、核心摘要、观点/风险、结构化信息、证据链、逻辑评估、数据来源与代表性研报 |
| 多篇研报对比 | `research-report-compare` | 样本口径摘要、近期研报舆情、共识/分歧/风险、机构级预测明细、证据强弱、综合结论、数据来源与代表性研报 |
| 证据抽取 | `report-evidence-extraction` | 查询口径、证据片段表、证据强弱、缺口说明、来源表 |
| 预测评级解读 | `forecast-rating-analysis` | 样本口径摘要、预测数据总结、唯一预测明细表、预测修正与可比性说明、数据来源与代表性研报 |

通用内容顺序：

1. Sticky Nav：品牌、章节 tab、日期、主题切换。
2. Hero：紧凑报告标题卡，不是营销大 Hero。
3. Metrics：样本数量、覆盖机构、最近研报日期、预测样本数量或证据强度。
4. Sentiment：近期研报舆情概览。
5. Analysis：研报观点、分歧与风险，合并展示核心共识、主要分歧、关注重点和主要风险。
6. Forecast：预测数据总结和唯一预测明细表。
7. Conclusion：综合结论。
8. Appendix：数据来源、代表性研报、口径和免责声明。

## 单文件 HTML 骨架

生成新 HTML 时，至少包含以下结构。可以按业务删减模块，但不要删除响应式、表格滚动、深色模式、风险提示和来源附录。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>今日投资｜研报解读</title>
  <style>
    :root {
      --bg: #FFFAFD;
      --bg-alt: #FFF5FA;
      --bg-gradient-1: #FFFCFE;
      --bg-gradient-2: #FFF5FB;
      --bg-gradient-3: #F9F4FF;
      --orb-1: rgba(255, 95, 157, 0.12);
      --orb-2: rgba(124, 58, 237, 0.10);
      --orb-3: rgba(255, 149, 138, 0.10);
      --orb-4: rgba(134, 105, 255, 0.09);
      --card: rgba(255, 255, 255, 0.82);
      --card-hover: rgba(255, 255, 255, 0.92);
      --card-border: rgba(255, 255, 255, 0.60);
      --text: #1E1535;
      --text-secondary: #5B4C6E;
      --text-muted: #9B8DAF;
      --border: rgba(210, 185, 230, 0.35);
      --border-light: rgba(225, 205, 240, 0.25);
      --accent: #7C3AED;
      --accent-mid: #A78BFA;
      --accent-light: #F3EEFF;
      --accent-hover: #6D28D9;
      --gold: #C0567B;
      --gold-light: #FFF0F5;
      --red: #F01414;
      --red-light: #FFF1F1;
      --green: #139557;
      --green-light: #EFFDF5;
      --amber: #D97706;
      --amber-light: #FFFBEB;
      --chart-p0: #FF5F9D;
      --chart-p1: #FF958A;
      --chart-p2: #7C3AED;
      --chart-p3: #8669FF;
      --chart-p4: #B3A1CB;
      --table-header-bg: #FFEFF5;
      --radius: 16px;
      --radius-sm: 8px;
      --shadow-sm: 0 1px 3px rgba(100, 60, 140, 0.04);
      --shadow: 0 1px 3px rgba(100, 60, 140, 0.05), 0 4px 16px rgba(124, 58, 237, 0.06);
      --shadow-hover: 0 4px 12px rgba(100, 60, 140, 0.08), 0 8px 24px rgba(124, 58, 237, 0.10);
      --font: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      --font-num: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      --nav-h: 60px;
      --content-max-w: min(1180px, calc(100% - 32px));
      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    }

    html.dark {
      --bg: #1A1025;
      --bg-alt: #231535;
      --bg-gradient-1: #1A1025;
      --bg-gradient-2: #1E1230;
      --bg-gradient-3: #200E28;
      --orb-1: rgba(120, 60, 180, 0.20);
      --orb-2: rgba(100, 50, 160, 0.18);
      --orb-3: rgba(140, 60, 120, 0.15);
      --orb-4: rgba(90, 60, 180, 0.12);
      --card: rgba(30, 18, 50, 0.85);
      --card-hover: rgba(40, 25, 60, 0.90);
      --card-border: rgba(80, 60, 120, 0.35);
      --text: #EDE4FA;
      --text-secondary: #A899C0;
      --text-muted: #7B6B95;
      --border: rgba(80, 60, 120, 0.40);
      --border-light: rgba(60, 45, 90, 0.30);
      --accent: #C4B5FD;
      --accent-light: #2D1F45;
      --accent-hover: #DDD6FE;
      --gold: #F0A0C0;
      --gold-light: #3D1A28;
      --red: #FCA5A5;
      --green: #86EFAC;
      --amber: #FCD34D;
      --amber-light: #3D2E0A;
      --table-header-bg: #2D1520;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      --shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      overflow-x: hidden;
      color: var(--text);
      font-family: var(--font);
      line-height: 1.7;
      background: linear-gradient(160deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 40%, var(--bg-gradient-3) 100%);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body::before,
    body::after {
      content: "";
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      filter: blur(80px);
    }
    body::before {
      width: 600px;
      height: 600px;
      top: -120px;
      right: -100px;
      background: var(--orb-1);
      animation: orbFloat1 20s ease-in-out infinite;
    }
    body::after {
      width: 500px;
      height: 500px;
      bottom: -80px;
      left: -80px;
      background: var(--orb-2);
      animation: orbFloat2 25s ease-in-out infinite;
    }
    .diffused-orb {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      filter: blur(90px);
    }
    .orb-3 {
      width: 450px;
      height: 450px;
      top: 40%;
      left: 30%;
      background: var(--orb-3);
      animation: orbFloat3 22s ease-in-out infinite;
    }
    .orb-4 {
      width: 380px;
      height: 380px;
      top: 70%;
      right: 20%;
      background: var(--orb-4);
      animation: orbFloat4 18s ease-in-out infinite;
    }
    @keyframes orbFloat1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-60px, 40px) scale(1.08); }
      66% { transform: translate(30px, -30px) scale(0.95); }
    }
    @keyframes orbFloat2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(50px, -40px) scale(1.06); }
      66% { transform: translate(-30px, 30px) scale(0.97); }
    }
    @keyframes orbFloat3 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(40px, -50px) scale(1.05); }
    }
    @keyframes orbFloat4 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-50px, 40px) scale(1.04); }
    }

    nav,
    main { position: relative; z-index: 1; }
    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: var(--nav-h);
      border-bottom: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
    }
    html.dark nav { background: rgba(30, 18, 50, 0.72); }
    .nav-inner {
      width: var(--content-max-w);
      min-height: var(--nav-h);
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 12px;
      color: var(--accent);
      font-size: 17px;
      font-weight: 800;
      white-space: nowrap;
    }
    .logo::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-light);
    }
    .tabs {
      display: flex;
      flex: 1;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab {
      position: relative;
      padding: 7px 16px;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      text-decoration: none;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s var(--ease-out);
    }
    .tab:hover,
    .tab.active {
      color: var(--accent);
      background: var(--accent-light);
      border-color: var(--chart-p3);
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .date-badge {
      padding: 5px 14px;
      border: 1px solid rgba(167, 139, 250, 0.15);
      border-radius: 24px;
      background: rgba(167, 139, 250, 0.08);
      color: var(--text-secondary);
      font-size: 12px;
      white-space: nowrap;
    }
    .theme-toggle {
      width: 38px;
      height: 38px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s var(--ease-out);
    }
    .theme-toggle:hover {
      border-color: var(--accent-mid);
      box-shadow: var(--shadow);
      transform: scale(1.04);
    }

    main {
      width: var(--content-max-w);
      margin: 0 auto;
      padding: 24px 0 48px;
    }
    .hero,
    .metric-card,
    .theme-card,
    .table-wrap,
    .footer {
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .hero {
      position: relative;
      overflow: hidden;
      padding: 36px 40px;
    }
    .hero::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, var(--chart-p1) 0%, var(--chart-p2) 100%);
    }
    .hero-corner {
      position: absolute;
      top: 0;
      right: 0;
      width: 148px;
      height: 148px;
      border-radius: 0 28px 0 148px;
      background: linear-gradient(135deg, rgba(255, 95, 157, 0.10), rgba(124, 58, 237, 0.06));
      pointer-events: none;
    }
    h1 {
      margin: 0;
      color: var(--text);
      font-size: 24px;
      font-weight: 850;
      line-height: 1.35;
      letter-spacing: 0;
    }
    .hero-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 28px;
      margin-top: 14px;
      color: var(--text-secondary);
      font-size: 13px;
    }
    .hero-meta-line strong {
      color: var(--text);
      font-weight: 800;
    }
    .hero-highlight {
      margin-top: 18px;
      padding: 13px 16px;
      border-left: 3px solid var(--chart-p0);
      border-radius: var(--radius-sm);
      background: #FFF7DD;
      color: #B45362;
      font-size: 13px;
      line-height: 1.7;
    }
    html.dark .hero-highlight {
      background: #3D2E0A;
      color: #F0A0C0;
    }
    .summary-text {
      margin: 16px 0 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.85;
      text-align: justify;
      text-justify: inter-character;
    }
    .module-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 28px 0 14px;
      color: var(--text);
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0;
    }
    .module-title::before {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--chart-p0);
      box-shadow: 0 0 0 7px rgba(255, 95, 157, 0.10);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .metric-card {
      position: relative;
      overflow: hidden;
      min-height: 104px;
      padding: 20px 24px;
      transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
    }
    .metric-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-hover);
    }
    .metric-card::after {
      content: "";
      position: absolute;
      inset: 0;
      padding: 2px;
      border-radius: var(--radius);
      background: linear-gradient(90deg, #7873F5, #EC77AB);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s var(--ease-out);
    }
    .metric-card:hover::after { opacity: 1; }
    .metric-label {
      margin-bottom: 6px;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
    }
    .metric-value {
      color: var(--text);
      font-family: var(--font-num);
      font-size: 28px;
      font-weight: 850;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }
    .metric-sub {
      margin-top: 4px;
      color: var(--text-secondary);
      font-size: 12px;
    }
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .theme-card {
      position: relative;
      overflow: hidden;
      padding: 24px;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.75;
      transition: box-shadow 0.25s var(--ease-out);
    }
    .theme-card:hover { box-shadow: var(--shadow-hover); }
    .theme-card::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 80px;
      height: 80px;
      border-radius: 0 0 0 80px;
      background: var(--chart-p0);
      opacity: 0.04;
    }
    .theme-card.grade-a { border-top: 3px solid var(--chart-p0); }
    .theme-card.grade-b { border-top: 3px solid var(--chart-p1); }
    .theme-card.grade-c { border-top: 3px solid var(--chart-p2); }
    .theme-card.grade-d { border-top: 3px solid var(--chart-p3); }
    .theme-card h3 {
      margin: 0 0 10px;
      color: var(--text);
      font-size: 17px;
      font-weight: 850;
      line-height: 1.4;
    }
    .source-note,
    .body-copy {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.85;
      text-align: justify;
      text-justify: inter-character;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 16px;
    }
    .data-table {
      width: 100%;
      min-width: 1180px;
      border-collapse: collapse;
      background: #FFFFFF;
      font-size: 16px;
      font-variant-numeric: tabular-nums;
    }
    html.dark .data-table { background: rgba(30, 18, 50, 0.85); }
    .data-table th,
    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-light);
      text-align: left;
      vertical-align: top;
      line-height: 1.55;
    }
    .data-table thead th {
      border-bottom: 2px solid var(--border);
      background: var(--table-header-bg);
      color: var(--text);
      font-size: 16px;
      font-weight: 800;
      white-space: nowrap;
    }
    .data-table tbody td {
      color: var(--text-secondary);
      background: #FFFFFF;
      transition: background 0.12s var(--ease-out);
    }
    html.dark .data-table tbody td { background: rgba(30, 18, 50, 0.85); }
    .data-table tbody tr:hover td { background: var(--accent-light); }
    .data-table th:first-child,
    .data-table td:first-child {
      min-width: 120px;
      color: var(--text);
      font-weight: 700;
    }
    .data-table .num {
      text-align: right;
      font-family: var(--font-num);
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }
    .data-table .center { text-align: center; }
    .up,
    .up-text { color: var(--red); font-weight: 800; }
    .down,
    .down-text { color: var(--green); font-weight: 800; }
    .footer {
      margin-top: 32px;
      padding: 28px 32px;
    }
    .footer h3 {
      margin: 0 0 10px;
      color: var(--text);
      font-size: 15px;
      font-weight: 850;
    }
    .footer .risk {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.9;
      text-align: justify;
      text-justify: inter-character;
    }
    .reveal-section {
      opacity: 0;
      transform: translateY(36px);
      transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
    }
    .reveal-section.revealed {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 1024px) {
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .theme-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      :root { --content-max-w: min(100% - 24px, 1180px); }
      .nav-inner {
        flex-wrap: wrap;
        gap: 8px 12px;
        padding: 8px 0;
      }
      .tabs {
        order: 3;
        flex-basis: 100%;
      }
      .tab {
        padding: 5px 12px;
        font-size: 12px;
      }
      main { padding-top: 16px; }
      .hero { padding: 24px 20px; }
      h1 { font-size: 20px; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .module-title { font-size: 22px; }
    }
    @media (max-width: 520px) {
      .metrics { grid-template-columns: 1fr; }
      .date-badge { display: none; }
    }
    @media print {
      body {
        background: #FFFFFF;
        color: #111111;
      }
      body::before,
      body::after,
      .diffused-orb,
      nav,
      .theme-toggle { display: none !important; }
      main {
        width: 100%;
        padding: 0;
      }
      .hero,
      .metric-card,
      .theme-card,
      .table-wrap,
      .footer {
        box-shadow: none;
        border-color: #DDDDDD;
        background: #FFFFFF;
        break-inside: avoid;
      }
      .reveal-section {
        opacity: 1;
        transform: none;
      }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <div class="logo">今日投资<span>｜研究报告</span></div>
      <div class="tabs" aria-label="报告章节导航">
        <a class="tab active" href="#summary">概览</a>
        <a class="tab" href="#sentiment">研报舆情</a>
        <a class="tab" href="#views">观点风险</a>
        <a class="tab" href="#forecast">预测明细</a>
        <a class="tab" href="#sources">来源</a>
      </div>
      <div class="nav-right">
        <div class="date-badge">YYYY-MM-DD</div>
        <button class="theme-toggle" type="button" aria-label="切换深色模式">◐</button>
      </div>
    </div>
  </nav>

  <div class="diffused-orb orb-3"></div>
  <div class="diffused-orb orb-4"></div>

  <main>
    <section class="hero reveal-section" id="summary">
      <div class="hero-corner" aria-hidden="true"></div>
      <h1>[报告标题]</h1>
      <div class="hero-meta-line">
        <span>股票代码：<strong>[证券代码]</strong></span>
        <span>报告日期：<strong>YYYY-MM-DD</strong></span>
        <span>样本范围：<strong>[起始日期] 至 [截止日期]</strong></span>
        <span>数据来源：<strong>今日投资研报库</strong></span>
      </div>
      <div class="hero-highlight">
        填入 Markdown 中已有的数据来源、样本局限和免责声明口径；不得新增 Markdown 中不存在的结论。
      </div>
      <p class="summary-text">填入与 Markdown 同源的一句话结论和样本口径摘要。</p>
    </section>

    <section class="metrics reveal-section" aria-label="样本指标">
      <article class="metric-card">
        <div class="metric-label">研报数量</div>
        <div class="metric-value">—</div>
        <div class="metric-sub">样本期内可用研报</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">覆盖机构</div>
        <div class="metric-value">—</div>
        <div class="metric-sub">按发布机构去重</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">最近研报</div>
        <div class="metric-value">—</div>
        <div class="metric-sub">样本内最近发布日期</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">预测样本</div>
        <div class="metric-value">—</div>
        <div class="metric-sub">评级/目标价/盈利预测</div>
      </article>
    </section>

    <h2 class="module-title" id="sentiment">近期研报舆情</h2>
    <section class="theme-card grade-a reveal-section">
      <div class="body-copy">填入 Markdown 中已有的核心内容、机会、风险、情绪倾向和关键事由；未取得舆情时写“当前样本未取得可用研报舆情”。</div>
    </section>

    <h2 class="module-title" id="views">研报观点、分歧与风险</h2>
    <section class="theme-grid reveal-section">
      <article class="theme-card grade-a">
        <h3>核心共识</h3>
        <div class="body-copy">填入 Markdown 中已有的机构共识，每条尽量标注来源机构。</div>
      </article>
      <article class="theme-card grade-b">
        <h3>主要分歧</h3>
        <div class="body-copy">填入分歧双方/各方分别是什么观点；没有实质分歧时写“当前样本未发现明显观点对立”。</div>
      </article>
      <article class="theme-card grade-c">
        <h3>关注重点</h3>
        <div class="body-copy">填入投资机会、催化、跟踪指标或后续观察变量。</div>
      </article>
      <article class="theme-card grade-d">
        <h3>主要风险</h3>
        <div class="body-copy">填入机构明确提示的风险，不扩展为无证据风险清单。</div>
      </article>
    </section>

    <h2 class="module-title" id="forecast">预测评级与盈利预测</h2>
    <section class="theme-card grade-a reveal-section">
      <div class="body-copy">填入预测数据总结：样本时间范围、机构数、样本数、目标价有效数值样本、最小/最大/平均值或中位数、评级分布、预测修正方向和样本可比性说明。</div>
    </section>
    <section class="table-wrap reveal-section" aria-label="预测评级与盈利预测明细">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>机构</th>
            <th>研报</th>
            <th class="center">评级</th>
            <th class="num">目标价</th>
            <th class="num">T+1 EPS</th>
            <th class="num">T+2 EPS</th>
            <th class="num">T+3 EPS</th>
            <th class="num">T+1 净利润预测</th>
            <th>预测/评级变化</th>
            <th>支持的判断</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>YYYY-MM-DD</td>
            <td>发布机构</td>
            <td>研报标题</td>
            <td class="center">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td>—</td>
            <td>来自 Markdown 同源内容</td>
          </tr>
        </tbody>
      </table>
    </section>

    <h2 class="module-title" id="conclusion">综合结论</h2>
    <section class="theme-card grade-b reveal-section">
      <div class="body-copy">填入 Markdown 中已有的综合结论，不新增 HTML 独有观点。</div>
    </section>

    <h2 class="module-title" id="sources">数据来源与代表性研报</h2>
    <section class="table-wrap reveal-section" aria-label="数据来源与代表性研报">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>发布机构</th>
            <th>研报标题</th>
            <th class="center">评级</th>
            <th class="num">目标价</th>
            <th>用途</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>YYYY-MM-DD</td>
            <td>发布机构</td>
            <td>研报标题</td>
            <td class="center">—</td>
            <td class="num">—</td>
            <td>来源附录</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer class="footer reveal-section">
      <h3>免责声明</h3>
      <div class="risk">
        本页面仅供研究参考，不构成投资建议。研报观点、评级、目标价、EPS 和净利润预测均来自机构样本，不代表确定性判断，也不构成交易指令或收益承诺。
      </div>
    </footer>
  </main>

  <script>
    const themeToggle = document.querySelector(".theme-toggle");
    themeToggle?.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      themeToggle.textContent = document.documentElement.classList.contains("dark") ? "☼" : "◐";
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("revealed");
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal-section").forEach((el) => revealObserver.observe(el));

    const sections = [...document.querySelectorAll("main [id]")];
    const tabs = [...document.querySelectorAll(".tab")];
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tabs.forEach((tab) => tab.classList.toggle("active", tab.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { threshold: 0.35 });
    sections.forEach((section) => navObserver.observe(section));
  </script>
</body>
</html>
```

## 组件规则

- 首屏使用紧凑报告标题卡，包含报告标题、日期、查询对象、样本口径、来源、核心摘要和浅黄色提示卡。
- 指标卡只展示研报数量、覆盖机构、最近研报日期、预测样本数量、证据强度等研报内指标。
- 指标卡 hover 可以使用 `::after` 渐变描边；普通内容卡 hover 只增强阴影，不使用渐变描边或强动效。
- 表格必须放入 `.table-wrap`，只允许表格容器横向滚动。
- 近期代表性研报清单只放在来源/附录区域，不放在首屏或主体前部。
- 评级、目标价、EPS、净利润预测和预测变动必须说明样本范围。
- 个股和预测评级页面默认展示最近 5 家机构预测明细，且只保留一个预测明细表。
- 目标价平均值只基于可解析数值样本计算；空值、区间无法解析和非数字文本不纳入统计，并在页面中说明有效样本数。
- A 股真实上涨、下跌等市场语义只有在 Markdown 中已有且来自研报样本时才能展示；上涨红、下跌绿。
- 表格中带 `+` 或 `-` 且表示涨跌、收益率、修正方向、净流入/流出等方向性数字时，必须使用 `.up`、`.up-text`、`.down` 或 `.down-text`。
- 移动端内容单列或合理双列，文本不裁切、不重叠。

## 研报解读推荐结构

- Hero：报告标题、报告日期、查询对象、样本口径、核心结论。
- 样本指标：研报数量、覆盖机构、最近研报日期、预测样本数量。
- 近期研报舆情：核心内容、机会、风险、情绪倾向和关键事由。
- 研报观点、分歧与风险：核心共识、主要分歧、关注重点/跟踪指标、主要风险。
- 预测评级与盈利预测：预测数据总结和唯一明细表，列出最近 5 家机构的日期、机构、研报、评级、目标价、EPS、净利润预测、预测/评级变化和支持的判断。
- 证据抽取结果：仅在用户明确要求找证据或证据抽取任务中展示证据片段、来源和证据强度。
- 数据来源与代表性研报：在页面末尾附录展示研报标题、发布机构、发布日期、评级、目标价和用途。
- 免责声明。

## 验收清单

- [ ] HTML 仅在用户明确要求或确认后生成，默认结果仍为 Markdown。
- [ ] 文件为单文件 HTML，或符合现有前端项目结构；不包含本机绝对路径、token 或生成过程。
- [ ] 页面显式采用 `Investoday Premium Diffused`：粉紫弥散背景、玻璃卡片、紫色强调、5 色图表色板、深紫深色模式。
- [ ] 顶部导航为中文品牌名，并包含可用的深色模式切换按钮。
- [ ] 首屏是紧凑报告标题卡，不是营销落地页。
- [ ] Hero 元信息使用普通文字行，样本局限/数据来源/免责声明使用浅黄色提示卡。
- [ ] Markdown 与 HTML 内容同源，HTML 没有新增无证据结论。
- [ ] 近期代表性研报只在来源/附录区展示，不占据页面前部。
- [ ] 近期研报舆情位于观点风险之前。
- [ ] 观点、分歧、关注重点和风险合并为同一个主体模块。
- [ ] 预测评级与盈利预测只有一个明细表，且表前包含样本统计和趋势口径说明。
- [ ] 所有关键结论都能追溯到研报标题、发布机构和发布日期。
- [ ] 表格空项使用“—”或样本口径说明，没有编造接口、字段、研报或数值。
- [ ] 表格横向滚动只发生在 `.table-wrap` 内，页面本身无横向溢出。
- [ ] 移动端单列或合理双列可读，文本不裁切、不重叠。
- [ ] 免责声明、风险提示和“不构成投资建议”在客户可见输出中存在。
