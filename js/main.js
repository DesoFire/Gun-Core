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
  const resources = [
    ["资金", state.gold],
    ["补给", state.supplies],
    ["声望", state.reputation],
    ["隐秘值", `${state.stealth}/100`],
    ["每日支出", calculateDailyUpkeep()],
    ["遇袭率", `${calculateRestAttackChance()}%`],
    ["目标", `${Math.min(state.reputation, state.objective.targetReputation)}/${state.objective.targetReputation}`],
  ];
  document.querySelector("#resource-grid").innerHTML = resources
    .map(([label, value]) => `<div class="resource"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
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
