const bodyEl = document.body;
const API_BASE = bodyEl.dataset.apiBase || "./api/";

const state = {
  metric: "throughput",
  floor: null,
  band: null,
  topology: "both",
  threshold: 500,
  routers: [],
  allRouters: [],
  payload: null,
  options: null,
  labelMap: {},
  routerOptions: [],
};
function normalizeRouterKey(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}
const ROUTER_LINKS = {
  KVD21: "https://www.t-mobile.com/support/home-internet/arcadyan-gateway",
  SAGEMCOM: "https://www.t-mobile.com/support/home-internet/sagemcom-gateway",
  TMO_G4AR: "https://www.t-mobile.com/support/home-internet/5g-gateway-g4ar",
  TMO_G4SE: "https://www.t-mobile.com/support/home-internet/5g-gateway-g4ar",
  TMO_G5AR: "https://www.t-mobile.com/support/home-internet/5g-gateway-g5",
};
const COLORS = [
  "#9b5cff",
  "#00d5ff",
  "#ff2fb3",
  "#ff8a00",
  "#ffd400",
  "#2f7bff",
];

const CHART_IDS = [
  "chart-line",
  "chart-bar",
  "chart-radar",
  "chart-dropoff",
  "chart-heatmap-mesh",
  "chart-heatmap-nomesh",
  "chart-cdf",
  "chart-rank-mesh",
  "chart-rank-nomesh",
];

const PALETTE = [
  { mesh: "#9b5cff", nomesh: "#00d5ff", gain: "rgba(155,92,255,0.22)" },
  { mesh: "#ff2fb3", nomesh: "#2f7bff", gain: "rgba(255,47,179,0.20)" },
  { mesh: "#ff8a00", nomesh: "#ffd400", gain: "rgba(255,138,0,0.20)" },
  { mesh: "#00d5ff", nomesh: "#9b5cff", gain: "rgba(0,213,255,0.18)" },
  { mesh: "#ffd400", nomesh: "#ff2fb3", gain: "rgba(255,212,0,0.18)" },
  { mesh: "#2f7bff", nomesh: "#36e7a1", gain: "rgba(47,123,255,0.18)" },
];

const PLOTLY_BASE = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(20, 16, 38, 0.48)",
  font: {
    color: "#eef3ff",
    family: "Inter, Arial, sans-serif",
    size: 14,
  },
  margin: { l: 52, r: 20, t: 14, b: 70 },
  legend: {
    orientation: "h",
    yanchor: "top",
    y: -0.16,
    xanchor: "left",
    x: 0,
    bgcolor: "rgba(0,0,0,0)",
    font: {
      family: "Inter, Arial, sans-serif",
      size: 11,
      color: "#dfe7ff",
    },
    itemwidth: 30,
  },
  hoverlabel: {
    bgcolor: "#151327",
    bordercolor: "rgba(155,92,255,0.28)",
    font: {
      family: "Inter, Arial, sans-serif",
      color: "#f8fbff",
      size: 12,
    },
  },
  xaxis: {
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.06)",
    tickfont: { size: 11, color: "#dfe7ff" },
    titlefont: { size: 13, color: "#f8fbff" },
    automargin: true,
  },
  yaxis: {
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.06)",
    tickfont: { size: 11, color: "#dfe7ff" },
    titlefont: { size: 13, color: "#f8fbff" },
    automargin: true,
  },
};

const CFG = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
};

function apiUrl(path) {
  return `${API_BASE.replace(/\/?$/, "/")}${path.replace(/^\//, "")}`;
}

function getEl(id) {
  return document.getElementById(id);
}

function routerDisplayName(name) {
  if (!name) return "";
  return String(name).replace(/_/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function routerLabel(name) {
  return state.labelMap[name] || routerDisplayName(name);
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function routerUrl(routerName) {
  return ROUTER_LINKS[normalizeRouterKey(routerName)] || "";
}

function routerAnchorHtml(routerName) {
  const label = escapeHtml(routerLabel(routerName));
  const url = routerUrl(routerName);

  if (!url) return label;

  return `
    <a
      href="${url}"
      target="_blank"
      rel="noopener noreferrer"
      style="color: inherit; text-decoration: underline; text-underline-offset: 3px;"
    >
      ${label}
    </a>
  `;
}
function topologyLabel(value) {
  if (value === "with_mesh") return "Mesh";
  if (value === "without_mesh") return "Standalone";
  return "Both";
}

function showLoading(id) {
  const el = getEl(id);
  if (!el) return;
  el.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>
  `;
}

function showError(message) {
  const el = getEl("error-banner");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
}

function hideError() {
  const el = getEl("error-banner");
  if (!el) return;
  el.style.display = "none";
}

function clearChart(target) {
  const el = typeof target === "string" ? getEl(target) : target;
  if (!el) return null;

  try {
    Plotly.purge(el);
  } catch (err) {
    // ignore on first render
  }

  el.innerHTML = "";
  return el;
}

function renderPlot(target, data, layout, config = CFG) {
  const el = clearChart(target);
  if (!el) return;
  return Plotly.react(el, data, layout, config);
}

function renderEmptyState(target, message, height = 300) {
  return renderPlot(
    target,
    [],
    {
      ...PLOTLY_BASE,
      height,
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [
        {
          text: message,
          showarrow: false,
          font: { color: "#94a3b8", size: 16 },
        },
      ],
    },
    CFG
  );
}

function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function mean(values) {
  const filtered = values.filter(isNum);
  if (!filtered.length) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

function sortFloors(arr) {
  const order = { "Ground Floor": 0, "Lower Floor": 1, "Upper Floor": 2 };
  return [...arr].sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
}

function sortBands(arr) {
  const order = { "2.4 GHz": 0, "5 GHz": 1 };
  return [...arr].sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
}

function setMetricThresholdDefaults() {
  const slider = getEl("threshold-slider");
  const label = getEl("threshold-label");
  if (!slider || !label) return;

  if (state.metric === "signal_strength") {
    slider.min = "-90";
    slider.max = "-30";
    slider.step = "1";
    if (state.threshold > -30 || state.threshold < -90 || Number.isNaN(state.threshold)) {
      state.threshold = -70;
    }
  } else {
    slider.min = "0";
    slider.max = "1500";
    slider.step = "25";
    if (state.threshold < 0 || state.threshold > 1500 || Number.isNaN(state.threshold)) {
      state.threshold = 500;
    }
  }

  slider.value = String(state.threshold);
  label.textContent = String(state.threshold);
}

function formatPillLabel(value, stateKey) {
  if (stateKey === "metric") {
    const val = String(value).toLowerCase();
    // This catches "signal", "signal_strength", or "RSSI" regardless of casing
    if (val.includes("signal") || val === "rssi") {
      return "RSSI";
    }
    if (val === "throughput") return "Throughput";
  }
  if (stateKey === "topology") return topologyLabel(value);
  return value;
}

function getSignalQualityLabel(value) {
  if (!isNum(value)) return "";
  if (value >= -50) return "Excellent";
  if (value >= -60) return "Good";
  if (value >= -70) return "Weak";
  return "Poor";
}

function formatMetricValue(value, unit, includeQuality = false) {
  if (!isNum(value)) return "—";

  const base = `${value.toFixed(1)} ${unit}`;

  if (includeQuality && state.metric === "signal_strength") {
    return `${base} (${getSignalQualityLabel(value)})`;
  }

  return base;
}

function buildPills(containerId, values, stateKey) {
  const container = getEl(containerId);
  if (!container) return;

  container.innerHTML = "";

  values.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.dataset.val = value;
    btn.textContent = formatPillLabel(value, stateKey);

    btn.onclick = async () => {
      state[stateKey] = value;
      setActivePills(containerId, value);

      if (stateKey === "metric") {
        setMetricThresholdDefaults();
      }

      await refresh();
    };

    container.appendChild(btn);
  });
}

function setActivePills(containerId, activeVal) {
  document.querySelectorAll(`#${containerId} .pill`).forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.val === activeVal);
  });
}

function updateRouterDropdownLabel() {
  const labelEl = getEl("router-dropdown-label");
  if (!labelEl) return;

  if (!state.routers.length) {
    labelEl.textContent = "Select router(s)";
    return;
  }

  if (state.routers.length === 1) {
    labelEl.textContent = routerLabel(state.routers[0]);
    return;
  }

  labelEl.textContent = `${state.routers.length} routers selected`;
}

function buildRouterSelect(routers) {
  const optionsWrap = getEl("router-options");
  if (!optionsWrap) return;

  const selectedSet = new Set(state.routers);
  optionsWrap.innerHTML = "";

  routers.forEach((router) => {
    const row = document.createElement("div");
row.className = "dropdown-option";

const checkbox = document.createElement("input");
checkbox.type = "checkbox";
checkbox.value = router;
checkbox.checked = selectedSet.has(router);

checkbox.addEventListener("change", () => {
  const checked = Array.from(
    optionsWrap.querySelectorAll('input[type="checkbox"]:checked')
  ).map((el) => el.value);

  state.routers = checked;

  if (!state.routers.length && routers.length) {
    state.routers = [routers[0]];
    buildRouterSelect(routers);
  }

  updateRouterDropdownLabel();
  renderAll();
});

const link = document.createElement("a");
link.href = routerUrl(router);
link.target = "_blank";
link.rel = "noopener noreferrer";
link.textContent = routerLabel(router);
link.style.color = "inherit";
link.style.textDecoration = "underline";
link.style.textUnderlineOffset = "3px";

if (!routerUrl(router)) {
  link.removeAttribute("href");
  link.removeAttribute("target");
  link.removeAttribute("rel");
  link.style.textDecoration = "none";
  link.style.cursor = "default";
}

row.appendChild(checkbox);
row.appendChild(link);
optionsWrap.appendChild(row);
  });

  updateRouterDropdownLabel();
}

function bindStaticControls() {
  const slider = getEl("threshold-slider");
  const btnSelectAll = getEl("btn-select-all");
  const btnClear = getEl("btn-clear");
  const dropdownTrigger = getEl("router-dropdown-trigger");
  const dropdownMenu = getEl("router-dropdown-menu");

  if (dropdownTrigger && dropdownMenu) {
    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      const dropdown = getEl("router-dropdown");
      if (dropdown && !dropdown.contains(e.target)) {
        dropdownMenu.classList.remove("open");
      }
    });
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      state.threshold = Number(e.target.value);
      const label = getEl("threshold-label");
      if (label) label.textContent = String(state.threshold);
    });

    slider.addEventListener("change", async () => {
      await refresh();
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener("click", () => {
      state.routers = state.allRouters.slice();
      buildRouterSelect(state.allRouters);
      renderAll();
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      state.routers = state.allRouters.length ? [state.allRouters[0]] : [];
      buildRouterSelect(state.allRouters);
      renderAll();
    });
  }
}

function drawDualRankings(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  const renderRank = (targetId, key, color) => {
    // Filter out routers missing data and sort high-to-low
    const sorted = [...rows]
      .filter(r => isNum(r[key]))
      .sort((a, b) => b[key] - a[key]);

    if (!sorted.length) {
      renderEmptyState(targetId, "No data available");
      return;
    }

    const values = sorted.map(r => r[key]);
    const labels = sorted.map(r => routerLabel(r.router));

    renderPlot(
      targetId,
      [{
        x: values,
        y: labels,
        type: "bar",
        orientation: "h",
        marker: { color: color },
        text: values.map(v => `${v.toFixed(1)}`),
        textposition: "outside",
        textfont: { size: 12, color: "#f8fafc" },
        cliponaxis: false,
        hovertemplate: `<b>%{y}</b><br>Avg: %{x:.1f} ${payload.meta.unit}<extra></extra>`,
      }],
      {
        ...PLOTLY_BASE,
        xaxis: { 
          ...PLOTLY_BASE.xaxis, 
          title: payload.meta.unit,
          range: [0, Math.max(...values) * 1.25] 
        },
        yaxis: { ...PLOTLY_BASE.yaxis, autorange: "reversed" },
        showlegend: false,
        margin: { l: 120, r: 60, t: 10, b: 50 },
        height: 320,
      }
    );
  };

  renderRank("chart-rank-mesh", "avg_mesh", "#9b5cff");
  renderRank("chart-rank-nomesh", "avg_nomesh", "#00d5ff");
}

function selectedRoutersFromPayload() {
  if (!state.payload) return [];
  const available = state.payload.routers || [];
  const selected = state.routers.filter((router) => available.includes(router));
  if (selected.length) return selected;
  return available.slice(0, Math.min(5, available.length));
}

function primaryRouter(selected) {
  return selected && selected.length ? selected[0] : null;
}

function currentMode() {
  return state.topology || "both";
}

function wantsMesh() {
  return currentMode() === "both" || currentMode() === "with_mesh";
}

function wantsNoMesh() {
  return currentMode() === "both" || currentMode() === "without_mesh";
}

function getSummaryRowMap(payload) {
  const map = {};
  (payload.summary || []).forEach((row) => {
    map[row.router] = row;
  });
  return map;
}

function renderBestRouter(payload, selected) {
  const nameEl = getEl("best-router-name");
  const reasonEl = getEl("best-router-reason");
  const metaEl = getEl("best-router-meta");

  if (!nameEl || !reasonEl || !metaEl) return;

  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    nameEl.textContent = "—";
    reasonEl.textContent = "No router data available for the current filters.";
    metaEl.textContent = "—";
    return;
  }

  let bestRow = null;
  let bestValue = null;

  if (currentMode() === "without_mesh") {
    bestRow = [...rows]
      .filter((r) => isNum(r.avg_nomesh))
      .sort((a, b) => b.avg_nomesh - a.avg_nomesh)[0];
    bestValue = bestRow?.avg_nomesh ?? null;
  } else {
    bestRow = [...rows]
      .filter((r) => isNum(r.avg_mesh))
      .sort((a, b) => b.avg_mesh - a.avg_mesh)[0];
    bestValue = bestRow?.avg_mesh ?? null;
  }

  if (!bestRow || !isNum(bestValue)) {
    nameEl.textContent = "—";
    reasonEl.textContent = "No router has enough data for this view.";
    metaEl.textContent = "—";
    return;
  }

  nameEl.innerHTML = routerAnchorHtml(bestRow.router);

  if (currentMode() === "without_mesh") {
    reasonEl.textContent = `Best standalone average on ${payload.meta.band} at ${payload.meta.floor}.`;
    metaEl.textContent = `Average: ${formatMetricValue(bestRow.avg_nomesh, payload.meta.unit, true)}`;
    return;
  }

  const boostText = isNum(bestRow.gain_abs)
    ? ` · Mesh Boost: ${bestRow.gain_abs >= 0 ? "+" : ""}${bestRow.gain_abs.toFixed(1)} ${payload.meta.unit}`
    : "";

  reasonEl.textContent = `Best mesh-assisted average on ${payload.meta.band} at ${payload.meta.floor}.`;
  metaEl.textContent = `Average: ${formatMetricValue(bestRow.avg_mesh, payload.meta.unit, true)}${boostText}`;
}

function getComparisonSeries(payload, router) {
  const compare = payload.series_compare?.[router];
  if (compare) {
    return {
      mesh: compare.with_mesh || [],
      nomesh: compare.without_mesh || [],
      gain: compare.gain || [],
    };
  }

  const primary = payload.series?.[router] || [];
  return { mesh: primary, nomesh: [], gain: [] };
}

function updateHero(payload, selected) {
  const unit = payload.meta.unit;
  const bMetric = getEl("b-metric");
  const bFloor = getEl("b-floor");
  const bBand = getEl("b-band");
  const bThreshold = getEl("b-threshold");
  const bRouters = getEl("b-routers");
  const bTopology = getEl("b-topology");

  if (bMetric) {
    const currentMetric = String(payload.meta.metric).toLowerCase();
    bMetric.textContent =
      currentMetric === "throughput" ? "Throughput" : "RSSI"; 
  }
  if (bFloor) bFloor.textContent = payload.meta.floor;
  if (bBand) bBand.textContent = payload.meta.band;
  if (bThreshold) bThreshold.textContent = `Threshold ${payload.meta.threshold} ${unit}`;
  if (bRouters) bRouters.textContent = `${selected.length} router(s) selected`;
  if (bTopology) bTopology.textContent = topologyLabel(state.topology);
}

function updateKPIs(payload, selected) {
  const unit = payload.meta.unit;
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  const primaryAvgKey = wantsMesh() ? "avg_mesh" : "avg_nomesh";
  const primaryPeakKey = wantsMesh() ? "peak_mesh" : "peak_nomesh";
  const primaryCovKey = wantsMesh() ? "coverage_mesh" : "coverage_nomesh";

  const avgPrimary = mean(rows.map((r) => r[primaryAvgKey]));
  const avgSecondary = mean(rows.map((r) => (wantsMesh() ? r.avg_nomesh : r.avg_mesh)));
  const peakPrimary = Math.max(
    ...rows.map((r) => (isNum(r[primaryPeakKey]) ? r[primaryPeakKey] : -Infinity))
  );
  const gainPctAll = mean(rows.map((r) => r.gain_pct));
  const covPrimary = mean(rows.map((r) => r[primaryCovKey]));
  const covSecondary = mean(rows.map((r) => (wantsMesh() ? r.coverage_nomesh : r.coverage_mesh)));
  const totalRouters = payload.routers.length;

  const elBestMesh = getEl("kpi-best-mesh");
  const elBestMeshRouter = getEl("kpi-best-mesh-router");
  const elAvgMesh = getEl("kpi-avg-mesh");
  const elAvgNomesh = getEl("kpi-avg-nomesh");
  const elBestGain = getEl("kpi-best-gain");
  const elBestGainRouter = getEl("kpi-best-gain-router");
  const elBestCoverage = getEl("kpi-best-coverage");
  const elBestCoverageRouter = getEl("kpi-best-coverage-router");
  const elRouterCount = getEl("kpi-router-count");
  const elTotalRouterCount = getEl("kpi-total-router-count");

  const bestAvgRow = [...rows]
    .filter((r) => isNum(r[primaryAvgKey]))
    .sort((a, b) => b[primaryAvgKey] - a[primaryAvgKey])[0];

  const bestGainRow = [...rows]
    .filter((r) => isNum(r.gain_pct))
    .sort((a, b) => b.gain_pct - a.gain_pct)[0];

  const bestCoverageRow = [...rows]
    .filter((r) => isNum(r[primaryCovKey]))
    .sort((a, b) => b[primaryCovKey] - a[primaryCovKey])[0];

  if (elBestMesh) {
    if (currentMode() === "both") {
      elBestMesh.textContent = avgPrimary != null ? `${avgPrimary.toFixed(1)} ${unit}` : "—";
    } else {
      elBestMesh.textContent = peakPrimary !== -Infinity ? `${peakPrimary.toFixed(1)} ${unit}` : "—";
    }
  }

  if (elBestMeshRouter) {
    if (currentMode() === "both") {
      elBestMeshRouter.textContent =
        bestAvgRow ? `${routerLabel(bestAvgRow.router)} best average` : "—";
    } else {
      elBestMeshRouter.textContent = currentMode() === "with_mesh" ? "Mesh mode" : "No-mesh mode";
    }
  }

  if (elAvgMesh) {
    elAvgMesh.textContent = avgPrimary != null ? `${avgPrimary.toFixed(1)} ${unit}` : "—";
  }

  if (elAvgNomesh) {
    if (currentMode() === "both") {
      elAvgNomesh.textContent =
        avgSecondary != null
          ? `${wantsMesh() ? "Without mesh" : "With mesh"}: ${avgSecondary.toFixed(1)} ${unit}`
          : `${wantsMesh() ? "Without mesh" : "With mesh"}: —`;
    } else {
      elAvgNomesh.textContent = currentMode() === "with_mesh" ? "Mode: Mesh" : "Mode: No mesh";
    }
  }

  if (elBestGain) {
    if (currentMode() === "both") {
      elBestGain.textContent = gainPctAll != null ? `${gainPctAll >= 0 ? "+" : ""}${gainPctAll.toFixed(1)}%` : "—";
    } else {
      elBestGain.textContent = "—";
    }
  }

  if (elBestGainRouter) {
    if (currentMode() === "both") {
      elBestGainRouter.textContent = bestGainRow ? routerLabel(bestGainRow.router) : "—";
    } else {
      elBestGainRouter.textContent = "Comparison needs both";
    }
  }

  if (elBestCoverage) {
    elBestCoverage.textContent = covPrimary != null ? `${covPrimary.toFixed(1)}/8` : "—";
  }

  if (elBestCoverageRouter) {
    if (currentMode() === "both") {
      elBestCoverageRouter.textContent =
        covSecondary != null ? `No mesh: ${covSecondary.toFixed(1)}/8` : "No mesh: —";
    } else {
      elBestCoverageRouter.textContent = bestCoverageRow ? routerLabel(bestCoverageRow.router) : "—";
    }
  }

  if (elRouterCount) elRouterCount.textContent = String(selected.length);
  if (elTotalRouterCount) elTotalRouterCount.textContent = `Total loaded: ${totalRouters}`;

  const labelBestMesh = document.querySelector(".kpi-row .kpi:nth-child(1) .kpi-label");
  const labelAvg = document.querySelector(".kpi-row .kpi:nth-child(2) .kpi-label");
  const labelGain = document.querySelector(".kpi-row .kpi:nth-child(3) .kpi-label");
  const labelCoverage = document.querySelector(".kpi-row .kpi:nth-child(4) .kpi-label");

  if (labelBestMesh) {
    labelBestMesh.textContent =
      currentMode() === "both"
        ? "Selected avg with mesh"
        : currentMode() === "with_mesh"
        ? "Selected avg with mesh"
        : "Selected avg without mesh";
  }

  if (labelAvg) {
    labelAvg.textContent =
      currentMode() === "both"
        ? "Selected avg without mesh"
        : currentMode() === "with_mesh"
        ? "Selected peak with mesh"
        : "Selected peak without mesh";
  }

  if (labelGain) {
    labelGain.textContent = currentMode() === "both" ? "Avg mesh improvement %" : "Comparison gain %";
  }

  // if (labelCoverage) {
  //   labelCoverage.textContent = "Avg coverage bands";
  // }
}

function updateTable(payload, selected) {
  const tbody = getEl("summary-tbody");
  if (!tbody) return;

  const rowMap = getSummaryRowMap(payload);
  const rows = selected
    .map((router) => rowMap[router])
    .filter(Boolean)
    .sort((a, b) => {
      const aVal =
        currentMode() === "without_mesh"
          ? (a.avg_nomesh ?? -Infinity)
          : currentMode() === "with_mesh"
          ? (a.avg_mesh ?? -Infinity)
          : (a.gain_abs ?? a.avg_mesh ?? -Infinity);

      const bVal =
        currentMode() === "without_mesh"
          ? (b.avg_nomesh ?? -Infinity)
          : currentMode() === "with_mesh"
          ? (b.avg_mesh ?? -Infinity)
          : (b.gain_abs ?? b.avg_mesh ?? -Infinity);

      return bVal - aVal;
    });

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No data available</td></tr>`;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${routerAnchorHtml(row.router)}</td>
      <td>${formatMetricValue(row.avg_mesh, payload.meta.unit, true)}</td>
      <td>${formatMetricValue(row.avg_nomesh, payload.meta.unit, true)}</td>
      <td>${isNum(row.gain_abs) ? `${row.gain_abs >= 0 ? "+" : ""}${row.gain_abs.toFixed(1)} ${payload.meta.unit}` : "—"}</td>
      <td>${formatMetricValue(row.peak_mesh, payload.meta.unit, true)}</td>
      <td>${isNum(row.coverage_mesh) ? `${row.coverage_mesh}/8` : "—"}</td>
      <td>${isNum(row.drop_mesh_total) ? `${row.drop_mesh_total.toFixed(1)} ${payload.meta.unit}` : "—"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function drawLine(payload, selected) {
  const unit = payload.meta.unit;
  const distances = payload.meta.distances || [];

  if (!distances.length || !selected.length) {
    renderEmptyState("chart-line", "No distance profile data available", 480);
    return;
  }

  const traces = [];

  selected.forEach((router, index) => {
    const label = routerLabel(router);
    const colors = PALETTE[index % PALETTE.length];
    const { mesh, nomesh, gain } = getComparisonSeries(payload, router);

    const hasMesh = mesh.some(isNum);
    const hasNomesh = nomesh.some(isNum);
    const hasGain = gain.some(isNum);

    if (hasGain && currentMode() === "both") {
      traces.push({
        x: distances,
        y: gain,
        type: "bar",
        name: `${label}`,
        yaxis: "y2",
        marker: {
          color: colors.gain,
          line: { width: 0 },
        },
        opacity: 0.55,
        hovertemplate:
          `<b>${label}</b><br>` +
          `Gain: %{y:.1f} ${unit}<br>` +
          `%{x} ft<extra></extra>`,
      });
    }

    if (hasMesh && wantsMesh()) {
      traces.push({
        x: distances,
        y: mesh,
        type: "scatter",
        mode: "lines+markers",
        name: `${label} · Mesh`,
        line: {
          color: colors.mesh,
          width: 3.5,
          shape: "spline",
          smoothing: 0.7,
        },
        marker: {
          size: 7,
          color: colors.mesh,
          line: { color: "#0b1020", width: 1.2 },
        },
        hovertemplate:
          `<b>${label}</b><br>` +
          `Mesh: %{y:.1f} ${unit}<br>` +
          `%{x} ft<extra></extra>`,
      });
    }

    if (hasNomesh && wantsNoMesh()) {
      traces.push({
        x: distances,
        y: nomesh,
        type: "scatter",
        mode: "lines+markers",
        name: `${label} · Standalone`,
        line: {
          color: colors.nomesh,
          width: 2.4,
          dash: "dot",
          shape: "spline",
          smoothing: 0.7,
        },
        marker: {
          size: 5.5,
          color: colors.nomesh,
          line: { color: "#0b1020", width: 1 },
        },
        opacity: 0.95,
        hovertemplate:
          `<b>${label}</b><br>` +
          `Standalone: %{y:.1f} ${unit}<br>` +
          `%{x} ft<extra></extra>`,
      });
    }
  });

  if (!traces.length) {
    renderEmptyState("chart-line", "No distance profile data available", 480);
    return;
  }

  const valueSeries = traces
    .filter((t) => t.yaxis !== "y2")
    .flatMap((t) => (Array.isArray(t.y) ? t.y : []))
    .filter(isNum);

  const gainSeries = traces
    .filter((t) => t.yaxis === "y2")
    .flatMap((t) => (Array.isArray(t.y) ? t.y : []))
    .filter(isNum);

  let yMin = 0;
  let yMax = 100;

  if (valueSeries.length) {
    const rawMin = Math.min(...valueSeries);
    const rawMax = Math.max(...valueSeries);

    if (payload.meta.metric === "signal_strength") {
      yMin = Math.floor(rawMin - 5);
      yMax = Math.ceil(rawMax + 3);
    } else {
      yMin = Math.max(0, Math.floor(rawMin * 0.85));
      yMax = Math.ceil(rawMax * 1.08);
    }
  }

  const gainMin = gainSeries.length ? Math.min(...gainSeries) : 0;
  const gainMax = gainSeries.length ? Math.max(...gainSeries) : 10;

  renderPlot(
    "chart-line",
    traces,
    {
      ...PLOTLY_BASE,
      height: 480,
      barmode: "overlay",
      margin: { l: 64, r: 60, t: 20, b: 128 },
      xaxis: {
        ...PLOTLY_BASE.xaxis,
        title: "Distance from router (ft)",
        tickvals: distances,
        ticktext: distances.map((d) => `${d} ft`),
      },
      yaxis: {
        ...PLOTLY_BASE.yaxis,
        title: unit,
        range: [yMin, yMax],
      },
      yaxis2: {
        title: `Gain (${unit})`,
        titlefont: { size: 17, color: "#cbd5e1" },
        tickfont: { size: 14, color: "#94a3b8" },
        overlaying: "y",
        side: "right",
        showgrid: false,
        zeroline: false,
        color: "#94a3b8",
        range: [
          Math.min(0, Math.floor(gainMin * 1.1)),
          Math.max(5, Math.ceil(gainMax * 1.15)),
        ],
      },
      legend: {
        orientation: "h",
        yanchor: "top",
        y: -0.24,
        xanchor: "left",
        x: 0,
        bgcolor: "rgba(0,0,0,0)",
        font: { size: 13, color: "#dbe4ff" },
      },
      hovermode: "closest",
      hoverlabel: {
        bgcolor: "#0f172a",
        bordercolor: "#334155",
        font: { color: "#f8fafc", size: 14 },
      },
      shapes:
        payload.meta.threshold != null
          ? [
              {
                type: "line",
                x0: distances[0],
                x1: distances[distances.length - 1],
                y0: payload.meta.threshold,
                y1: payload.meta.threshold,
                line: { color: "#fbbf24", width: 1.8, dash: "dash" },
              },
            ]
          : [],
      annotations:
        payload.meta.threshold != null
          ? [
              {
                x: distances[distances.length - 1],
                y: payload.meta.threshold,
                xanchor: "right",
                yanchor: "bottom",
                text: `Threshold ${Math.round(payload.meta.threshold)} ${unit}`,
                showarrow: false,
                font: { size: 13, color: "#fde68a" },
                bgcolor: "rgba(15,23,42,0.86)",
                bordercolor: "rgba(245,158,11,0.35)",
                borderwidth: 1,
                borderpad: 5,
              },
            ]
          : [],
    },
    CFG
  );
}

function drawGroupedBar(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    renderEmptyState("chart-bar", "No average comparison data available", 420);
    return;
  }

  const labels = rows.map((r) => routerLabel(r.router));
  const traces = [];

  if (wantsMesh()) {
    const vals = rows.map((r) => r.avg_mesh ?? r.avg ?? null);
    traces.push({
      x: labels,
      y: vals,
      type: "bar",
      name: "Mesh",
      marker: { color: "#9b5cff" },
      // text: vals.map((v) => (v != null ? `${Math.round(v)}` : "")),
      // textposition: "outside",
      // textfont: { size: 14, color: "#f8fafc" },
      // cliponaxis: false,
      hovertemplate: "%{x}<br>Mesh: %{y:.1f} " + payload.meta.unit + "<extra></extra>",
    });
  }

  if (wantsNoMesh()) {
    const vals = rows.map((r) => r.avg_nomesh ?? null);
    traces.push({
      x: labels,
      y: vals,
      type: "bar",
      name: "Standalone",
      marker: { color: "#00d5ff" },
      // text: vals.map((v) => (v != null ? `${Math.round(v)}` : "")),
      // textposition: "outside",
      // textfont: { size: 14, color: "#f8fafc" },
      // cliponaxis: false,
      hovertemplate: "%{x}<br>Standalone: %{y:.1f} " + payload.meta.unit + "<extra></extra>",
    });
  }

  renderPlot(
    "chart-bar",
    traces,
    {
      ...PLOTLY_BASE,
      barmode: "group",
      xaxis: {
        ...PLOTLY_BASE.xaxis,
        title: "Router",
        tickangle: 20,
        tickfont: { size: 11 },
      },
      yaxis: {
        ...PLOTLY_BASE.yaxis,
        title: payload.meta.unit,
        tickfont: { size: 11 },
      },
      height: 360,
      margin: { l: 58, r: 18, t: 14, b: 88 },
    },
    CFG
  );
}

function drawAreaCoverage(payload, selected) {
  const router = primaryRouter(selected);
  const distances = payload.meta.distances || [];
  const unit = payload.meta.unit;

  if (!router || !distances.length) {
    renderEmptyState("chart-area", "No spotlight data available", 360);
    return;
  }

  const label = routerLabel(router);
  const { mesh, nomesh } = getComparisonSeries(payload, router);
  const traces = [];

  if (wantsMesh() && mesh.some(isNum)) {
    traces.push({
      x: distances,
      y: mesh,
      type: "scatter",
      mode: "lines+markers",
      name: `${label} · Mesh`,
      line: { color: "#8b5cf6", width: 3.2, shape: "spline", smoothing: 0.8 },
      marker: { size: 6.5, color: "#8b5cf6" },
      fill: "tozeroy",
      fillcolor: "rgba(139,92,246,0.16)",
      hovertemplate: `<b>${label}</b><br>Mesh: %{y:.1f} ${unit}<br>%{x} ft<extra></extra>`,
    });
  }

  if (wantsNoMesh() && nomesh.some(isNum)) {
    traces.push({
      x: distances,
      y: nomesh,
      type: "scatter",
      mode: "lines+markers",
      name: `${label} · Standalone`,
      line: { color: "#38bdf8", width: 2.2, dash: "dot", shape: "spline", smoothing: 0.8 },
      marker: { size: 5.5, color: "#38bdf8" },
      fill: "tozeroy",
      fillcolor: "rgba(56,189,248,0.10)",
      hovertemplate: `<b>${label}</b><br>Standalone: %{y:.1f} ${unit}<br>%{x} ft<extra></extra>`,
    });
  }

  if (!traces.length) {
    renderEmptyState("chart-area", "No spotlight data available", 360);
    return;
  }

  renderPlot(
    "chart-area",
    traces,
    {
      ...PLOTLY_BASE,
      xaxis: {
        ...PLOTLY_BASE.xaxis,
        title: "Distance from router (ft)",
        tickvals: distances,
        ticktext: distances.map((d) => `${d} ft`),
      },
      yaxis: { ...PLOTLY_BASE.yaxis, title: unit },
      hovermode: "x unified",
      height: 360,
      shapes:
        payload.meta.threshold != null
          ? [
              {
                type: "line",
                x0: distances[0],
                x1: distances[distances.length - 1],
                y0: payload.meta.threshold,
                y1: payload.meta.threshold,
                line: { color: "#fbbf24", width: 1.5, dash: "dash" },
              },
            ]
          : [],
    },
    CFG
  );
}

function drawCoverageDonut(payload, selected) {
  const router = primaryRouter(selected);
  const rowMap = getSummaryRowMap(payload);
  const row = router ? rowMap[router] : null;

  if (!row) {
    renderEmptyState("chart-donut", "No donut data available", 360);
    return;
  }

  let labels = [];
  let values = [];
  let colors = [];

  if (currentMode() === "both") {
    labels = ["Mesh", "Standalone"];
    values = [Math.max(0, row.coverage_mesh ?? row.coverage ?? 0), Math.max(0, row.coverage_nomesh ?? 0)];
    colors = ["#8b5cf6", "#38bdf8"];
  } else if (currentMode() === "with_mesh") {
    labels = ["Mesh"];
    values = [Math.max(0, row.coverage_mesh ?? row.coverage ?? 0)];
    colors = ["#8b5cf6"];
  } else {
    labels = ["Standalone"];
    values = [Math.max(0, row.coverage_nomesh ?? 0)];
    colors = ["#38bdf8"];
  }

  renderPlot(
    "chart-donut",
    [
      {
        type: "pie",
        labels,
        values,
        hole: 0.62,
        sort: false,
        direction: "clockwise",
        textinfo: "label+value",
        textposition: "outside",
        textfont: { size: 14, color: "#f8fafc" },
        marker: { colors },
        hovertemplate: "%{label}<br>Coverage bands: %{value}<extra></extra>",
      },
    ],
    {
      ...PLOTLY_BASE,
      showlegend: false,
      margin: { l: 24, r: 24, t: 18, b: 24 },
      height: 360,
      annotations: [
        {
          text: `${routerLabel(row.router)}<br><span style="font-size:13px;color:#94a3b8">coverage view</span>`,
          showarrow: false,
          font: { color: "#e5e7eb", size: 16 },
        },
      ],
    },
    CFG
  );
}

function drawRadar(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    renderEmptyState("chart-radar", "No radar data available", 350);
    return;
  }

  const avgKey = wantsMesh() ? "avg_mesh" : "avg_nomesh";
  const peakKey = wantsMesh() ? "peak_mesh" : "peak_nomesh";
  const covKey = wantsMesh() ? "coverage_mesh" : "coverage_nomesh";
  const dropKey = wantsMesh() ? "drop_mesh_total" : "drop_nomesh_total";
  const consistencyKey = wantsMesh() ? "consistency_mesh" : "consistency_nomesh";

  const cats = ["Average", "Peak", "Coverage", "Low drop", "Consistency"];

  const normalize = (values) => {
    const valid = values.filter(isNum);
    if (!valid.length) return values.map(() => 50);
    const mn = Math.min(...valid);
    const mx = Math.max(...valid);
    if (mx === mn) return values.map(() => 50);
    return values.map((v) => (isNum(v) ? ((v - mn) / (mx - mn)) * 100 : 0));
  };

  const avgNorm = normalize(rows.map((r) => r[avgKey] ?? 0));
  const peakNorm = normalize(rows.map((r) => r[peakKey] ?? 0));
  const covNorm = normalize(rows.map((r) => r[covKey] ?? 0));
  const dropNorm = normalize(rows.map((r) => r[dropKey] ?? 0)).map((v) => 100 - v);
  const consNorm = normalize(rows.map((r) => r[consistencyKey] ?? 0)).map((v) => 100 - v);

  const traces = rows.map((row, index) => {
    const vals = [avgNorm[index], peakNorm[index], covNorm[index], dropNorm[index], consNorm[index]];
    return {
      type: "scatterpolar",
      r: [...vals, vals[0]],
      theta: [...cats, cats[0]],
      name: routerLabel(row.router),
      fill: "toself",
      opacity: 0.32,
      line: { color: COLORS[index % COLORS.length], width: 2.4 },
    };
  });

  renderPlot(
    "chart-radar",
    traces,
    {
      ...PLOTLY_BASE,
      polar: {
        bgcolor: "#0f172a",
        radialaxis: {
          visible: true,
          range: [0, 100],
          gridcolor: "rgba(255,255,255,0.1)",
          tickfont: { size: 13, color: "#cbd5e1" },
        },
        angularaxis: {
          gridcolor: "rgba(255,255,255,0.1)",
          tickfont: { size: 15, color: "#e5e7eb" },
        },
      },
      height: 350,
    },
    CFG
  );
}

function drawCoverage(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    renderEmptyState("chart-coverage", "No coverage comparison data available", 340);
    return;
  }

  const labels = rows.map((r) => routerLabel(r.router));
  const traces = [];

  if (wantsMesh()) {
    traces.push({
      x: labels,
      y: rows.map((r) => r.coverage_mesh ?? r.coverage ?? 0),
      type: "bar",
      name: "Mesh",
      marker: { color: "#8b5cf6" },
      // text: rows.map((r) => `${r.coverage_mesh ?? r.coverage ?? 0}`),
      // textposition: "outside",
      // textfont: { size: 13, color: "#f8fafc" },
      // cliponaxis: false,
      hovertemplate: "%{x}<br>Mesh: %{y}/8 bands<extra></extra>",
    });
  }

  if (wantsNoMesh()) {
    traces.push({
      x: labels,
      y: rows.map((r) => r.coverage_nomesh ?? 0),
      type: "bar",
      name: "Standalone",
      marker: { color: "#38bdf8" },
      // text: rows.map((r) => `${r.coverage_nomesh ?? 0}`),
      // textposition: "outside",
      // textfont: { size: 13, color: "#f8fafc" },
      // cliponaxis: false,
      hovertemplate: "%{x}<br>Standalone: %{y}/8 bands<extra></extra>",
    });
  }

  renderPlot(
    "chart-coverage",
    traces,
    {
  ...PLOTLY_BASE,
  barmode: "group",
  xaxis: {
          ...PLOTLY_BASE.xaxis,
          title: "Router",
          tickangle: 22,
          tickfont: { size: 11 },
        },
        yaxis: {
          ...PLOTLY_BASE.yaxis,
          title: "Usable bands",
          range: [0, 8.8],
          tickfont: { size: 11 },
        },
        legend: {
          ...PLOTLY_BASE.legend,
          y: -0.18,
          font: { size: 11, color: "#dbe4ff" },
        },
        height: 320,
        margin: { l: 58, r: 16, t: 12, b: 92 },
      },
    CFG
  );
}

function drawDropoff(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    renderEmptyState("chart-dropoff", "No drop-off comparison data available", 340);
    return;
  }

  const labels = rows.map((r) => routerLabel(r.router));
  const traces = [];

  if (wantsMesh()) {
    traces.push({
      x: labels,
      y: rows.map((r) => r.drop_mesh_total ?? r.drop_total ?? 0),
      type: "bar",
      name: "Mesh",
      marker: { color: "#9b5cff" },
      hovertemplate: "%{x}<br>Mesh drop: %{y:.1f} " + payload.meta.unit + "<extra></extra>",
    });
  }

  if (wantsNoMesh()) {
    traces.push({
      x: labels,
      y: rows.map((r) => r.drop_nomesh_total ?? 0),
      type: "bar",
      name: "Standalone",
      marker: { color: "#22d3ee" },
      hovertemplate: "%{x}<br>Standalone drop: %{y:.1f} " + payload.meta.unit + "<extra></extra>",
    });
  }

  renderPlot(
    "chart-dropoff",
    traces,
    {
      ...PLOTLY_BASE,
      barmode: "group",
      xaxis: {
        ...PLOTLY_BASE.xaxis,
        title: "Router",
        tickangle: 22,
        tickfont: { size: 11 },
      },
      yaxis: {
        ...PLOTLY_BASE.yaxis,
        title: `Total drop (${payload.meta.unit})`,
        tickfont: { size: 11 },
      },
      legend: {
        ...PLOTLY_BASE.legend,
        y: -0.18,
        font: { size: 11, color: "#dbe4ff" },
      },
      height: 320,
      margin: { l: 58, r: 16, t: 12, b: 92 },
    },
    CFG
  );
}

function drawHeatmapCompare(payload, selected, mode, containerId) {
  const distances = payload.meta.distances || [];
  const unit = payload.meta.unit;

  if ((mode === "mesh" && !wantsMesh()) || (mode === "nomesh" && !wantsNoMesh())) {
    renderEmptyState(
      containerId,
      mode === "mesh"
        ? "Select Both or Mesh in the Topology filter to see this view"
        : "Select Both or Standalone in the Topology filter to see this view",
      320
    );
    return;
  }

  const z = selected.map((router) => {
    const s = getComparisonSeries(payload, router);
    const values = mode === "nomesh" ? (s.nomesh || []) : (s.mesh || []);
    return distances.map((_, i) => {
      const v = values[i];
      return isNum(v) ? v : null;
    });
  });

  const hasAnyData = z.some((row) => row.some(isNum));

  if (!hasAnyData) {
    renderEmptyState(
      containerId,
      mode === "nomesh"
        ? "No standalone comparison data available"
        : "No mesh heatmap data available",
      320
    );
    return;
  }

  const text = z.map((row) =>
    row.map((v) => (isNum(v) ? `${Math.round(v)}` : ""))
  );

  renderPlot(
    containerId,
    [
      {
        type: "heatmap",
        z,
        x: distances.map((d) => `${d} ft`),
        y: selected.map((router) => routerLabel(router)),
        text,
        texttemplate: "%{text}",
        textfont: { color: "#f8fafc", size: 13 },
        colorscale: [
          [0.0, "#0f172a"],
          [0.2, "#1d4ed8"],
          [0.45, "#7c3aed"],
          [0.7, "#a855f7"],
          [1.0, "#e9d5ff"],
        ],
        hovertemplate: "%{y}<br>%{x}<br>%{z:.1f} " + unit + "<extra></extra>",
        colorbar: {
          title: unit,
          titlefont: { size: 15 },
          tickfont: { size: 13 },
        },
      },
    ],
    {
      ...PLOTLY_BASE,
      xaxis: { ...PLOTLY_BASE.xaxis, title: "Distance from router" },
      yaxis: { ...PLOTLY_BASE.yaxis, title: "" },
      height: 320,
    },
    CFG
  );
}

function drawCDF(payload, selected) {
  const traces = [];
  const unit = payload.meta.unit;

  selected.forEach((router, index) => {
    const color = COLORS[index % COLORS.length];
    const label = routerLabel(router);
    const s = getComparisonSeries(payload, router);

    if (wantsMesh()) {
      const meshVals = [...(s.mesh || [])].filter(isNum).sort((a, b) => a - b);

      if (meshVals.length) {
        traces.push({
          x: meshVals,
          y: meshVals.map((_, i) => ((i + 1) / meshVals.length) * 100),
          type: "scatter",
          mode: "lines",
          name: `${label} · Mesh`,
          line: { color, width: 2.8 },
          hovertemplate: `${label}<br>Mesh: %{x:.1f} ${unit} → %{y:.1f}%<extra></extra>`,
        });
      }
    }

    if (wantsNoMesh()) {
      const nomeshVals = [...(s.nomesh || [])].filter(isNum).sort((a, b) => a - b);

      if (nomeshVals.length) {
        traces.push({
          x: nomeshVals,
          y: nomeshVals.map((_, i) => ((i + 1) / nomeshVals.length) * 100),
          type: "scatter",
          mode: "lines",
          name: `${label} · Standalone`,
          line: { color, width: 2.2, dash: "dot" },
          opacity: 0.82,
          hovertemplate: `${label}<br>Standalone: %{x:.1f} ${unit} → %{y:.1f}%<extra></extra>`,
        });
      }
    }
  });

  if (payload.meta.threshold != null) {
    traces.push({
      x: [payload.meta.threshold, payload.meta.threshold],
      y: [0, 100],
      type: "scatter",
      mode: "lines",
      name: "Threshold",
      line: { color: "#fbbf24", width: 1.5, dash: "dash" },
      hoverinfo: "skip",
    });
  }

  if (!traces.length) {
    renderEmptyState("chart-cdf", "No cumulative distribution data available", 300);
    return;
  }

  renderPlot(
    "chart-cdf",
    traces,
    {
      ...PLOTLY_BASE,
      xaxis: { ...PLOTLY_BASE.xaxis, title: unit },
      yaxis: { ...PLOTLY_BASE.yaxis, title: "% of distance bands", range: [0, 100] },
      height: 300,
    },
    CFG
  );
}

function drawRanking(payload, selected) {
  const rowMap = getSummaryRowMap(payload);
  const rows = selected.map((router) => rowMap[router]).filter(Boolean);

  if (!rows.length) {
    renderEmptyState("chart-rank", "No ranking data available", 280);
    return;
  }

  const useGain = currentMode() === "both" && rows.some((r) => isNum(r.gain_abs));
  const valueKey = wantsMesh() ? "avg_mesh" : "avg_nomesh";

  const sorted = [...rows].sort((a, b) => {
    const aVal = useGain ? (a.gain_abs ?? -Infinity) : (a[valueKey] ?? a.avg ?? -Infinity);
    const bVal = useGain ? (b.gain_abs ?? -Infinity) : (b[valueKey] ?? b.avg ?? -Infinity);
    return bVal - aVal;
  });

  const values = sorted.map((r) => (useGain ? (r.gain_abs ?? 0) : (r[valueKey] ?? r.avg ?? 0)));
  const labels = sorted.map((r) => routerLabel(r.router));
  const colors = values.map((v) => (useGain ? (v >= 0 ? "#34d399" : "#f87171") : "#8b5cf6"));

  renderPlot(
    "chart-rank",
    [
      {
        x: values,
        y: labels,
        type: "bar",
        orientation: "h",
        marker: { color: colors },
        text: values.map((v) => `${v.toFixed(1)}`),
        textposition: "outside",
        textfont: { size: 13, color: "#f8fafc" },
        cliponaxis: false,
        hovertemplate:
          "%{y}<br>" +
          (useGain ? "Gain" : "Average") +
          ": %{x:.1f} " +
          payload.meta.unit +
          "<extra></extra>",
      },
    ],
    {
      ...PLOTLY_BASE,
      xaxis: {
        ...PLOTLY_BASE.xaxis,
        title: useGain ? `Gain (${payload.meta.unit})` : `Average (${payload.meta.unit})`,
      },
      yaxis: { ...PLOTLY_BASE.yaxis, autorange: "reversed" },
      showlegend: false,
      margin: { l: 120, r: 82, t: 12, b: 56 },
      height: 280,
    },
    CFG
  );
}

function renderAll() {
  const p = state.payload;
  if (!p) return;

  const selected = selectedRoutersFromPayload();
  if (!selected.length) return;

  updateHero(p, selected);
  renderBestRouter(p, selected);
  updateKPIs(p, selected);

  const sections = [
    ["chart-line", () => drawLine(p, selected)],
    ["chart-bar", () => drawGroupedBar(p, selected)],
    ["chart-radar", () => drawRadar(p, selected)],
    ["chart-dropoff", () => drawDropoff(p, selected)],
    ["chart-heatmap-mesh", () => drawHeatmapCompare(p, selected, "mesh", "chart-heatmap-mesh")],
    ["chart-heatmap-nomesh", () => drawHeatmapCompare(p, selected, "nomesh", "chart-heatmap-nomesh")],
    ["chart-rank-mesh", () => drawDualRankings(p, selected)],
  ];

  sections.forEach(([chartId, fn]) => {
    try {
      fn();
    } catch (err) {
      console.error(`Failed to render ${chartId}:`, err);
      renderEmptyState(chartId, "Could not render this chart");
    }
  });

  updateTable(p, selected);

  const caption = getEl("sidebar-caption");
  if (caption) {
    caption.textContent = `${p.routers.length} routers · ${p.meta.floor} · ${p.meta.band}`;
  }
}

async function refresh() {
  const params = new URLSearchParams({
    metric: state.metric,
    floor: state.floor,
    band: state.band,
    topology: state.topology,
    threshold: String(state.threshold),
  });

  let payload;
  try {
    payload = await fetch(apiUrl(`data?${params.toString()}`)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  } catch (err) {
    showError(`Failed to load dashboard data: ${err.message}`);
    return;
  }

  state.payload = payload;
  state.labelMap = {};

  (payload.summary || []).forEach((row) => {
    state.labelMap[row.router] = row.label || routerDisplayName(row.router);
  });

  if (!state.routers.length) {
    state.routers = payload.routers.slice(0, Math.min(5, payload.routers.length));
  }

  try {
    buildRouterSelect(payload.routers || []);
    renderAll();
    hideError();
  } catch (err) {
    console.error(err);
    showError(`Failed to render dashboard: ${err.message}`);
  }
}

async function boot() {
  bindStaticControls();
  CHART_IDS.forEach(showLoading);

  try {
    const options = await fetch(apiUrl("options")).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });

    state.options = options;
    const metrics = options.metrics || ["throughput", "signal_strength"];
    const floors = sortFloors(options.floors || []);
    const bands = sortBands(options.bands || []);
    const routers = options.routers || [];

    buildPills("metric-pills", metrics, "metric");
    buildPills("band-pills", bands, "band");
    buildPills("floor-pills", floors, "floor");
    buildPills("topology-pills", ["both", "with_mesh", "without_mesh"], "topology");

    state.metric = metrics.includes("throughput") ? "throughput" : metrics[0];
    state.floor = floors.includes("Lower Floor") ? "Lower Floor" : floors[0];
    state.band = bands.includes("5 GHz") ? "5 GHz" : bands[0];
    state.topology = "both";
    state.allRouters = routers.slice();
    state.routers = routers.slice(0, Math.min(5, routers.length));

    setMetricThresholdDefaults();
    buildRouterSelect(state.allRouters);

    setActivePills("metric-pills", state.metric);
    setActivePills("floor-pills", state.floor);
    setActivePills("band-pills", state.band);
    setActivePills("topology-pills", state.topology);

    await refresh();
  } catch (err) {
    showError(`Could not load dashboard options: ${err.message}`);
  }
}

window.addEventListener("DOMContentLoaded", boot);