import { buildings } from "../data/sampleData.js";
import { initRouter } from "./router.js";
import { getState, resetState, saveState, subscribe, updateState } from "./state.js";
import { advanceDay } from "../modules/mission.js";
import {
  buyBlackMarketItem,
  calculateDailyExpenseBreakdown,
  calculateRestAttackChance,
  canUpgradeFacility,
  getBlackMarketItemCost,
  getFacilityRankLabel,
  getFacilityRequirement,
  getFacilityUpgradeCost,
  hospitalTreatMercenaries,
  upgradeBuilding,
} from "../modules/faction.js";
import { buySupplies, getGameSummary, reduceHeat } from "../modules/game.js";
import { initArmorUI } from "../ui/armorUI.js";
import { initCharacterUI, renderCharacterUI } from "../ui/characterUI.js";
import { initInventoryUI, renderInventoryUI } from "../ui/inventoryUI.js";
import { initMechaUI, renderMechaUI } from "../ui/mechaUI.js";
import { initMissionUI, renderMissionUI } from "../ui/missionUI.js";
import { renderAppShell } from "../ui/appShellUI.js";
import { initWeaponUI } from "../ui/weaponUI.js";
import { buyWealthItem, getWealthCollections, getWealthProgress } from "../modules/wealth.js";
import { showInsufficientFunds, showToast } from "./notifications.js";

let router = null;
let pendingExpenseApproval = false;

function init() {
  renderAppShell(document.querySelector("#root"));
  router = initRouter();
  initCharacterUI({ onRenderNeeded: renderApp });
  initMissionUI();
  initMechaUI();
  initInventoryUI();
  initArmorUI();
  initWeaponUI();
  bindGlobalActions();
  subscribe(renderApp);
  renderApp();
}

function bindGlobalActions() {
  document.querySelector("#advance-day").addEventListener("click", requestAdvanceDayApproval);
  document.querySelector("#buy-supplies").addEventListener("click", () => handleCostAction(36, buySupplies));
  document.querySelector("#reduce-heat").addEventListener("click", () => handleCostAction(42, reduceHeat));
  initGlobalStatusDrawer();
  document.querySelector("#global-status-close").addEventListener("click", () => {
    document.querySelector("#global-status-drawer").classList.remove("open");
    document.querySelector("#global-status-panel").hidden = true;
  });
  document.querySelector("#save-game").addEventListener("click", () => {
    saveState();
    updateState((draft) => {
      draft.log.push(`第 ${draft.day} 天：进度已保存。`);
    });
  });
  document.querySelector("#reset-game").addEventListener("click", () => {
    resetState();
  });
}

function renderApp() {
  renderCommandPanel();
  renderResources();
  renderOverview();
  renderBuildings();
  renderExpenses();
  renderWealth();
  renderCharacterUI();
  renderMissionUI();
  renderMechaUI();
  renderInventoryUI();
  saveState();
}

function requestAdvanceDayApproval() {
  const state = getState();
  if (state.gameStatus !== "active") return;
  pendingExpenseApproval = true;
  router?.switchTab("expenses");
  renderExpenses();
  showToast("请在支出页确认今日支出，批准后才会进入下一天。", "good");
}

function initGlobalStatusDrawer() {
  const drawer = document.querySelector("#global-status-drawer");
  const toggle = document.querySelector("#global-status-toggle");
  const panel = document.querySelector("#global-status-panel");
  const savedPosition = loadDrawerPosition();
  if (savedPosition) {
    drawer.style.left = `${savedPosition.left}px`;
    drawer.style.top = `${savedPosition.top}px`;
    drawer.style.right = "auto";
  }

  let drag = null;
  toggle.addEventListener("pointerdown", (event) => {
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: drawer.offsetLeft,
      top: drawer.offsetTop,
      moved: false,
    };
    toggle.setPointerCapture(event.pointerId);
    drawer.classList.add("dragging");
  });
  toggle.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const maxLeft = window.innerWidth - drawer.offsetWidth - 8;
    const maxTop = window.innerHeight - toggle.offsetHeight - 8;
    const left = Math.max(8, Math.min(maxLeft, drag.left + dx));
    const top = Math.max(8, Math.min(maxTop, drag.top + dy));
    drawer.style.left = `${left}px`;
    drawer.style.top = `${top}px`;
    drawer.style.right = "auto";
  });
  toggle.addEventListener("pointerup", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    toggle.releasePointerCapture(event.pointerId);
    drawer.classList.remove("dragging");
    saveDrawerPosition(drawer);
    const shouldToggle = !drag.moved;
    drag = null;
    if (!shouldToggle) return;
    drawer.classList.toggle("open");
    panel.hidden = !drawer.classList.contains("open");
  });
  toggle.addEventListener("pointercancel", () => {
    drag = null;
    drawer.classList.remove("dragging");
  });
}

function loadDrawerPosition() {
  try {
    return JSON.parse(localStorage.getItem("gun-core-status-drawer-position") ?? "null");
  } catch {
    return null;
  }
}

function saveDrawerPosition(drawer) {
  localStorage.setItem(
    "gun-core-status-drawer-position",
    JSON.stringify({ left: drawer.offsetLeft, top: drawer.offsetTop })
  );
}

function renderCommandPanel() {
  const state = getState();
  const summary = getGameSummary();
  const statusText = {
    active: "进行中",
    won: "胜利",
    lost: "失败",
  }[summary.status];
  document.querySelector("#objective-text").textContent = summary.objectiveText;
  const status = document.querySelector("#game-status");
  status.textContent = statusText;
  status.className = `badge status-${summary.status}`;
  document.querySelector("#advance-day").disabled = summary.status !== "active";
  document.querySelector("#buy-supplies").disabled = summary.status !== "active";
  document.querySelector("#reduce-heat").disabled = summary.status !== "active";
  document.querySelector("#command-grid").innerHTML = [
    ["剩余天数", summary.daysLeft],
    ["收藏缺口", summary.reputationLeft],
    ["待命佣兵", `${summary.availableRoster}/${state.roster.length}`],
    ["执行契约", summary.activeContracts],
  ]
    .map(([label, value]) => `<div class="command-stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function handleCostAction(cost, action) {
  const state = getState();
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return;
  }
  action();
}

function renderResources() {
  const state = getState();
  const wealthProgress = getWealthProgress(state);
  const dailyExpenses = calculateDailyExpenseBreakdown(state);
  document.querySelector("#current-day").textContent = `第 ${state.day} 天`;
  const resources = [
    ["资金", state.gold],
    ["补给", state.supplies],
    ["声望", state.reputation],
    ["强化点", state.enhancementPoints ?? 0],
    ["收藏", `${wealthProgress.owned}/${wealthProgress.total}`],
    ["隐秘值", `${state.stealth}/100`],
    ["每日支出", dailyExpenses.total],
    ["遇袭率", `${calculateRestAttackChance()}%`],
    ["已花", `${wealthProgress.spent} 金`],
  ];
  const resourceHtml = resources
    .map(([label, value]) => `<div class="resource"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  document.querySelector("#resource-grid").innerHTML = resourceHtml;

  document.querySelector("#global-resource-strip").innerHTML = [
    ["第", `${state.day} 天`],
    ["资金", state.gold],
    ["声望", state.reputation],
    ["强化点", state.enhancementPoints ?? 0],
    ["隐秘", `${state.stealth}/100`],
    ["日支出", dailyExpenses.total],
    ["遇袭", `${calculateRestAttackChance()}%`],
  ]
    .map(([label, value]) => `<div class="strip-resource"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderExpenses() {
  const state = getState();
  const breakdown = calculateDailyExpenseBreakdown(state);
  const totalBadge = document.querySelector("#expense-total-badge");
  const summaryGrid = document.querySelector("#expense-summary-grid");
  const list = document.querySelector("#expense-list");
  if (!totalBadge || !summaryGrid || !list) return;

  totalBadge.textContent = `${breakdown.total} 金/天`;
  summaryGrid.innerHTML = [
    ["佣兵工资", breakdown.wages.total, `${breakdown.wages.items.length} 名待命`],
    ["生活补给", breakdown.supplies.total, `${breakdown.supplies.items.length} 名佣兵`],
    ["装备养护", breakdown.equipment.total, `${breakdown.equipment.items.length} 件装备`],
    ["设施维持", breakdown.facilities.total + breakdown.base.total, `${breakdown.facilities.items.length} 座设施`],
  ]
    .map(
      ([label, value, note]) => `
        <article class="expense-summary-card">
          <span>${label}</span>
          <strong>${value} 金</strong>
          <p class="muted">${note}</p>
        </article>
      `
    )
    .join("");

  list.innerHTML = [
    renderExpenseSection("佣兵工资", "仅待命佣兵按日支付；执行契约期间暂不支付，归来后补发。", breakdown.wages.items, renderWageExpenseLine, breakdown.wages.total),
    renderExpenseSection("生活补给", "每个未阵亡佣兵每日消耗生活费用，等级越高费用越高。", breakdown.supplies.items, renderSupplyExpenseLine, breakdown.supplies.total),
    renderExpenseSection("武器防具养护", "已装备的武器和防具每天都要维护，等级越高费用越高。", breakdown.equipment.items, renderEquipmentExpenseLine, breakdown.equipment.total),
    renderExpenseSection("基础设施维持", "基地基础开销加已解锁设施维持费。", [...breakdown.base.items, ...breakdown.facilities.items], renderFacilityExpenseLine, breakdown.base.total + breakdown.facilities.total),
    renderExpenseApprovalPanel(state, breakdown),
  ].join("");

  list.querySelectorAll("[data-confirm-expenses]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingExpenseApproval = false;
      advanceDay();
    });
  });
}

function renderExpenseApprovalPanel(state, breakdown) {
  return `
    <section class="expense-section expense-approval-section">
      <div>
        <h3>每日结算批准</h3>
        <p class="muted">${
          pendingExpenseApproval
            ? `确认支付当前每日支出 ${breakdown.total} 金。当前资金 ${state.gold} 金。`
            : "点击顶部“推进一天”后，需要在这里批准支出。"
        }</p>
      </div>
      <button class="approve-button" data-confirm-expenses ${pendingExpenseApproval && state.gameStatus === "active" ? "" : "disabled"} type="button">
        批准支出并进入下一天
      </button>
    </section>
  `;
}

function renderExpenseSection(title, description, items, renderLine, total) {
  return `
    <section class="expense-section">
      <div class="card-header">
        <div>
          <h3>${title}</h3>
          <p class="muted">${description}</p>
        </div>
        <span class="badge">${total} 金/天</span>
      </div>
      <div class="expense-line-list">
        ${
          items.length > 0
            ? items.map(renderLine).join("")
            : `<p class="muted">暂无支出</p>`
        }
      </div>
    </section>
  `;
}

function renderWageExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank}级 · ${item.status}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderSupplyExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank}级 · 生活补给</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderEquipmentExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.characterName} · ${item.itemName}</span>
      <small>${item.slotLabel} · ${item.rarity}级 · ${item.type}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderFacilityExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank ? `${item.rank}级 · Lv.${item.level}` : "固定开销"}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderWealth() {
  const state = getState();
  const progress = getWealthProgress(state);
  const badge = document.querySelector("#wealth-progress-badge");
  const list = document.querySelector("#wealth-list");
  if (!badge || !list) return;

  badge.textContent = `${progress.owned}/${progress.total} · 已花 ${progress.spent} 金`;
  list.innerHTML = getWealthCollections()
    .map(
      (room) => `
        <section class="wealth-room">
          <div class="card-header">
            <div>
              <h3>${room.name}</h3>
              <p class="muted">${room.description}</p>
            </div>
            <span class="badge">${room.items.filter((item) => item.owned).length}/${room.items.length}</span>
          </div>
          <div class="wealth-item-grid">
            ${room.items.map((item) => renderWealthItem(item, state)).join("")}
          </div>
        </section>
      `
    )
    .join("");

  list.querySelectorAll("[data-buy-wealth-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      const item = getWealthCollections().flatMap((room) => room.items).find((entry) => entry.id === button.dataset.buyWealthItem);
      if (item && state.gold < item.cost) {
        showInsufficientFunds(state.gold, item.cost);
        return;
      }
      buyWealthItem(button.dataset.buyWealthItem);
    });
  });
}

function renderWealthItem(item, state) {
  const disabled = item.owned || state.gameStatus !== "active" ? "disabled" : "";
  return `
    <article class="wealth-item ${item.owned ? "owned" : ""}">
      <div>
        <strong>${item.name}</strong>
        <p class="muted">${item.description}</p>
      </div>
      <button class="${item.owned ? "ghost-button" : "primary-button"}" data-buy-wealth-item="${item.id}" ${disabled} type="button">
        ${item.owned ? "已收藏" : `${item.cost} 金`}
      </button>
    </article>
  `;
}

function renderOverview() {
  const state = getState();
  const activeContracts = state.missions.filter((mission) => mission.status === "active");
  const availableContracts = state.missions.filter((mission) => mission.status === "available");
  const wounded = state.roster.filter((character) => character.wound > 0);
  const stressed = state.roster.filter((character) => character.stress >= 10);
  const availableRoster = state.roster.filter((character) => character.status === "待命");

  document.querySelector("#contract-overview-badge").textContent = `${activeContracts.length} 执行 / ${availableContracts.length} 可接`;
  document.querySelector("#contract-overview").innerHTML =
    activeContracts.length > 0
      ? activeContracts
          .map(
            (mission) => `
              <div class="overview-row">
                <span>${mission.name}</span>
                <strong>剩余 ${mission.remaining} 天</strong>
              </div>
            `
          )
          .join("")
      : `<p class="muted">没有正在执行的契约。可在契约页选择队伍后接取。</p>`;

  document.querySelector("#personnel-overview-badge").textContent = `${availableRoster.length}/${state.roster.length} 待命`;
  document.querySelector("#personnel-overview").innerHTML = [
    ["待命", availableRoster.length],
    ["执行中", state.roster.filter((character) => character.status !== "待命").length],
    ["受伤", wounded.length],
    ["高压", stressed.length],
  ]
    .map(([label, value]) => `<div class="overview-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  renderCalendar();
}

function renderCalendar() {
  const state = getState();
  const startDay = Math.max(1, state.day - 2);
  const days = Array.from({ length: 7 }, (_, index) => startDay + index);
  const activeMissions = state.missions.filter((mission) => mission.status === "active");
  const availableMissions = state.missions.filter((mission) => mission.status === "available");

  document.querySelector("#calendar-list").innerHTML = days
    .map((day) => {
      const entries = [
        ...state.timeline.filter((entry) => isEntryOnDay(entry, day)),
        ...activeMissions
          .filter((mission) => !state.timeline.some((entry) => entry.missionId === mission.id))
          .filter((mission) => day >= (mission.startDay ?? state.day) && day <= (mission.endDay ?? state.day + mission.remaining))
          .map((mission) => ({
            type: "contract",
            status: "active",
            title: mission.name,
            detail: `执行中，预计第 ${mission.endDay} 天结束`,
          })),
        ...availableMissions
          .filter((mission) => mission.expiresDay === day)
          .map((mission) => ({
            type: "contract",
            status: "planned",
            title: mission.name,
            detail: "契约截止日",
          })),
      ];
      return `
        <article class="calendar-day ${day === state.day ? "today" : ""}">
          <div class="calendar-day-head">
            <strong>第 ${day} 天</strong>
            <span>${day < state.day ? "已结束" : day === state.day ? "今天" : "计划"}</span>
          </div>
          <div class="calendar-events">
            ${
              entries.length > 0
                ? entries.map(renderCalendarEntry).join("")
                : `<p class="muted">暂无行动</p>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function isEntryOnDay(entry, day) {
  const start = entry.day ?? day;
  const end = entry.endDay ?? start;
  return day >= start && day <= end;
}

function renderCalendarEntry(entry) {
  const label = {
    active: "执行",
    done: "完成",
    failed: "失败",
    missed: "错过",
    planned: "计划",
  }[entry.status] ?? "记录";
  return `
    <div class="calendar-event ${entry.status}">
      <span>${label}</span>
      <strong>${entry.title}</strong>
      <p>${entry.detail ?? ""}</p>
    </div>
  `;
}

function renderBuildings() {
  const state = getState();
  const container = document.querySelector("#building-list");
  container.innerHTML = Object.entries(buildings)
    .map(([id, building]) => {
      const level = state.buildings[id] ?? 0;
      const isUnlocked = level > 0;
      const rank = getFacilityRankLabel(level);
      const cost = getFacilityUpgradeCost(id, level);
      const requirement = getFacilityRequirement(Math.min(level + 1, 7));
      const canUpgrade = level < 7 && canUpgradeFacility(id);
      const disabled = state.gameStatus !== "active" || !canUpgrade ? "disabled" : "";
      return `
        <article class="card facility-card ${isUnlocked ? "" : "locked"}" data-open-facility="${id}">
          <div class="card-header">
            <div>
              <p class="card-title">${building.name}</p>
              <p class="muted">${isUnlocked ? `${rank}级 · 维护费 ${building.upkeep * level}/天` : "未解锁"}</p>
            </div>
            <span class="badge">${isUnlocked ? rank : "未解锁"}</span>
          </div>
          <p class="muted">${building.description}</p>
          ${
            level < 7
              ? `<p class="muted">下一阶段：${requirement.rank}级 · 需要 ${requirement.reputation} 声望 / 第 ${requirement.day} 天</p>`
              : `<p class="muted">已达到最高 S 级。</p>`
          }
          <div class="button-row">
            ${renderFacilityAction(id, level, cost, disabled)}
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-open-facility]").forEach((card) => {
    card.addEventListener("click", () => openFacilityDialog(card.dataset.openFacility));
  });
  container.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!ensureButtonCostAvailable(button)) return;
      upgradeBuilding(button.dataset.upgrade);
    });
  });
  container.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!ensureButtonCostAvailable(button)) return;
      buyBlackMarketItem(button.dataset.buyBlackMarketItem);
    });
  });
  container.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!ensureButtonCostAvailable(button)) return;
      hospitalTreatMercenaries();
    });
  });
}

function renderFacilityAction(id, level, cost, disabled) {
  const state = getState();
  if (level <= 0) return `<button class="primary-button" data-upgrade="${id}" ${disabled}>解锁 F级 · ${cost} 金</button>`;
  const upgradeButton = renderFacilityUpgradeButton(id, level, cost, disabled);
  if (id === "blackMarket") {
    const rank = getFacilityRankLabel(level);
    const actions = [
      ["supplies", "购买补给/杂物"],
      ["weapon", "购买武器"],
      ["armor", "购买防具"],
      ["mecha", "购买机甲"],
    ];
    return actions
      .map(([kind, label]) => {
        const itemCost = getBlackMarketItemCost(kind, rank);
        const isDisabled = state.gameStatus !== "active" ? "disabled" : "";
        return `<button class="${kind === "mecha" ? "primary-button" : "ghost-button"}" data-buy-black-market-item="${kind}" ${isDisabled}>${label} · ${rank}级 ${itemCost} 金</button>`;
      })
      .join("");
    return `${actions}${upgradeButton}`;
  }
  if (id === "hospital") {
    return `<button class="primary-button" data-hospital-treat ${state.gameStatus !== "active" ? "disabled" : ""}>治疗佣兵 32 金</button>${upgradeButton}`;
  }
  return upgradeButton;
}

function renderFacilityUpgradeButton(id, level, cost, disabled) {
  if (level >= 7) return `<button class="ghost-button" disabled>最高 S级</button>`;
  return `<button class="ghost-button" data-upgrade="${id}" ${disabled}>升级到 ${getFacilityRankLabel(level + 1)}级 · ${cost} 金</button>`;
}

function openFacilityDialog(id) {
  const state = getState();
  const building = buildings[id];
  if (!building) return;

  const level = state.buildings[id] ?? 0;
  const isUnlocked = level > 0;
  const rank = getFacilityRankLabel(level);
  const nextCost = getFacilityUpgradeCost(id, level);
  const nextRequirement = getFacilityRequirement(Math.min(level + 1, 7));
  const canUpgrade = level < 7 && canUpgradeFacility(id);
  const specialText = {
    blackMarket: `只能买到当前黑市评级的商品。当前可购买 ${rank}级补给、武器、防具与机甲。`,
    hospital: "解锁后可花费 32 金治疗所有受伤或高压佣兵。",
    tavern: "提高招募池规模，便于寻找更多候选佣兵。",
    infirmary: "每日推进时自动降低受伤或高压佣兵的压力。",
    intel: "每级为契约成功率提供额外情报加成。",
  }[id] ?? "基础设施效果待扩展。";

  document.querySelector("#facility-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">BASE FACILITY / ${id.toUpperCase()}</div>
        <h2 class="dossier-title">${building.name}</h2>
        <p class="muted">${isUnlocked ? `${rank}级` : "未解锁"} · 维护费 ${building.upkeep * level}/天</p>
      </div>
      <button class="ghost-button" data-close-facility type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>状态</h3>
        <div class="field-list">
          <div class="field"><span>当前状态</span><strong>${isUnlocked ? "已解锁" : "未解锁"}</strong></div>
          <div class="field"><span>评级</span><strong>${rank}</strong></div>
          <div class="field"><span>维护费</span><strong>${building.upkeep * level} 金/天</strong></div>
          <div class="field"><span>${isUnlocked ? "升级费用" : "解锁费用"}</span><strong>${level >= 7 ? "已满级" : `${nextCost} 金`}</strong></div>
          <div class="field"><span>下一评级</span><strong>${level >= 7 ? "S级" : `${nextRequirement.rank}级`}</strong></div>
          <div class="field"><span>升级条件</span><strong>${level >= 7 ? "已完成" : `${nextRequirement.reputation} 声望 / 第 ${nextRequirement.day} 天`}</strong></div>
        </div>
      </section>
      <section class="dossier-section">
        <h3>用途</h3>
        <p class="muted">${building.description}</p>
        <p class="muted">${specialText}</p>
      </section>
      <section class="dossier-section wide">
        <h3>可用操作</h3>
        <div class="button-row">
          ${renderFacilityAction(id, level, nextCost, state.gameStatus !== "active" || !canUpgrade)}
        </div>
      </section>
    </div>
  `;

  const dialog = document.querySelector("#facility-dialog");
  dialog.showModal();
  dialog.querySelector("[data-close-facility]").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!ensureButtonCostAvailable(button)) return;
      upgradeBuilding(button.dataset.upgrade);
      dialog.close();
    });
  });
  dialog.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!ensureButtonCostAvailable(button)) return;
      buyBlackMarketItem(button.dataset.buyBlackMarketItem);
      dialog.close();
    });
  });
  dialog.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!ensureButtonCostAvailable(button)) return;
      hospitalTreatMercenaries();
      dialog.close();
    });
  });
}

function ensureButtonCostAvailable(button) {
  const cost = getCostFromText(button.textContent);
  if (!cost) return true;
  const state = getState();
  if (state.gold >= cost) return true;
  showInsufficientFunds(state.gold, cost);
  return false;
}

function getCostFromText(text = "") {
  const match = text.match(/(\d+)\s*金/);
  return match ? Number(match[1]) : 0;
}

init();
