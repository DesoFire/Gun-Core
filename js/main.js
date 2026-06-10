import { buildings } from "../data/sampleData.js";
import { initRouter } from "./router.js";
import { getState, resetState, saveState, subscribe, updateState } from "./state.js";
import { advanceDay } from "../modules/mission.js";
import {
  buyBlackMarketItem,
  calculateDailyUpkeep,
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
import { initCharacterUI, renderCharacterUI } from "../ui/characterUI.js";
import { initInventoryUI, renderInventoryUI } from "../ui/inventoryUI.js";
import { initMechaUI, renderMechaUI } from "../ui/mechaUI.js";
import { initMissionUI, renderMissionUI } from "../ui/missionUI.js";
import { renderAppShell } from "../ui/appShellUI.js";
import { initWeaponUI } from "../ui/weaponUI.js";

function init() {
  renderAppShell(document.querySelector("#root"));
  initRouter();
  initCharacterUI({ onRenderNeeded: renderApp });
  initMissionUI();
  initMechaUI();
  initInventoryUI();
  initWeaponUI();
  bindGlobalActions();
  subscribe(renderApp);
  renderApp();
}

function bindGlobalActions() {
  document.querySelector("#advance-day").addEventListener("click", advanceDay);
  document.querySelector("#buy-supplies").addEventListener("click", buySupplies);
  document.querySelector("#reduce-heat").addEventListener("click", reduceHeat);
  document.querySelector("#save-game").addEventListener("click", () => {
    saveState();
    updateState((draft) => {
      draft.log.push(`第 ${draft.day} 天：进度已保存。`);
    });
  });
  document.querySelector("#reset-game").addEventListener("click", () => {
    resetState();
  });
  document.querySelector("#clear-log").addEventListener("click", () => {
    updateState((draft) => {
      draft.log = [];
    });
  });
}

function renderApp() {
  renderCommandPanel();
  renderResources();
  renderOverview();
  renderBuildings();
  renderCharacterUI();
  renderMissionUI();
  renderMechaUI();
  renderInventoryUI();
  renderLog();
  saveState();
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
  document.querySelector("#buy-supplies").disabled = summary.status !== "active" || state.gold < 36;
  document.querySelector("#reduce-heat").disabled = summary.status !== "active" || state.gold < 42;
  document.querySelector("#command-grid").innerHTML = [
    ["剩余天数", summary.daysLeft],
    ["还需声望", summary.reputationLeft],
    ["待命佣兵", `${summary.availableRoster}/${state.roster.length}`],
    ["执行契约", summary.activeContracts],
  ]
    .map(([label, value]) => `<div class="command-stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderResources() {
  const state = getState();
  document.querySelector("#current-day").textContent = `第 ${state.day} 天`;
  const resources = [
    ["资金", state.gold],
    ["补给", state.supplies],
    ["声望", state.reputation],
    ["隐秘值", `${state.stealth}/100`],
    ["每日支出", calculateDailyUpkeep()],
    ["遇袭率", `${calculateRestAttackChance()}%`],
    ["目标", `${Math.min(state.reputation, state.objective.targetReputation)}/${state.objective.targetReputation}`],
  ];
  const resourceHtml = resources
    .map(([label, value]) => `<div class="resource"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  document.querySelector("#resource-grid").innerHTML = resourceHtml;
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
      const disabled = state.gold < cost || state.gameStatus !== "active" || !canUpgrade ? "disabled" : "";
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
      upgradeBuilding(button.dataset.upgrade);
    });
  });
  container.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      buyBlackMarketItem(button.dataset.buyBlackMarketItem);
    });
  });
  container.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
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
        const isDisabled = state.gameStatus !== "active" || state.gold < itemCost ? "disabled" : "";
        return `<button class="${kind === "mecha" ? "primary-button" : "ghost-button"}" data-buy-black-market-item="${kind}" ${isDisabled}>${label} · ${rank}级 ${itemCost} 金</button>`;
      })
      .join("");
    return `${actions}${upgradeButton}`;
  }
  if (id === "hospital") {
    return `<button class="primary-button" data-hospital-treat ${state.gameStatus !== "active" || state.gold < 32 ? "disabled" : ""}>治疗佣兵 32 金</button>${upgradeButton}`;
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
          ${renderFacilityAction(id, level, nextCost, state.gold < nextCost || state.gameStatus !== "active" || !canUpgrade)}
        </div>
      </section>
    </div>
  `;

  const dialog = document.querySelector("#facility-dialog");
  dialog.showModal();
  dialog.querySelector("[data-close-facility]").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      upgradeBuilding(button.dataset.upgrade);
      dialog.close();
    });
  });
  dialog.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", () => {
      buyBlackMarketItem(button.dataset.buyBlackMarketItem);
      dialog.close();
    });
  });
  dialog.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", () => {
      hospitalTreatMercenaries();
      dialog.close();
    });
  });
}

function renderLog() {
  document.querySelector("#event-log").innerHTML = getState()
    .log.slice(-18)
    .reverse()
    .map((entry) => {
      const tone = entry.includes("成功") ? "good" : entry.includes("失败") || entry.includes("受伤") ? "bad" : "";
      return `<div class="log-entry ${tone}">${entry}</div>`;
    })
    .join("");
}

init();
