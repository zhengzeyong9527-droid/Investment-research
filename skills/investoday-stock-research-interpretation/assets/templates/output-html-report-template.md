# HTML 公司研究报告输出模板

本模板用于用户明确要求 HTML、H5、研究报告页、数据看板或可视化报告时。HTML 必须与 Markdown 公司研究报告内容同源，不得新增未经证据支撑的结论。

HTML 可以渲染图表，但图表区命名为“研报信号看板”，不改变 Markdown 正文的公司研究结构。

## 设计系统约束

HTML 页面必须应用 `investoday-design` 的“今日投资金融报告UI规范 / Investoday Premium Diffused”，并在实际 HTML/CSS 中落地，不得只在说明文字中声明：

- 背景：浅色模式使用接近白底的 160° 粉紫三段弥散渐变，并叠加低透明度模糊光斑；深色模式使用深紫底，不使用纯黑。
- 卡片：首屏、指标卡、图表卡、表格区和免责声明使用半透明玻璃拟态卡片、`backdrop-filter`、细边框和紫色调柔和阴影。
- 色彩：主强调色为 `#7C3AED`，图表 5 色固定为 `#FF5F9D`、`#FF958A`、`#7C3AED`、`#8669FF`、`#B3A1CB`；真实 A 股涨跌方向数字才使用涨红跌绿。
- 导航：品牌必须使用中文“今日投资｜研究报告”，使用粘性玻璃拟态导航，并提供深色模式切换；导航 tab 可局部横向滚动。
- 首屏：使用紧凑报告标题卡，不使用营销 Hero、封面式大标题或产品宣传区；第一屏应尽量露出指标卡或下一模块。
- 表格：放入 `.table-wrap` 局部横向滚动容器，表头使用柔和粉色底，表格字号 16px，数字列使用 tabular nums 并右对齐，评级/状态列居中；页面根元素和正文不得出现页面级横向滚动。
- 图表：不得随机配色；柱状或横向柱状图使用粉色权重阶，最高值 `#FF5F9D`、最低值 `#FFDFEB`；所有图表必须有数据口径，无有效数据的图表或模块不渲染；图表不得暴露内部接口名或字段名。
- 禁止：不得做成营销 Hero、落地页封面、交易操作面板、目标价建议卡片或买卖行动按钮。

## 页面结构

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>[公司名称]研究报告</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html {
      overflow-x: hidden;
      scroll-behavior: smooth;
    }

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
      --red-bg: #FFE3E3;
      --green: #139557;
      --green-light: #EFFDF5;
      --green-bg: #D1FAE2;
      --amber: #D97706;
      --amber-light: #FFFBEB;
      --amber-bg: #FEF3C7;
      --risk: #FF958A;
      --ok: #7C3AED;
      --warn: #B3A1CB;
      --chart-p0: #FF5F9D;
      --chart-p1: #FF958A;
      --chart-p2: #7C3AED;
      --chart-p3: #8669FF;
      --chart-p4: #B3A1CB;
      --bar-low-0: #FFDFEB;
      --bar-low-1: #FFCFE2;
      --bar-mid-0: #FFBFD8;
      --bar-mid-1: #FF9FC4;
      --bar-high-0: #FF75AA;
      --bar-high-1: #FF5F9D;
      --gradient-border: linear-gradient(90deg, #7873F5, #EC77AB);
      --table-header-bg: #FFEFF5;
      --table-body-bg: #FFFFFF;
      --radius: 16px;
      --radius-md: 12px;
      --radius-sm: 8px;
      --radius-xs: 6px;
      --shadow-sm: 0 1px 3px rgba(100, 60, 140, 0.04);
      --shadow: 0 1px 3px rgba(100, 60, 140, 0.05), 0 4px 16px rgba(124, 58, 237, 0.06);
      --shadow-hover: 0 4px 12px rgba(100, 60, 140, 0.08), 0 8px 24px rgba(124, 58, 237, 0.10);
      --shadow-lg: 0 8px 24px rgba(100, 60, 140, 0.10), 0 2px 8px rgba(100, 60, 140, 0.06);
      --font: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      --font-num: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      --content-max-w: min(1180px, calc(100% - 32px));
      --nav-h: 60px;
      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    }
    body {
      margin: 0;
      font-family: var(--font);
      color: var(--text);
      background: linear-gradient(160deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 42%, var(--bg-gradient-3) 100%);
      line-height: 1.7;
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
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
    nav, main {
      position: relative;
      z-index: 1;
    }
    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      height: var(--nav-h);
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 0 max(16px, calc((100vw - 1180px) / 2));
    }
    nav .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent);
      font-size: 17px;
      font-weight: 700;
      white-space: nowrap;
    }
    nav .logo::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-light);
    }
    nav .tabs {
      display: flex;
      gap: 2px;
      flex: 1;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    nav .tabs::-webkit-scrollbar { display: none; }
    nav .tab {
      position: relative;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      padding: 7px 14px;
      white-space: nowrap;
      transition: all 0.2s var(--ease-out);
    }
    nav .tab:hover,
    nav .tab.active {
      color: var(--accent);
      background: var(--accent-light);
      border-color: var(--chart-p3);
    }
    nav .right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .date-badge {
      color: var(--text-secondary);
      background: rgba(167, 139, 250, 0.08);
      border: 1px solid rgba(167, 139, 250, 0.15);
      border-radius: 24px;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 12px;
      white-space: nowrap;
    }
    .theme-toggle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s var(--ease-out);
    }
    .theme-toggle:hover {
      border-color: var(--accent-mid);
      box-shadow: var(--shadow);
      transform: scale(1.04);
    }
    main {
      max-width: var(--content-max-w);
      margin: 0 auto;
      padding: 24px 0 48px;
    }
    header, section {
      margin-bottom: 20px;
    }
    h1, h2, h3, p {
      margin-top: 0;
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      min-width: 0;
      transition: box-shadow 0.22s var(--ease-out), transform 0.22s var(--ease-out), border-color 0.22s var(--ease-out);
    }
    .panel:hover {
      box-shadow: var(--shadow-hover);
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
      background: linear-gradient(180deg, var(--chart-p1) 0%, var(--accent) 100%);
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
    .hero h1 {
      font-size: 24px;
      line-height: 1.35;
      margin-bottom: 14px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .hero-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 28px;
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 12px;
    }
    .hero-meta-line strong {
      color: var(--text);
      font-weight: 700;
    }
    .hero-highlight {
      margin-top: 18px;
      padding: 13px 16px;
      background: #FFF7DD;
      border-left: 3px solid var(--chart-p0);
      border-radius: var(--radius-sm);
      color: #B45362;
      font-size: 13px;
      line-height: 1.7;
    }
    .hero .summary-text {
      margin: 16px 0 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.85;
    }
    .module-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 26px 0 14px;
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
    .meta {
      color: var(--text-secondary);
      line-height: 1.8;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .grid > *,
    .chart-grid > *,
    .risk-grid > *,
    .insight-list > * {
      min-width: 0;
    }
    .metric-card {
      position: relative;
      overflow: hidden;
      padding: 20px 24px;
    }
    .metric-card::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: var(--radius);
      padding: 2px;
      background: var(--gradient-border);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s var(--ease-out);
    }
    .metric-card:hover {
      transform: translateY(-3px);
    }
    .metric-card:hover::after {
      opacity: 1;
    }
    .metric-card strong {
      display: block;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .metric-card p {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
    .chart {
      min-height: 280px;
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: box-shadow 0.22s var(--ease-out);
    }
    .chart:hover {
      box-shadow: var(--shadow-hover);
    }
    .chart h3 {
      margin: 0 0 12px;
      font-size: 15px;
      font-weight: 800;
    }
    .chart-note {
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.65;
      margin: 12px 0 0;
    }
    .timeline {
      display: grid;
      gap: 10px;
    }
    .timeline-item {
      border-left: 3px solid var(--chart-p0);
      padding-left: 10px;
    }
    .timeline-date {
      color: var(--text-muted);
      font-size: 13px;
    }
    .bar-row {
      display: grid;
      grid-template-columns: minmax(72px, 120px) 1fr 36px;
      gap: 10px;
      align-items: center;
      margin: 10px 0;
    }
    .bar-track {
      height: 10px;
      background: var(--accent-light);
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--bar-low-0), var(--bar-mid-1), var(--bar-high-1));
      border-radius: 999px;
    }
    .risk-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    .risk-card {
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      padding: 10px;
      background: rgba(255, 255, 255, 0.76);
      color: var(--text-secondary);
    }
    .risk-high { border-left: 4px solid var(--risk); }
    .risk-medium { border-left: 4px solid var(--warn); }
    .risk-low { border-left: 4px solid var(--ok); }
    .insight-list {
      display: grid;
      gap: 12px;
    }
    .insight-card {
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      padding: 12px;
      background: rgba(255, 255, 255, 0.76);
      color: var(--text-secondary);
    }
    .insight-card strong {
      color: var(--accent);
      font-weight: 800;
    }
    .insight-card p {
      margin: 8px 0 0;
    }
    .insight-card p + p {
      margin-top: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 16px 0 18px;
    }
    .summary-item {
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      background: var(--surface-muted);
      padding: 12px;
    }
    .summary-item strong {
      display: block;
      color: var(--accent);
      font-size: 13px;
      margin-bottom: 6px;
    }
    .summary-item p {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.65;
    }
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
      border-radius: var(--radius);
      border: 1px solid var(--border-light);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
      background: var(--table-body-bg);
      font-variant-numeric: tabular-nums;
    }
    th, td {
      border-bottom: 1px solid var(--border-light);
      padding: 10px 14px;
      text-align: left;
      vertical-align: top;
      font-size: 16px;
      line-height: 1.5;
    }
    th {
      color: var(--text);
      background: var(--table-header-bg);
      border-bottom: 2px solid var(--border);
      font-weight: 700;
      white-space: nowrap;
    }
    td {
      color: var(--text-secondary);
    }
    th:first-child,
    td:first-child {
      color: var(--text);
      font-weight: 700;
      min-width: 120px;
    }
    th.num,
    td.num {
      text-align: right;
      font-family: var(--font-num);
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
    th.center,
    td.center {
      text-align: center;
    }
    .up,
    .up-text {
      color: var(--red);
      font-weight: 700;
    }
    .down,
    .down-text {
      color: var(--green);
      font-weight: 700;
    }
    tbody tr:hover td {
      background: var(--accent-light);
    }
    .disclaimer {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.9;
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
    html.dark .hero-highlight {
      background: #3D2E12;
      color: #F0A0C0;
    }
    html.dark table {
      background: rgba(30, 18, 50, 0.72);
    }
    html.dark th {
      background: #2D1520;
    }
    html.dark .risk-card {
      background: rgba(30, 18, 50, 0.60);
    }
    @media (max-width: 640px) {
      nav { padding: 0 12px; }
      nav .logo span { display: none; }
      .date-badge { display: none; }
      main { max-width: calc(100% - 22px); padding: 16px 0 36px; }
      h1 { font-size: 24px; }
      .panel, .chart, .hero { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      .insight-list { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="diffused-orb orb-3"></div>
  <div class="diffused-orb orb-4"></div>
  <nav>
    <div class="logo">今日投资<span>｜研究报告</span></div>
    <div class="tabs">
      <button class="tab active" data-target="summary">核心观点</button>
      <button class="tab" data-target="company">公司画像</button>
      <button class="tab" data-target="signals">研报信号</button>
      <button class="tab" data-target="framework">研究框架</button>
      <button class="tab" data-target="evidence">证据表</button>
    </div>
    <div class="right">
      <div class="date-badge">YYYY-MM-DD</div>
      <button class="theme-toggle" type="button" aria-label="切换深色模式">◐</button>
    </div>
  </nav>
  <main>
    <header class="panel hero reveal-section">
      <div class="hero-corner" aria-hidden="true"></div>
      <h1>[公司名称]研究报告</h1>
      <div class="hero-meta-line">
        <span>股票代码：<strong>[stockCode]</strong></span>
        <span>分析日期：<strong>YYYY-MM-DD</strong></span>
        <span>时间范围：<strong>近90天</strong></span>
        <span>研究定位：<strong>公司研究与信息整理</strong></span>
      </div>
      <div class="hero-highlight">
        数据来源：今日投资数据市场；图表仅展示研报研究线索、样本结构、主题分布、原文片段摘要、风险因素和分歧来源，不构成任何投资建议。
      </div>
      <p class="summary-text">
        主营业务摘要：[mainBusiness 摘要]
      </p>
    </header>

    <div class="module-title" id="summary">核心观点</div>
    <section class="panel reveal-section">
      <h2>核心观点</h2>
      <ul>
        <li>[公司定位]</li>
        <li>[研报主线]</li>
        <li>[验证重点]</li>
        <li>[风险边界]</li>
      </ul>
    </section>

    <section class="grid">
      <div class="panel metric-card reveal-section"><strong>研报样本数</strong><p>[count]</p></div>
      <div class="panel metric-card reveal-section"><strong>关注主线</strong><p>[themeCount]</p></div>
      <div class="panel metric-card reveal-section"><strong>风险因素</strong><p>[riskCount]</p></div>
      <div class="panel metric-card reveal-section"><strong>讨论集中度</strong><p>[集中/分散/待验证]</p></div>
    </section>

    <div class="module-title" id="company">公司画像</div>
    <section class="panel reveal-section">
      <h2>公司画像与业务定位</h2>
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><th>股票代码</th><td>[stockCode]</td></tr>
            <tr><th>公司全称</th><td>[stockFullName]</td></tr>
            <tr><th>上市板块</th><td>[boardName]</td></tr>
            <tr><th>主营业务</th><td>[mainBusiness 摘要]</td></tr>
            <tr><th>基础资料日期</th><td>[reportDate]</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="module-title" id="signals">研报信号</div>
    <section class="panel reveal-section">
      <h2>研报信号看板</h2>
      <div class="grid">
        <div class="chart">
          <h3>研报发布时间线</h3>
          <div id="timeline" class="timeline"></div>
          <p class="chart-note">数据口径：研报日期、标题与关键事由。</p>
        </div>
        <div class="chart">
          <h3>主题热度</h3>
          <div id="themes"></div>
          <p class="chart-note">数据口径：研报关键事由与观点摘要。</p>
        </div>
        <div class="chart">
          <h3>风险矩阵</h3>
          <div id="risks" class="risk-grid"></div>
          <p class="chart-note">数据口径：研报风险提示。</p>
        </div>
        <div class="chart">
          <h3>机构共识</h3>
          <div id="institutionConsensus" class="insight-list"></div>
          <p class="chart-note">数据口径：多篇研报观点对比。</p>
        </div>
        <div class="chart">
          <h3>机构分歧</h3>
          <div id="institutionDivergence" class="insight-list"></div>
          <p class="chart-note">数据口径：多篇研报观点对比。</p>
        </div>
        <div class="chart">
          <h3>研报原文片段</h3>
          <div id="vectorEvidence" class="insight-list"></div>
          <p class="chart-note">数据口径：研报原文片段归纳摘要，仅用于补强研究证据。</p>
        </div>
      </div>
    </section>

    <div class="module-title" id="framework">研究框架</div>
    <section class="panel reveal-section">
      <h2>成长逻辑、竞争位置</h2>
      <div class="grid">
        <div class="chart">
          <h3>成长逻辑</h3>
          <div id="growthLogic" class="insight-list"></div>
          <p class="chart-note">数据口径：公司基础资料、研报摘要和有效片段。</p>
        </div>
        <div class="chart">
          <h3>竞争位置</h3>
          <div id="competitivePosition" class="insight-list"></div>
          <p class="chart-note">数据口径：产业链位置、技术路线、客户认证、交付能力、规模或同业比较证据。</p>
        </div>
      </div>
    </section>

    <div class="module-title">业务映射</div>
    <section class="panel reveal-section">
      <h2>公司业务与研报主题映射</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>公司业务/资源/产品</th>
              <th>对应研报主题</th>
              <th>研报证据</th>
              <th>研究含义</th>
              <th>待验证变量</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>[公司业务]</td>
              <td>[研报主题]</td>
              <td>[研报证据]</td>
              <td>[研究含义]</td>
              <td>[待验证变量]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="module-title" id="earningsTitle">业绩预期</div>
    <section class="panel reveal-section" id="earningsSection">
      <h2>业绩预期汇总</h2>
      <p class="meta">评级、目标价、买入/推荐等文字如有展示，均为机构研报口径，不代表本报告或本 Skill 的投资建议。</p>
      <div id="earningsSummary" class="summary-grid"></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>报告日期</th>
              <th>机构</th>
              <th>报告标题</th>
              <th>T+1收入预测</th>
              <th>T+2收入预测</th>
              <th>T+3收入预测</th>
              <th>T+1净利润预测</th>
              <th>T+2净利润预测</th>
              <th>T+3净利润预测</th>
              <th>机构评级口径</th>
              <th>机构目标价口径</th>
              <th>前次变化说明</th>
            </tr>
          </thead>
          <tbody id="earningsForecastRows"></tbody>
        </table>
      </div>
    </section>

    <div class="module-title" id="evidence">研报证据</div>
    <section class="panel reveal-section">
      <h2>研报证据表</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>研报标题</th>
              <th>关键事由</th>
              <th>观点摘要</th>
              <th>风险摘要</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>YYYY-MM-DD</td>
              <td>[标题]</td>
              <td>[关键事由]</td>
              <td>[观点摘要]</td>
              <td>[风险摘要]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel reveal-section">
      <h2>引用来源</h2>
      <ul>
        <li>数据来源今日投资数据市场。</li>
        <li>研报：YYYY-MM-DD，研报标题，今日投资研报舆情。</li>
      </ul>
    </section>

    <section class="panel disclaimer reveal-section">
      <h2>免责声明</h2>
      <p>本报告基于客观数据分析，由AI生成，不构成投资建议。投资有风险，入市需谨慎。</p>
    </section>
  </main>
  <script>
    const reportData = {
      timeline: [
        { date: "YYYY-MM-DD", title: "[研报标题]", keyReason: "[关键事由]" }
      ],
      themes: [
        { name: "[主题名称]", value: 1, evidence: "[研报证据]" }
      ],
      risks: [
        { type: "[风险类型]", level: "medium", evidence: "[研报证据]", variable: "[情景变量]" }
      ],
      growthLogic: [
        {
          title: "[成长驱动]",
          evidence: "[研报或基础资料证据]",
          content: "[商业逻辑归纳]",
          variable: "[待验证变量]"
        }
      ],
      competitivePosition: [
        {
          title: "[位置维度]",
          evidence: "[研报或基础资料证据]",
          content: "[公司位置归纳]",
          variable: "[需要继续验证的问题]"
        }
      ],
      institutionConsensus: [
        {
          title: "[共识观点]",
          viewpoint: "[多家机构共同认可的观点总结]",
          rationale: "[形成该共识的推导依据]",
          institutions: ["[机构A]", "[机构B]", "[机构C]"]
        }
      ],
      institutionDivergence: [
        {
          title: "[分歧主题]",
          sides: [
            {
              viewpoint: "[观点一]",
              rationale: "[观点一的原因]",
              institutions: ["[机构A]", "[机构B]"]
            },
            {
              viewpoint: "[观点二]",
              rationale: "[观点二的原因]",
              institutions: ["[机构C]"]
            }
          ],
          validationFocus: "[待验证变量]"
        }
      ],
      vectorEvidence: [
        {
          title: "[片段主题]",
          date: "YYYY-MM-DD",
          summary: "[研报原文片段归纳摘要]",
          researchQuestion: "[对应研究问题]",
          supports: "[可补强章节]"
        }
      ],
      earningsSummary: {
        sampleCount: "[有效预测样本数]",
        institutionCount: "[机构数量]",
        dateRange: "[报告日期区间]",
        revenueSummary: "[收入预测趋势或区间]",
        netProfitSummary: "[净利润预测趋势或区间]",
        revisionSummary: "[前次变化方向]",
        ratingTargetSummary: "[评级和目标价仅为机构研报口径]"
      },
      earningsForecasts: [
        {
          date: "YYYY-MM-DD",
          institutionName: "[机构名称]",
          reportTitle: "[报告标题]",
          revenueT1: "[T+1收入预测]",
          revenueT2: "[T+2收入预测]",
          revenueT3: "[T+3收入预测]",
          netProfitT1: "[T+1净利润预测]",
          netProfitT2: "[T+2净利润预测]",
          netProfitT3: "[T+3净利润预测]",
          rating: "[评级]",
          targetPrice: "[目标价]",
          changeSummary: "[前次变化说明]"
        }
      ]
    };

    const lightModeVariables = {
      "--bg": "#FFFAFD",
      "--bg-gradient-1": "#FFFCFE",
      "--bg-gradient-2": "#FFF5FB",
      "--bg-gradient-3": "#F9F4FF",
      "--orb-1": "rgba(255, 95, 157, 0.12)",
      "--orb-2": "rgba(124, 58, 237, 0.10)",
      "--orb-3": "rgba(255, 149, 138, 0.10)",
      "--orb-4": "rgba(134, 105, 255, 0.09)",
      "--card": "rgba(255, 255, 255, 0.82)",
      "--card-hover": "rgba(255, 255, 255, 0.92)",
      "--card-border": "rgba(255, 255, 255, 0.60)",
      "--text": "#1E1535",
      "--text-secondary": "#5B4C6E",
      "--text-muted": "#9B8DAF",
      "--border": "rgba(210, 185, 230, 0.35)",
      "--border-light": "rgba(225, 205, 240, 0.25)",
      "--accent": "#7C3AED",
      "--accent-mid": "#A78BFA",
      "--accent-light": "#F3EEFF",
      "--accent-hover": "#6D28D9",
      "--gold": "#C0567B",
      "--gold-light": "#FFF0F5",
      "--red": "#F01414",
      "--red-light": "#FFF1F1",
      "--red-bg": "#FFE3E3",
      "--green": "#139557",
      "--green-light": "#EFFDF5",
      "--green-bg": "#D1FAE2",
      "--amber": "#D97706",
      "--amber-light": "#FFFBEB",
      "--amber-bg": "#FEF3C7",
      "--shadow-sm": "0 1px 3px rgba(100, 60, 140, 0.04)",
      "--shadow": "0 1px 3px rgba(100, 60, 140, 0.05), 0 4px 16px rgba(124, 58, 237, 0.06)",
      "--shadow-hover": "0 4px 12px rgba(100, 60, 140, 0.08), 0 8px 24px rgba(124, 58, 237, 0.10)"
    };

    const darkModeVariables = {
      "--bg": "#1A1025",
      "--bg-gradient-1": "#1A1025",
      "--bg-gradient-2": "#1E1230",
      "--bg-gradient-3": "#200E28",
      "--orb-1": "rgba(120, 60, 180, 0.20)",
      "--orb-2": "rgba(100, 50, 160, 0.18)",
      "--orb-3": "rgba(140, 60, 120, 0.15)",
      "--orb-4": "rgba(90, 60, 180, 0.12)",
      "--card": "rgba(30, 18, 50, 0.85)",
      "--card-hover": "rgba(40, 25, 60, 0.90)",
      "--card-border": "rgba(80, 60, 120, 0.35)",
      "--text": "#EDE4FA",
      "--text-secondary": "#A899C0",
      "--text-muted": "#7B6B95",
      "--border": "rgba(80, 60, 120, 0.40)",
      "--border-light": "rgba(60, 45, 90, 0.30)",
      "--accent": "#C4B5FD",
      "--accent-mid": "#A78BFA",
      "--accent-light": "#2D1F45",
      "--accent-hover": "#DDD6FE",
      "--gold": "#F0A0C0",
      "--gold-light": "#3D1A28",
      "--red": "#FCA5A5",
      "--red-light": "#3B1212",
      "--red-bg": "#3B1A1A",
      "--green": "#86EFAC",
      "--green-light": "#0A2E14",
      "--green-bg": "#1A3C26",
      "--amber": "#FCD34D",
      "--amber-light": "#3D2E0A",
      "--amber-bg": "#3D2E12",
      "--shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.2)",
      "--shadow": "0 1px 2px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 4px 12px rgba(0, 0, 0, 0.4)"
    };

    function applyThemeVariables(variables) {
      Object.entries(variables).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }

    const escapeHtml = (value) => String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

    const setEmpty = (el) => {
      const chart = el.closest(".chart");
      if (chart) {
        chart.hidden = true;
        return;
      }
      el.hidden = true;
    };

    function renderTimeline(items) {
      const el = document.getElementById("timeline");
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="timeline-item">
          <div class="timeline-date">${escapeHtml(item.date)}</div>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="meta">${escapeHtml(item.keyReason)}</p>
        </div>
      `).join("");
    }

    function renderBarChart(items) {
      const el = document.getElementById("themes");
      if (!items?.length) return setEmpty(el);
      const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
      el.innerHTML = items.map((item) => {
        const value = Number(item.value) || 0;
        const width = Math.max(8, Math.round((value / max) * 100));
        return `
          <div class="bar-row" title="${escapeHtml(item.evidence)}">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
            <span>${value}</span>
          </div>
        `;
      }).join("");
    }

    function renderRiskMatrix(items) {
      const el = document.getElementById("risks");
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="risk-card risk-${escapeHtml(item.level || "medium")}">
          <strong>${escapeHtml(item.type)}</strong>
          <p>${escapeHtml(item.evidence)}</p>
          <p class="meta">情景变量：${escapeHtml(item.variable)}</p>
        </div>
      `).join("");
    }

    function renderInstitutionConsensus(items) {
      const el = document.getElementById("institutionConsensus");
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="insight-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.viewpoint || item.summary || "")}</p>
          <p class="meta">推导依据：${escapeHtml(item.rationale || "")}</p>
          <p class="meta">共识机构：${renderInstitutions(item.institutions)}</p>
        </div>
      `).join("");
    }

    function renderInsightList(targetId, items) {
      const el = document.getElementById(targetId);
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="insight-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.content || item.summary || "")}</p>
          <p class="meta">证据口径：${escapeHtml(item.evidence || "")}</p>
          <p class="meta">观察口径：${escapeHtml(item.variable || "")}</p>
        </div>
      `).join("");
    }

    function renderInstitutionDivergence(items) {
      const el = document.getElementById("institutionDivergence");
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="insight-card">
          <strong>${escapeHtml(item.title)}</strong>
          ${renderDivergenceSides(item.sides)}
          ${item.validationFocus ? `<p class="meta">待验证变量：${escapeHtml(item.validationFocus)}</p>` : ""}
        </div>
      `).join("");
    }

    function renderVectorEvidence(items) {
      const el = document.getElementById("vectorEvidence");
      if (!items?.length) return setEmpty(el);
      el.innerHTML = items.map((item) => `
        <div class="insight-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.summary)}</p>
          <p class="meta">对应研究问题：${escapeHtml(item.researchQuestion)}</p>
          <p class="meta">可补强章节：${escapeHtml(item.supports)}</p>
        </div>
      `).join("");
    }

    function renderInstitutions(institutions) {
      return Array.isArray(institutions) && institutions.length
        ? institutions.map((name) => escapeHtml(name)).join("、")
        : "";
    }

    function renderDivergenceSides(sides) {
      if (!Array.isArray(sides) || !sides.length) return "";
      return sides.map((side, index) => `
        <p>观点${index + 1}：${escapeHtml(side.viewpoint || "")}</p>
        <p class="meta">原因：${escapeHtml(side.rationale || "")}</p>
        <p class="meta">对应机构：${renderInstitutions(side.institutions)}</p>
      `).join("");
    }

    function renderEarningsSummary(summary) {
      const el = document.getElementById("earningsSummary");
      if (!el || !summary) return;
      const items = [
        ["有效样本", summary.sampleCount],
        ["覆盖机构", summary.institutionCount],
        ["日期区间", summary.dateRange],
        ["收入预测", summary.revenueSummary],
        ["净利润预测", summary.netProfitSummary],
        ["前次变化", summary.revisionSummary],
        ["评级目标价", summary.ratingTargetSummary]
      ].filter(([, value]) => value);
      el.innerHTML = items.map(([label, value]) => `
        <div class="summary-item">
          <strong>${escapeHtml(label)}</strong>
          <p>${escapeHtml(value)}</p>
        </div>
      `).join("");
    }

    function renderEarningsForecasts(items) {
      const el = document.getElementById("earningsForecastRows");
      if (!el) return;
      if (!items?.length) {
        document.getElementById("earningsTitle")?.setAttribute("hidden", "");
        document.getElementById("earningsSection")?.setAttribute("hidden", "");
        return;
      }
      el.innerHTML = items.map((item) => `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.institutionName)}</td>
          <td>${escapeHtml(item.reportTitle)}</td>
          <td>${escapeHtml(item.revenueT1)}</td>
          <td>${escapeHtml(item.revenueT2)}</td>
          <td>${escapeHtml(item.revenueT3)}</td>
          <td>${escapeHtml(item.netProfitT1)}</td>
          <td>${escapeHtml(item.netProfitT2)}</td>
          <td>${escapeHtml(item.netProfitT3)}</td>
          <td>${escapeHtml(item.rating)}</td>
          <td>${escapeHtml(item.targetPrice)}</td>
          <td>${escapeHtml(item.changeSummary)}</td>
        </tr>
      `).join("");
    }

    function initThemeToggle() {
      const button = document.querySelector(".theme-toggle");
      let isDark = false;
      if (!button) return;
      button.addEventListener("click", () => {
        isDark = !isDark;
        document.documentElement.classList.toggle("dark", isDark);
        applyThemeVariables(isDark ? darkModeVariables : lightModeVariables);
        button.textContent = isDark ? "☼" : "◐";
      });
    }

    function initNavigation() {
      const tabs = [...document.querySelectorAll("nav .tab")];
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const target = document.getElementById(tab.dataset.target);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          tabs.forEach((item) => item.classList.toggle("active", item === tab));
        });
      });
    }

    function initReveal() {
      const sections = document.querySelectorAll(".reveal-section");
      if (!("IntersectionObserver" in window)) {
        sections.forEach((section) => section.classList.add("revealed"));
        return;
      }
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("revealed");
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      sections.forEach((section) => revealObserver.observe(section));
    }

    renderTimeline(reportData.timeline);
    renderBarChart(reportData.themes);
    renderRiskMatrix(reportData.risks);
    renderInsightList("growthLogic", reportData.growthLogic);
    renderInsightList("competitivePosition", reportData.competitivePosition);
    renderInstitutionConsensus(reportData.institutionConsensus);
    renderInstitutionDivergence(reportData.institutionDivergence);
    renderVectorEvidence(reportData.vectorEvidence);
    renderEarningsSummary(reportData.earningsSummary);
    renderEarningsForecasts(reportData.earningsForecasts);
    initThemeToggle();
    initNavigation();
    initReveal();
  </script>
</body>
</html>
```

## 组件要求

- 首屏必须直接呈现公司名称、股票代码、主营业务摘要、分析日期、时间范围、数据来源和研究定位。
- 视觉系统必须实际采用 `investoday-design` 今日投资金融报告UI规范：粉紫弥散背景、玻璃拟态卡片、紫色强调系统、5 色图表色板、中文粘性导航、深色模式 token、局部横向滚动表格和移动端无页面级横向滚动约束。
- 指标卡只展示研报样本数、关注主线、风险因素、讨论集中度等研究型指标。
- 图表区命名为“研报信号看板”，使用同源数据对象渲染时间线、主题热度、风险矩阵、机构共识卡片、机构分歧卡片和研报原文片段证据；机构共识使用 `{ title, viewpoint, rationale, institutions }`，机构分歧使用 `{ title, sides, validationFocus }`；研究框架模块使用 `growthLogic`、`competitivePosition` 渲染成长逻辑和竞争位置；业绩预期模块先使用 `earningsSummary` 渲染数据总结，再使用 `earningsForecasts` 渲染明细表；无有效数据的模块直接隐藏；不得出现买卖按钮、目标价建议卡片、仓位建议或交易信号。
- 表格必须支持局部横向滚动。
- 页面根元素和正文必须设置防页面级横向滚动；导航 tabs 和 `.table-wrap` 是允许横向滚动的局部容器。
- 图表必须支持真实数据渲染；空数据或内部数据缺失时隐藏对应模块，不展示占位文案。
- 表格第一列为对象/维度轴，数字列右对齐并使用 tabular nums，评级、状态和机构口径列居中；任何真实涨跌方向数字必须使用 A 股涨红跌绿语义。

## 图表映射

| 图表 | 数据来源 | 推荐组件 | 空值状态 |
|---|---|---|---|
| 研报发布时间线 | 研报日期和标题 | 时间线/散点 | 无有效数据时不渲染 |
| 主题热度 | 研报关键事由和观点 | 横向柱状 | 无有效数据时不渲染 |
| 成长逻辑 | 基础资料、研报摘要、有效片段和机构预测口径 | 段落卡片/表格 | 无有效证据时不渲染 |
| 竞争位置 | 产业链位置、技术路线、客户认证、交付能力、规模或同业比较证据 | 段落卡片/关系图 | 无有效证据时不渲染 |
| 公司业务映射 | 主营业务和研报主题 | 矩阵/关系图 | 无有效数据时不渲染 |
| 风险矩阵 | 研报风险提示 | 矩阵卡片 | 无有效数据时不渲染 |
| 机构共识 | 观点聚类总结、推导依据、共识机构 | 段落卡片 | 无具体共同内容时不渲染 |
| 机构分歧 | 各方观点、原因、对应机构、待验证变量 | 段落卡片 | 无具体差异时不渲染 |
| 研报原文片段 | 有效研报片段摘要 | 段落卡片/表格 | 无有效片段时不渲染 |
| 业绩预期汇总 | 机构研报业绩预测内容与派生数据总结 | 总结卡片 + 横向滚动表格 | 无有效预测样本时不渲染 |
| 证据表 | 研报日期、标题、核心内容、观点和风险 | 表格 | 无有效数据时不渲染 |
