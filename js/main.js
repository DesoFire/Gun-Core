import { buildings } from "../data/sampleData.js";
import { initRouter } from "./router.js";
import { getState, resetState, saveState, subscribe, updateState } from "./state.js";
import { advanceDay } from "../modules/mission.js";
import { calculateDailyUpkeep, calculateRestAttackChance, upgradeBuilding } from "../modules/faction.js";
import { buySupplies, getGameSummary, reduceHeat, treatWounds } from "../modules/game.js";
import { clearSelectedCharacters, getSelectedCharacterIds, initCharacterUI, renderCharacterUI } from "../ui/characterUI.js";
import { initInventoryUI, renderInventoryUI } from "../ui/inventoryUI.js";
import { initMechaUI, renderMechaUI } from "../ui/mechaUI.js";
import { initMissionUI, renderMissionUI } from "../ui/missionUI.js";
import { renderAppShell } from "../ui/appShellUI.js";
import { initWeaponUI } from "../ui/weaponUI.js";

function init() {
  renderAppShell(document.querySelector("#root"));
  initRouter();
  initCharacterUI({ onRenderNeeded: renderApp });
  initMissionUI({ getSelectedIds: getSelectedCharacterIds, clearSelected: clearSelectedCharacters });
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
  document.querySelector("#treat-wounds").addEventListener("click", treatWounds);
  document.querySelector("#reduce-heat").addEventListener("click", reduceHeat);
  document.querySelector("#save-game").addEventListener("click", () => {
    saveState();
    updateState((draft) => {
      draft.log.push(`第 ${draft.day} 天：进度已保存。`);
    });
  });
  document.querySelector("#reset-game").addEventListener("click", () => {
    clearSelectedCharacters();
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
  document.querySelector("#treat-wounds").disabled = summary.status !== "active" || state.gold < 28;
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
  document.querySelector("#facility-current-day").textContent = `第 ${state.day} 天`;
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
  document.querySelector("#facility-resource-grid").innerHTML = resourceHtml;
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
      const cost = building.cost + level * 45;
      const disabled = state.gold < cost || state.gameStatus !== "active" ? "disabled" : "";
      return `
        <article class="card">
          <div class="card-header">
            <div>
              <p class="card-title">${building.name} Lv.${level}</p>
              <p class="muted">${building.description} 维护费：${building.upkeep * level}/天</p>
            </div>
            <button class="ghost-button" data-upgrade="${id}" ${disabled}>${cost} 金</button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => upgradeBuilding(button.dataset.upgrade));
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
