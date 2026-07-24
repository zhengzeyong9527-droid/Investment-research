# HTML 报告输出模板

本模板用于目标业务 Skill 明确需要生成 HTML、H5、Demo、页面链路、研究报告页、数据看板或类幻灯片报告页时使用。默认交付仍然是对话内 Markdown；只有用户明确要求 HTML，或在 Markdown 结果后确认需要继续生成 HTML 时，才读取并应用本模板。

本模板抽取自 `gs-premium-diffused` 金融报告 UI 规范，覆盖 gs Premium Diffused 的页面骨架、视觉 token、组件、图表、表格、深色模式和验收规则。生成 HTML 时必须保证 HTML 与 Markdown 报告同源：Markdown 承载可读文本、证据链和结论，HTML 承载同一内容的可视化表达，不得额外新增未经证据支持的判断。

## 使用条件

- 用户明确要求 `.html`、HTML、H5、Demo、页面、看板、研究报告页或类幻灯片报告页。
- 用户已经拿到默认 Markdown 结果，并确认需要继续生成 HTML。
- 业务交付物包含面向客户、投顾、研究员或内部评审的可视化展示页，并且未指定其他设计系统。
- 若运行时可用且用户明确要求国信证券金融报告 UI、粉紫弥散、Premium Diffused 或数据看板视觉规范，优先用 `$gs-premium-diffused` 核对；不可用时按本模板执行。

## 输出边界

- 默认生成单文件 HTML。若已有前端项目，优先沿用项目技术栈、组件库、图标库和图表库。
- 默认中文界面文案。
- 不编造实时行情、财务、公告、研报、客户数据、接口字段或内部口径。缺数据时使用结构化占位，并标注“示例 / 待接入 / 数据不足”。
- 不输出买卖指令、收益承诺、自动交易、个股推荐结论或规避合规边界的表述。
- 不在 HTML 正文写入本机绝对路径、API Key、token、内部接口报错、生成过程、模型提示词或调试信息。
- 不把 PDF 提取痕迹、原文页码、`SOURCE TEXT`、文件统计、抽取日志或“由 AI 生成 HTML”等过程信息展示给终端用户。

## 信息架构

根据报告类型选择页面结构。若用户没有指定类型，优先映射到最接近的结构，不要做空泛落地页。

| 报告类型 | 页面模式 | 推荐章节 |
|---|---|---|
| 每日题材追踪 | `daily-tracker` | 概览、市场状态、题材路径、个股矩阵、题材分级、观察清单、附录 |
| 财报分析 | `earnings-analysis` | 投资摘要、核心指标、财务数据、增长分析、风险因素、结论 |
| 行业研报 | `industry-research` | 行业概览、产业链分析、竞争格局、政策催化、核心标的、结论 |
| 公司深度 | `company-profile` | 公司概况、业务拆解、财务预测、估值分析、风险因素、结论 |
| 板块轮动 | `sector-rotation` | 板块概览、轮动信号、领涨板块、资金流向、观察清单、展望 |
| 资金流向 | `fund-flow` | 资金概览、主力动向、个股资金、北向资金、两融观察、风险提示 |

通用内容顺序：

1. Sticky Nav：品牌、章节 tab、日期、主题切换。
2. Hero：紧凑报告标题卡，而不是营销大 Hero。
3. Metrics：首屏露出核心指标。
4. Analysis：主题卡、观点卡、分级卡或信号卡。
5. Charts：趋势、结构、排名、资金或评分可视化。
6. Tables：明细数据和证据表。
7. Observations：观察清单、风险、待确认项。
8. Appendix：数据源、口径、免责声明。

## 单文件 HTML 骨架

生成新 HTML 时，至少包含以下结构。可以按业务删减模块，但不要删除 token、响应式、表格滚动、深色模式和风险提示。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>国信证券｜研究报告</title>
  <!-- 需要图表时引入；已有项目可替换为本地依赖或 ECharts -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #FFFAFD;
      --bg-gradient-1: #FFFCFE;
      --bg-gradient-2: #FFF5FB;
      --bg-gradient-3: #F9F4FF;
      --card: rgba(255, 255, 255, 0.82);
      --card-strong: rgba(255, 255, 255, 0.94);
      --card-border: rgba(255, 255, 255, 0.60);
      --text: #1E1535;
      --text-secondary: #5B4C6E;
      --text-muted: #9B8DAF;
      --border: rgba(210, 185, 230, 0.35);
      --accent: #7C3AED;
      --accent-mid: #A78BFA;
      --accent-light: #F3EEFF;
      --gold: #FFF7D8;
      --gold-border: #FFE59E;
      --red: #F01414;
      --green: #139557;
      --amber: #F59E0B;
      --chart-p0: #FF5F9D;
      --chart-p1: #FF958A;
      --chart-p2: #7C3AED;
      --chart-p3: #8669FF;
      --chart-p4: #B3A1CB;
      --bar-0: #FFDFEB;
      --bar-1: #FFCFE2;
      --bar-2: #FFBFD8;
      --bar-3: #FF9FC4;
      --bar-4: #FF75AA;
      --bar-5: #FF5F9D;
      --table-header-bg: #FFEFF5;
      --tag-bg: #FFEFF5;
      --tag-text: #5B4C6E;
      --tag-border: #F6EAEE;
      --radius: 16px;
      --radius-sm: 8px;
      --shadow: 0 1px 3px rgba(100, 60, 140, 0.05), 0 4px 16px rgba(124, 58, 237, 0.06);
      --shadow-hover: 0 4px 12px rgba(100, 60, 140, 0.08), 0 8px 24px rgba(124, 58, 237, 0.10);
      --content-max-w: min(1180px, calc(100% - 32px));
      --font: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }

    html.dark {
      --bg: #1A1025;
      --bg-gradient-1: #1A1025;
      --bg-gradient-2: #241334;
      --bg-gradient-3: #301A46;
      --card: rgba(38, 24, 54, 0.82);
      --card-strong: rgba(45, 29, 64, 0.94);
      --card-border: rgba(255, 255, 255, 0.10);
      --text: #F8F2FF;
      --text-secondary: #D8C9EA;
      --text-muted: #A997BD;
      --border: rgba(211, 189, 236, 0.18);
      --accent: #A78BFA;
      --accent-mid: #C4B5FD;
      --accent-light: rgba(167, 139, 250, 0.16);
      --gold: rgba(255, 247, 216, 0.10);
      --gold-border: rgba(255, 229, 158, 0.22);
      --table-header-bg: rgba(255, 95, 157, 0.14);
      --tag-bg: rgba(255, 239, 245, 0.10);
      --tag-text: #F0DDED;
      --tag-border: rgba(246, 234, 238, 0.12);
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.18), 0 8px 28px rgba(0, 0, 0, 0.20);
      --shadow-hover: 0 8px 28px rgba(0, 0, 0, 0.24), 0 16px 42px rgba(124, 58, 237, 0.18);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      overflow-x: hidden;
      color: var(--text);
      font-family: var(--font);
      background:
        radial-gradient(circle at 16% 14%, rgba(255, 95, 157, 0.16), transparent 28%),
        radial-gradient(circle at 84% 12%, rgba(124, 58, 237, 0.16), transparent 30%),
        linear-gradient(160deg, var(--bg-gradient-1), var(--bg-gradient-2) 44%, var(--bg-gradient-3));
    }
    body::before,
    body::after,
    .diffused-orb {
      content: "";
      position: fixed;
      z-index: -1;
      border-radius: 999px;
      filter: blur(36px);
      opacity: 0.45;
      pointer-events: none;
    }
    body::before {
      width: 360px;
      height: 360px;
      left: -120px;
      top: 120px;
      background: rgba(255, 95, 157, 0.28);
    }
    body::after {
      width: 420px;
      height: 420px;
      right: -160px;
      bottom: 80px;
      background: rgba(124, 58, 237, 0.24);
    }
    .diffused-orb {
      width: 280px;
      height: 280px;
      left: 48%;
      top: 28%;
      background: rgba(255, 149, 138, 0.18);
    }

    nav {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 64px;
      border-bottom: 1px solid var(--border);
      background: rgba(255, 250, 253, 0.76);
      backdrop-filter: blur(16px);
    }
    html.dark nav { background: rgba(26, 16, 37, 0.78); }
    .nav-inner {
      width: var(--content-max-w);
      height: 100%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: max-content;
      font-weight: 800;
      color: var(--accent);
    }
    .brand small {
      color: var(--text-secondary);
      font-weight: 500;
    }
    .tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      flex: 1;
    }
    .tabs a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 38px;
      padding: 0 14px;
      border: 1px solid transparent;
      border-radius: 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      white-space: nowrap;
    }
    .tabs a.active,
    .tabs a:hover {
      color: var(--accent);
      border-color: var(--accent-mid);
      background: var(--accent-light);
    }
    .date-pill,
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--card);
      color: var(--text-secondary);
      font-size: 14px;
      white-space: nowrap;
    }
    .date-pill { padding: 0 14px; }
    .theme-toggle {
      width: 36px;
      cursor: pointer;
    }

    main {
      width: var(--content-max-w);
      margin: 0 auto;
      padding: 28px 0 48px;
    }
    section,
    .module {
      margin-top: 24px;
    }
    .glass-card,
    .hero,
    .metric-card,
    .theme-card,
    .chart-card,
    .obs-item,
    .footer {
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }
    .glass-card:hover,
    .theme-card:hover,
    .chart-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }
    .hero {
      position: relative;
      overflow: hidden;
      padding: 34px 38px;
      border-left: 4px solid var(--chart-p0);
    }
    .hero::after {
      content: "";
      position: absolute;
      right: -64px;
      top: -64px;
      width: 180px;
      height: 180px;
      border-radius: 999px;
      background: rgba(255, 95, 157, 0.08);
    }
    .hero h1 {
      margin: 0 0 16px;
      font-size: clamp(22px, 3vw, 28px);
      line-height: 1.35;
      letter-spacing: 0;
    }
    .hero-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 28px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    .hero-meta-line strong { color: var(--text); }
    .hero-highlight {
      margin-top: 18px;
      padding: 13px 16px;
      border: 1px solid var(--gold-border);
      border-left: 3px solid #FF6B81;
      border-radius: 10px;
      background: var(--gold);
      color: #FF6B81;
      font-size: 14px;
      line-height: 1.65;
    }
    html.dark .hero-highlight { color: #FFB3C4; }
    .summary-text {
      margin: 20px 0 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.9;
    }

    .module-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 28px 0 14px;
      font-size: 20px;
      font-weight: 800;
    }
    .module-title::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--chart-p0), var(--accent));
      box-shadow: 0 0 0 6px var(--accent-light);
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .metric-card {
      position: relative;
      min-height: 118px;
      padding: 18px;
      overflow: hidden;
    }
    .metric-card::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(255, 95, 157, 0), rgba(255, 95, 157, 0.42), rgba(124, 58, 237, 0));
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      mask-composite: exclude;
    }
    .metric-card:hover::before { opacity: 1; }
    .metric-label {
      color: var(--text-muted);
      font-size: 13px;
    }
    .metric-value {
      margin-top: 10px;
      font-size: 28px;
      font-weight: 850;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .metric-note {
      margin-top: 10px;
      color: var(--text-secondary);
      font-size: 13px;
      line-height: 1.55;
    }

    .content-grid,
    .theme-grid,
    .chart-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .cols-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .theme-card {
      position: relative;
      min-height: 224px;
      padding: 24px;
      overflow: hidden;
    }
    .theme-card::after {
      content: "";
      position: absolute;
      top: -72px;
      right: -72px;
      width: 160px;
      height: 160px;
      border-radius: 999px;
      background: rgba(255, 95, 157, 0.07);
    }
    .theme-card.grade-s { border-top: 3px solid var(--chart-p0); }
    .theme-card.grade-a { border-top: 3px solid var(--chart-p1); }
    .theme-card.grade-b { border-top: 3px solid var(--chart-p2); }
    .grade-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      background: var(--chart-p0);
      color: #fff;
      font-weight: 800;
      font-size: 14px;
    }
    .grade-a .grade-badge { background: var(--chart-p1); }
    .grade-b .grade-badge { background: var(--chart-p2); }
    .theme-card h3,
    .chart-card h3,
    .glass-card h3 {
      margin: 14px 0 10px;
      font-size: 18px;
      line-height: 1.45;
      letter-spacing: 0;
    }
    .card-text,
    .chart-note,
    .obs-item,
    .footer {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.75;
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 12px;
      border: 1px solid var(--tag-border);
      border-radius: 999px;
      background: var(--tag-bg);
      color: var(--tag-text);
      font-size: 13px;
      white-space: nowrap;
    }

    .chart-card {
      min-height: 360px;
      padding: 24px;
    }
    .chart-note {
      margin: 0 0 16px;
      font-size: 14px;
    }
    .chart-box {
      position: relative;
      height: 260px;
      width: 100%;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }
    table {
      width: 100%;
      min-width: 760px;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 16px;
    }
    th,
    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      line-height: 1.6;
    }
    th {
      background: var(--table-header-bg);
      color: var(--text);
      font-weight: 800;
    }
    td:first-child,
    th:first-child { font-weight: 700; }
    td.num,
    th.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    tr:last-child td { border-bottom: 0; }
    .up { color: var(--red); font-weight: 800; }
    .down { color: var(--green); font-weight: 800; }
    .flat { color: var(--text-muted); font-weight: 700; }

    .obs-list {
      display: grid;
      gap: 12px;
    }
    .obs-item {
      padding: 18px 20px;
      border-left: 3px solid var(--accent-mid);
      background: var(--card);
    }
    .footer {
      margin-top: 28px;
      padding: 22px 24px;
      background: var(--card-strong);
    }
    .footer h3 {
      margin: 0 0 10px;
      color: var(--text);
      font-size: 18px;
    }

    .reveal-section {
      opacity: 0;
      transform: translateY(14px);
      transition: opacity 0.45s ease, transform 0.45s ease;
    }
    .reveal-section.visible {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 960px) {
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .content-grid,
      .theme-grid,
      .chart-row,
      .cols-3 { grid-template-columns: 1fr; }
      .nav-inner { gap: 10px; }
      .brand small { display: none; }
    }
    @media (max-width: 640px) {
      :root { --content-max-w: min(100% - 24px, 1180px); }
      nav { height: auto; }
      .nav-inner {
        min-height: 60px;
        padding: 8px 0;
        flex-wrap: wrap;
      }
      .tabs { order: 3; flex-basis: 100%; }
      .date-pill { margin-left: auto; }
      main { padding-top: 18px; }
      .hero { padding: 24px 20px; }
      .hero-meta-line { gap: 8px 16px; }
      .metrics { grid-template-columns: 1fr; }
      .metric-value { font-size: 24px; }
      .chart-card { min-height: 320px; padding: 20px; }
      .chart-box { height: 230px; }
      th,
      td { padding: 12px 14px; }
    }
  </style>
</head>
<body>
  <div class="diffused-orb"></div>
  <nav>
    <div class="nav-inner">
      <div class="brand">● 国信证券 <small>｜研究报告</small></div>
      <div class="tabs" aria-label="报告章节">
        <a class="active" href="#overview">📊 概览</a>
        <a href="#market">📈 市场状态</a>
        <a href="#themes">🔥 题材路径</a>
        <a href="#charts">🧭 图表</a>
        <a href="#appendix">📎 附录</a>
      </div>
      <div class="date-pill">2026-06-05</div>
      <button class="theme-toggle" type="button" aria-label="切换深色模式">◐</button>
    </div>
  </nav>

  <main>
    <section class="hero reveal-section" id="overview">
      <h1>每日新闻题材短线追踪报告</h1>
      <div class="hero-meta-line">
        <span>报告日期：<strong>2026-06-05</strong></span>
        <span>观察窗口：<strong>未来 1 至 3 个交易日</strong></span>
        <span>数据截止：<strong>2026-06-05 15:00</strong></span>
      </div>
      <div class="hero-highlight">本报告仅供研究展示，不构成投资建议。数据来源：国信证券金融数据。</div>
      <p class="summary-text">在这里放入与 Markdown 报告同源的摘要。摘要应说明市场主线、关键驱动、确认信号、弱化信号和后续观察窗口，不新增无证据结论。</p>
    </section>

    <div class="module-title">核心指标</div>
    <section class="metrics reveal-section" id="market">
      <article class="metric-card">
        <div class="metric-label">上涨家数</div>
        <div class="metric-value up">2,916</div>
        <div class="metric-note">示例数据，接入真实行情后替换。</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">下跌家数</div>
        <div class="metric-value down">2,040</div>
        <div class="metric-note">A 股语义：上涨红、下跌绿。</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">成交额</div>
        <div class="metric-value">8,450 亿</div>
        <div class="metric-note">数字使用 tabular nums。</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">强势题材</div>
        <div class="metric-value">AI 芯片</div>
        <div class="metric-note">标题和结论来自正文证据。</div>
      </article>
    </section>

    <div class="module-title">题材路径</div>
    <section class="theme-grid reveal-section" id="themes">
      <article class="theme-card grade-s">
        <span class="grade-badge">S</span>
        <h3>AI 芯片国产替代</h3>
        <p class="card-text">卡片正文用 16px，描述驱动因素、代表公司、成交额、持续性和待确认信号。</p>
        <div class="tag-row">
          <span class="tag">海光信息 <span class="up">+10.00%</span></span>
          <span class="tag">寒武纪 <span class="up">+7.25%</span></span>
        </div>
      </article>
      <article class="theme-card grade-a">
        <span class="grade-badge">A</span>
        <h3>智能电网与电力设备</h3>
        <p class="card-text">不同等级使用不同 chart palette 作为顶部强调，不使用黑灰等级色。</p>
        <div class="tag-row">
          <span class="tag">许继电气 <span class="up">+10.00%</span></span>
          <span class="tag">国电南瑞 <span class="up">+4.12%</span></span>
        </div>
      </article>
    </section>

    <div class="module-title">图表观察</div>
    <section class="chart-row reveal-section" id="charts">
      <article class="chart-card">
        <h3>主要指数近 5 日走势</h3>
        <p class="chart-note">图表说明放在标题下方，写清数据口径、单位和核心结论。</p>
        <div class="chart-box"><canvas id="indexTrend"></canvas></div>
      </article>
      <article class="chart-card">
        <h3>行业涨跌幅 TOP 10</h3>
        <p class="chart-note">排名和对比关系优先使用横向柱状图，所有图表必须有 tooltip。</p>
        <div class="chart-box"><canvas id="sectorRank"></canvas></div>
      </article>
    </section>

    <div class="module-title">数据明细</div>
    <section class="table-wrap reveal-section">
      <table>
        <thead>
          <tr>
            <th>对象</th>
            <th class="num">最新值</th>
            <th class="num">涨跌幅</th>
            <th>观察结论</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>上证指数</td>
            <td class="num">3,295</td>
            <td class="num up">+0.42%</td>
            <td>示例行。真实数据需来自明确来源。</td>
          </tr>
          <tr>
            <td>创业板指</td>
            <td class="num">2,102</td>
            <td class="num down">-0.18%</td>
            <td>表格只在容器内横向滚动，页面本身不溢出。</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="module-title">观察清单</div>
    <section class="obs-list reveal-section">
      <div class="obs-item">确认信号：列出数据或事件已支持的判断，保留来源或口径。</div>
      <div class="obs-item">待确认项：列出未来观察窗口、数据缺口和不确定因素。</div>
    </section>

    <footer class="footer reveal-section" id="appendix">
      <h3>风险提示与免责声明</h3>
      <div>本页面仅供研究参考，不构成投资建议。市场有风险，投资需谨慎。缺失数据、未验证口径或示例数据必须在正文中明确标注。</div>
    </footer>
  </main>

  <script>
    const chartPalette = {
      series: ["#FF5F9D", "#FF958A", "#7C3AED", "#8669FF", "#B3A1CB"],
      bars: ["#FFDFEB", "#FFCFE2", "#FFBFD8", "#FF9FC4", "#FF75AA", "#FF5F9D"]
    };
    const charts = [];

    function chartTextColor() {
      return getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim();
    }

    function chartGridColor() {
      return getComputedStyle(document.documentElement).getPropertyValue("--border").trim();
    }

    function buildCharts() {
      charts.forEach((chart) => chart.destroy());
      charts.length = 0;

      const common = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: chartTextColor(), padding: 18, usePointStyle: true }
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(30, 21, 53, 0.88)",
            titleColor: "#fff",
            bodyColor: "#fff",
            padding: 12,
            displayColors: true
          }
        },
        scales: {
          x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
          y: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } }
        }
      };

      const trend = document.getElementById("indexTrend");
      if (trend) {
        charts.push(new Chart(trend, {
          type: "line",
          data: {
            labels: ["05/30", "06/02", "06/03", "06/04", "06/05"],
            datasets: [
              { label: "上证指数", data: [3260, 3280, 3295, 3302, 3340], borderColor: chartPalette.series[0], backgroundColor: chartPalette.series[0], tension: 0.35 },
              { label: "创业板指", data: [2040, 2075, 2102, 2095, 2148], borderColor: chartPalette.series[1], backgroundColor: chartPalette.series[1], tension: 0.35 },
              { label: "沪深300", data: [3890, 3910, 3925, 3918, 3960], borderColor: chartPalette.series[2], backgroundColor: chartPalette.series[2], tension: 0.35 }
            ]
          },
          options: common
        }));
      }

      const rank = document.getElementById("sectorRank");
      if (rank) {
        charts.push(new Chart(rank, {
          type: "bar",
          data: {
            labels: ["电子", "电力设备", "计算机", "通信", "有色金属", "汽车"],
            datasets: [{
              label: "涨跌幅",
              data: [4.8, 3.5, 3.2, 2.9, 2.5, 2.3],
              backgroundColor: chartPalette.bars.slice().reverse(),
              borderRadius: 6,
              barThickness: 18,
              categoryPercentage: 0.72,
              barPercentage: 0.82
            }]
          },
          options: {
            ...common,
            indexAxis: "y",
            plugins: { ...common.plugins, legend: { display: false } },
            scales: {
              x: { ticks: { color: chartTextColor(), callback: (v) => v + "%" }, grid: { color: chartGridColor() } },
              y: { ticks: { color: chartTextColor(), padding: 8 }, grid: { display: false } }
            }
          }
        }));
      }
    }

    const visibleSections = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !visibleSections.has(entry.target)) {
          visibleSections.add(entry.target);
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal-section").forEach((section) => observer.observe(section));

    document.querySelector(".theme-toggle")?.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      buildCharts();
    });

    buildCharts();
  </script>
</body>
</html>
```

## 首屏规则

- 首屏使用紧凑报告标题卡，不能做营销落地页 Hero。
- 标题卡必须包含：报告标题、普通元信息行、黄色重点提示卡、摘要正文。
- 元信息行使用“字段名：加粗值”横排展示，不要用紫色胶囊标签展示股票代码、报告日期、数据时间或报告类型。
- 标题卡左侧可用 4px 粉紫渐变或主题色强调；卡片右上角可有低透明弥散圆形装饰。
- 桌面首屏尽量露出核心指标区开头，方便用户快速扫描关键数据。
- H1 是报告名称或研究对象名称，副文案说明价值和结论，不要把 H1 写成宣传口号。

## 视觉 Token 规则

- 背景：接近白底的 160 度粉紫弥散渐变，叠加低透明、重模糊光斑。
- 卡片：半透明白底、`backdrop-filter: blur(12px)`、细边框、柔和紫色阴影。
- 文本：正文与卡片说明使用 `16px`；紧凑控件、标签、tooltip 可更小。
- 圆角：普通卡片 `16px`，小控件 `8px` 或 `10px`；不要把所有控件都做成大圆角胶囊。
- 强调色：主强调 `#7C3AED`，图表粉 `#FF5F9D`，珊瑚 `#FF958A`，紫 `#8669FF`。
- A 股语义：真实上涨、收益率、涨跌幅、资金净流入使用红色 `#F01414`；下跌、回撤、资金净流出使用绿色 `#139557`。装饰色不得覆盖市场语义。
- 深色模式：底色必须是深紫 `#1A1025` 系列，不使用纯黑；卡片、表头、图表文字和 tooltip 必须同步切换。

## 组件规则

### 导航栏

- 使用中文品牌，例如“国信证券｜研究报告”“国信证券｜数据看板”。
- 顶部 sticky，含品牌、章节 tabs、日期或报告期、主题切换。
- tab 可以使用 emoji 或项目图标，但不要把功能说明写成大段可见文本。
- 移动端 tabs 横向滚动，页面不能整体横向溢出。

### 指标卡

- 4 个以内桌面 4 列，6 个以内桌面优先 3 列或 4 列；平板 2 列，移动 1 列。
- 只允许指标卡 hover 使用渐变描边；内容卡、图表卡、表格卡 hover 只增强阴影或轻微上浮。
- 指标值使用 tabular nums；单位与口径放在 note 中。
- 缺数据时写“待接入”“数据不足”，不要填看似真实的数值。

### 内容卡与分级卡

- 内容卡内部直接从标题和正文开始，不在标题上方加紫色 eyebrow。
- 题材、评级、路径卡可用 S/A/B 等徽章，但徽章颜色必须来自图表 palette，不用黑灰等级色。
- 卡片正文使用 16px，行高 1.65 至 1.85。
- 底部标签使用 `#FFEFF5` 背景、`#5B4C6E` 文本、`#F6EAEE` 边框。
- 卡片角落可以有低透明弥散圆形，不使用大面积装饰封面或强饱和渐变块。

### 表格

- 所有表格必须放入 `.table-wrap`，只允许表格容器横向滚动。
- 页面本身不得横向滚动。
- 第一行是横向字段轴，第一列是纵向对象轴。
- 数字列右对齐并使用 tabular nums。
- 表格文字固定 16px；不要为了塞内容压到过小。
- 带 `+`、`-` 且表示涨跌、收益率、涨跌幅、资金净流入/流出的数字，必须使用 A 股上涨红、下跌绿。
- 表头使用柔和粉色底，表体使用轻边框和清晰行距。

### 图表

- 时间序列使用折线图或面积图。
- 排名、TOP、资金流向对比使用柱状图或横向柱状图。
- 占比和结构使用饼图或环形图。
- 单一评分、百分制、总分制不使用“投票饼图”，优先用评分卡、仪表盘或环形进度，并写清 `56/100` 这类分母。
- 所有图表必须有 hover tooltip，展示日期或分类、数值、单位和系列名。
- 图表标题下方必须有图表说明、数据口径或核心结论，不把说明挤到标题右侧。
- 柱状图使用粉色阶：`#FFDFEB`、`#FFCFE2`、`#FFBFD8`、`#FF9FC4`、`#FF75AA`、`#FF5F9D`，最高值使用最深粉，最低值使用最浅粉。
- 非柱状图使用 5 色图表色板：`#FF5F9D`、`#FF958A`、`#7C3AED`、`#8669FF`、`#B3A1CB`。
- 饼图或环形图图例放在图表下方，扇区之间保留 1px 左右间隙。
- 图表必须预留坐标轴、图例、数值标签和 tooltip 空间，避免被 canvas、卡片边缘或 `overflow: hidden` 裁切。
- Chart.js 切换深色模式后必须销毁并重渲染图表，保证 grid、label、legend、tooltip 颜色更新。

## 报告类型扩展

### 每日题材追踪

推荐结构：Hero、核心指标、指数表、题材路径卡、题材分级、图表行、观察清单、数据附录。导航 tab 可用“概览 / 市场状态 / 题材路径 / 个股矩阵 / 题材分级 / 观察清单 / 附录”。

### 财报分析

推荐结构：Hero、营收/净利润/毛利率/ROE 指标卡、三大报表表格、收入利润趋势图、增长驱动卡、风险因素、结论。财务数据必须标注报告期和来源。

### 行业研报

推荐结构：Hero、行业规模/增速/集中度/估值指标卡、产业链说明、竞争格局表、政策催化观察、核心公司卡、风险提示。避免把行业结论写成个股推荐。

### 公司深度

推荐结构：Hero、公司概况、业务拆解图表、财务预测表、估值区间分析、风险因素、研究结论。估值、预测和目标价必须有口径和免责声明。

### 板块轮动与资金流向

推荐结构：Hero、流入流出指标、轮动或资金图、板块卡、资金明细表、龙虎榜或主力观察、后续观察窗口。资金净流入/流出必须使用红绿语义。

## 输出格式写法

当目标业务 Skill 支持 HTML 输出时，在其 `## 输出格式` 或 `## HTML UI 交付契约` 中写明：

```markdown
用户确认需要 HTML 时，除对话 Markdown 摘要外，还生成一个可直接打开的 `.html` 文件。HTML 必须遵守 `assets/templates/output-html-report-template.md`：使用 gs Premium Diffused 的粉紫弥散金融 UI token、紧凑报告首屏、响应式布局、局部横向滚动表格、图表 tooltip、深色模式变量、A 股上涨红下跌绿语义和风险免责声明。缺少真实数据时使用结构化占位并明确标注，不编造行情、财务、公告、研报或客户数据。Markdown 与 HTML 必须同源，HTML 不得新增未经证据支持的结论。
```

如果目标 Skill 正文引用本模板，必须把本模板复制到目标 Skill 的 `assets/templates/output-html-report-template.md`，避免断链；若不复制，则必须把必要规则完整写入目标 Skill 正文。

## 验收清单

- [ ] HTML 仅在用户明确要求或确认后生成，默认结果仍为 Markdown。
- [ ] 文件为单文件 HTML，或符合现有前端项目结构；不包含本机绝对路径、token 或生成过程。
- [ ] 首屏是紧凑报告标题卡，不是营销落地页。
- [ ] 首屏包含标题、元信息、黄色提示卡、摘要，并尽量露出核心指标。
- [ ] 背景、卡片、强调色、图表色板、表格和深色模式符合本模板 token。
- [ ] A 股真实涨跌数据使用上涨红、下跌绿，装饰色不覆盖市场语义。
- [ ] 图表类型与数据关系匹配，并具备 hover tooltip、图例、口径说明和足够留白。
- [ ] 表格只在 `.table-wrap` 内横向滚动，页面本身无横向溢出。
- [ ] 移动端内容单列或合理双列，文本不裁切、不重叠。
- [ ] Markdown 与 HTML 内容同源，HTML 没有新增无证据结论。
- [ ] 缺失数据有明确说明，没有编造接口、字段、新闻或数值。
- [ ] 免责声明、风险提示和“不构成投资建议”在客户可见输出中存在。
- [ ] 生成或修改 HTML 后，尽量通过浏览器截图、构建命令或静态打开方式验证；无法验证时说明原因。
