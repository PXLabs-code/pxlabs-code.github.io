(() => {
  "use strict";

  const config = window.SITE_CONFIG;
  const API_ROOT = "https://abacus.jasoncameron.dev";
  const REQUEST_TIMEOUT_MS = 8000;
  const CLICK_COOLDOWN_MS = 1000;
  const status = document.querySelector("#stats-status");

  if (!config?.NAMESPACE || !Array.isArray(config.BUTTONS)) {
    showOffline("invalid configuration");
    return;
  }

  const buttonList = document.querySelector("#button-list");
  const statsList = document.querySelector("#stats-list");
  const clickLog = document.querySelector("#click-log");
  const lastClickList = document.querySelector("#last-click-list");
  const values = new Map();
  const recentReports = new Map();

  function renderSetup() {
    config.BUTTONS.forEach((button) => {
      const buttonElement = document.createElement("button");
      buttonElement.className = "count-button";
      buttonElement.type = "button";
      buttonElement.dataset.key = button.key;
      buttonElement.textContent = `[ ${button.label} ]`;
      buttonElement.setAttribute("aria-label", `记录 ${button.label} 点击`);
      buttonElement.addEventListener("click", () => handleClick(button));
      buttonList.append(buttonElement);

      const row = document.createElement("div");
      row.className = "stat-row";

      const label = document.createElement("dt");
      label.textContent = button.label;

      const value = document.createElement("dd");
      value.id = statId(button.key);
      value.textContent = "—";
      value.setAttribute("aria-label", `${button.label} 累计点击次数`);

      row.append(label, value);
      statsList.append(row);

      const localRow = document.createElement("div");
      localRow.className = "last-click-row";

      const localLabel = document.createElement("span");
      localLabel.textContent = `${button.key}/`;

      const localTime = document.createElement("time");
      localTime.id = lastClickId(button.key);
      localTime.textContent = "never";
      localRow.append(localLabel, localTime);
      lastClickList.append(localRow);
    });
  }

  function statId(key) {
    return `stat-${encodeURIComponent(key)}`;
  }

  function lastClickId(key) {
    return `last-click-${encodeURIComponent(key)}`;
  }

  function showOnline() {
    status.classList.remove("offline");
    status.innerHTML = '<i aria-hidden="true"></i> stats online';
  }

  function showOffline(detail) {
    if (!status) return;
    status.classList.add("offline");
    status.innerHTML = '<i aria-hidden="true"></i> stats offline';
    if (detail) console.warn(`Click statistics: ${detail}`);
  }

  function updateValue(key, value) {
    values.set(key, value);
    const target = document.getElementById(statId(key));
    if (target) target.textContent = value.toLocaleString();
  }

  async function requestCount(method, key) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${API_ROOT}/${method}/${encodeURIComponent(config.NAMESPACE)}/click-${encodeURIComponent(key)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (method === "get" && response.status === 404) return 0;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const value = Number(payload.value);
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error("invalid counter response");
      }
      return value;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function loadCounts() {
    const requests = config.BUTTONS.map(async ({ key }) => {
      try {
        const value = await requestCount("get", key);
        updateValue(key, value);
      } catch (error) {
        showOffline(error instanceof Error ? error.message : "request failed");
      }
    });

    await Promise.allSettled(requests);
    if (!status.classList.contains("offline")) showOnline();
  }

  function appendClickFeedback(key) {
    clickLog.querySelector(".log-placeholder")?.remove();
    clickLog.replaceChildren();

    const line = document.createElement("span");
    line.className = "click-log-line";
    line.textContent = `> click:${key} OK`;
    clickLog.append(line);
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("Local storage is unavailable:", error);
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("Could not persist local click data:", error);
      return false;
    }
  }

  function reportStorageKey(key) {
    return `pxlabs:${config.NAMESPACE}:reported:${key}`;
  }

  function saveLastClick(key, timestamp) {
    const value = { timestamp: new Date(timestamp).toISOString() };
    if (storageSet(lastClickStorageKey(key), JSON.stringify(value))) {
      renderLastClick(key, value);
    } else {
      const target = document.getElementById(lastClickId(key));
      target?.removeAttribute("datetime");
      if (target) target.textContent = "storage unavailable";
    }
  }

  function lastClickStorageKey(key) {
    return `pxlabs:${config.NAMESPACE}:last-click:${key}`;
  }

  function renderLastClick(key, value) {
    const date = new Date(value.timestamp);
    if (Number.isNaN(date.getTime())) return;
    const target = document.getElementById(lastClickId(key));
    if (!target) return;
    target.dateTime = date.toISOString();
    target.textContent = date.toLocaleString();
  }

  async function handleClick(button) {
    const now = Date.now();
    appendClickFeedback(button.key);
    saveLastClick(button.key, now);

    const previousReport = Math.max(
      recentReports.get(button.key) || 0,
      Number(storageGet(reportStorageKey(button.key)) || 0),
    );
    if (now - previousReport < CLICK_COOLDOWN_MS) return;

    recentReports.set(button.key, now);
    storageSet(reportStorageKey(button.key), String(now));

    try {
      const value = await requestCount("hit", button.key);
      updateValue(button.key, value);
      showOnline();
    } catch (error) {
      showOffline(error instanceof Error ? error.message : "request failed");
    }
  }

  function restoreLastClick() {
    config.BUTTONS.forEach(({ key }) => {
      const raw = storageGet(lastClickStorageKey(key));
      if (!raw) return;

      try {
        renderLastClick(key, JSON.parse(raw));
      } catch (error) {
        console.warn(`Ignoring invalid saved click timestamp for ${key}:`, error);
      }
    });
  }

  function animateBootText() {
    const target = document.querySelector("#boot-text");
    const text = "Initializing personal node... done";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      target.textContent = text;
      return;
    }

    target.textContent = "";
    let index = 0;
    const typeNext = () => {
      target.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) window.setTimeout(typeNext, 38);
    };
    window.setTimeout(typeNext, 250);
  }

  document.querySelector("#current-year").textContent = String(new Date().getFullYear());
  renderSetup();
  restoreLastClick();
  animateBootText();
  loadCounts();
})();
