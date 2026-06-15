import { getState } from "../js/state.js";
import { careerCategories, contractIntelFields } from "../data/sampleData.js";
import { economyConfig } from "../data/economyConfig.js";
import {
  getContractRiskTag,
  getMissionPowerRange,
  getMissions,
  getTeamCombatPower,
  investigateMission,
  refreshMission,
  startMission,
} from "../modules/mission.js";
import { openCharacterSheet, renderCharacterCard } from "./characterUI.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";
import { confirmResourceSpend, showInsufficientFunds, showSpendFailure, showSpendSuccess } from "../js/notifications.js";

let openContractId = null;
let dispatchMissionId = null;
let dispatchSelection = new Set();

export function initMissionUI() {}

export function renderMissionUI() {
  const state = getState();
  const countBadge = document.querySelector("#selected-count");
  if (countBadge) countBadge.textContent = "Dispatch from contract card";

  const container = document.querySelector("#mission-list");
  if (!container) return;

  container.innerHTML = getMissions().map((mission) => renderMissionCard(mission, state)).join("");

  container.querySelectorAll("[data-open-contract]").forEach((card) => {
    card.addEventListener("click", () => openContractCard(card.dataset.openContract));
  });

  container.querySelectorAll("[data-view-contract]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openContractCard(button.dataset.viewContract);
    });
  });

  container.querySelectorAll("[data-refresh-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const mission = getState().missions.find((item) => item.id === button.dataset.refreshMission);
      const cost = mission && mission.refreshCost ? mission.refreshCost : 0;
      const before = getState();
      if (before.gold < cost) {
        showInsufficientFunds(before.gold, cost);
        return;
      }
      if (!confirmResourceSpend(`Refresh contract: ${mission ? mission.name : ""}`, cost)) return;
      const beforeGold = getState().gold;
      refreshMission(button.dataset.refreshMission);
      const afterGold = getState().gold;
      if (afterGold >= beforeGold) {
        showSpendFailure("Refresh contract", "Refresh was not completed.");
        return;
      }
      showSpendSuccess("Refresh contract", beforeGold - afterGold, afterGold);
    });
  });

  if (openContractId && document.querySelector("#contract-dialog") && document.querySelector("#contract-dialog").open) {
    renderContractCard(openContractId);
  }
}

function renderMissionCard(mission, state) {
  const isActive = mission.status === "active";
  const assignedMembers = getMissionMembers(mission, state.roster);
  const lockedIntelCount = getLockedIntelFields(mission).length;
  const powerRange = getMissionPowerRange(mission);
  const risk = getContractRiskTag(mission);
  const canAct = state.gameStatus === "active";
  return `
    <article class="card contract-card contract-summary-card" data-open-contract="${mission.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${mission.name}</p>
          <p class="muted">${mission.issuer} / ${mission.type} / expires day ${mission.expiresDay}</p>
        </div>
        <span class="badge">${isActive ? `remaining ${mission.remaining}d` : "idle"}</span>
      </div>
      <div class="contract-public">
        <span>power ${powerRange.low}-${powerRange.high}</span>
        <span>${risk.label}</span>
        <span>${mission.duration}d</span>
        <span>${mission.reward.gold} gold</span>
      </div>
      ${renderContractSummaryIntel(mission)}
      ${
        isActive
          ? `<div class="contract-team-strip">${assignedMembers.map((character) => renderMercenaryAvatar(character, { size: "small" })).join("")}<span>active</span></div>`
          : `<p class="muted">${lockedIntelCount} intel items are still locked. Open the card to investigate or dispatch.</p>`
      }
      <div class="button-row">
        <button class="primary-button" data-view-contract="${mission.id}" type="button">${isActive ? "View" : "Open contract"}</button>
        <button class="ghost-button" data-refresh-mission="${mission.id}" ${!canAct || isActive ? "disabled" : ""} type="button">Refresh ${mission.refreshCost || 0} gold</button>
      </div>
    </article>
  `;
}

function openContractCard(id) {
  openContractId = id;
  if (dispatchMissionId !== id) {
    dispatchMissionId = null;
    dispatchSelection.clear();
  }
  renderContractCard(id);
  document.querySelector("#contract-dialog").showModal();
}

function renderContractCard(id) {
  const state = getState();
  const mission = getMissions().find((item) => item.id === id);
  if (!mission) {
    const dialog = document.querySelector("#contract-dialog");
    if (dialog) dialog.close();
    openContractId = null;
    dispatchMissionId = null;
    dispatchSelection.clear();
    return;
  }

  const isActive = mission.status === "active";
  const selectedIds = [...dispatchSelection].filter((memberId) => state.roster.some((character) => character.id === memberId));
  if (selectedIds.length !== dispatchSelection.size) dispatchSelection = new Set(selectedIds);
  const powerRange = getMissionPowerRange(mission);
  const isDispatching = dispatchMissionId === mission.id && !isActive;
  const lockedIntelFields = getLockedIntelFields(mission);
  const canAct = state.gameStatus === "active" && !isActive;
  const daysUntilExpires = Math.max(0, mission.expiresDay - state.day);

  const dossier = document.querySelector("#contract-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">CONTRACT / ${mission.typeCode || mission.type} / DAY ${mission.issueDay}-${mission.expiresDay}</div>
        <h2 class="dossier-title">${mission.name}</h2>
        <p class="muted">${mission.issuer} / ${mission.type} / ${mission.acquisition || "broadcast"}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-contract aria-label="close" title="close" type="button">Close</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>Public intel</h3>
        <div class="field-list">
          <div class="field"><span>Deadline</span><strong>${daysUntilExpires === 0 ? "today" : `${daysUntilExpires} days left`}</strong></div>
          <div class="field"><span>Duration</span><strong>${mission.duration} days</strong></div>
          <div class="field"><span>Difficulty</span><strong>${renderDifficultyBadge(mission.difficulty)}</strong></div>
          <div class="field"><span>Power</span><strong>${powerRange.low}-${powerRange.high}</strong></div>
          <div class="field"><span>Intel precision</span><strong>${powerRange.level}/3</strong></div>
          <div class="field"><span>Reward</span><strong>${mission.reward.gold} gold / ${mission.reward.reputation} reputation pool</strong></div>
        </div>
      </section>
      <section class="dossier-section wide">
        <h3>Brief</h3>
        <p class="contract-brief">${mission.description}</p>
        <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>Investigate</h3>
            <p class="muted">Targeted intel is expensive. Random intel is cheaper but uncontrolled.</p>
          </div>
          <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="random" ${canAct && (lockedIntelFields.length > 0 || powerRange.level < 3) ? "" : "disabled"} type="button">Random ${formatInvestigationCost(mission, "random")}</button>
        </div>
        <div class="intel-action-grid">
          <article class="intel-action ${powerRange.level >= 3 ? "revealed" : ""}">
            <div>
              <strong>Power range</strong>
              <p class="muted">Current ${powerRange.low}-${powerRange.high}, precision ${powerRange.level}/3.</p>
            </div>
            <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="power" ${canAct && powerRange.level < 3 ? "" : "disabled"} type="button">Refine ${formatInvestigationCost(mission, "power")}</button>
          </article>
          ${contractIntelFields.map((field) => renderIntelAction(mission, field, canAct)).join("")}
        </div>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>Dispatch</h3>
            <p class="muted">${isActive ? "This contract is already active." : "Select available mercenaries. Open a merc card to inspect or change equipment."}</p>
          </div>
          ${
            isActive
              ? `<span class="badge">active</span>`
              : `<button class="primary-button" data-open-dispatch="${mission.id}" ${state.gameStatus !== "active" ? "disabled" : ""} type="button">${isDispatching ? "Collapse" : "Dispatch"}</button>`
          }
        </div>
        ${isDispatching ? renderDispatchPanel(mission, selectedIds) : renderDispatchSummary(mission, selectedIds)}
      </section>
    </div>
  `;

  bindContractEvents(mission);
}

function getLockedIntelFields(mission) {
  const revealed = mission.revealedIntel || [];
  return contractIntelFields.filter((field) => !revealed.includes(field.key));
}

function isIntelRevealed(mission, key) {
  return (mission.revealedIntel || []).includes(key);
}

function renderContractSummaryIntel(mission) {
  const chips = [];
  if (isIntelRevealed(mission, "damageTypes")) chips.push(`damage ${formatRequirementValue(mission, "damageTypes")}`);
  if (isIntelRevealed(mission, "careerCategories")) chips.push(`career ${formatRequirementValue(mission, "careerCategories")}`);
  if (isIntelRevealed(mission, "weaponTypes")) chips.push(`weapon ${formatRequirementValue(mission, "weaponTypes")}`);
  if (isIntelRevealed(mission, "teamSize")) chips.push(`team ${formatRequirementValue(mission, "teamSize")}`);
  if (chips.length === 0) return "";
  return `<div class="contract-intel-chips">${chips.map((chip) => `<span>${chip}</span>`).join("")}</div>`;
}

function renderIntelAction(mission, field, canAct) {
  const revealed = isIntelRevealed(mission, field.key);
  return `
    <article class="intel-action ${revealed ? "revealed" : ""}">
      <div>
        <strong>${field.label}</strong>
        <p class="muted">${revealed ? formatRequirementValue(mission, field.key) : getIntelHint(field.key)}</p>
      </div>
      <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="${field.key}" ${canAct && !revealed ? "" : "disabled"} type="button">${revealed ? "Known" : `Investigate ${formatInvestigationCost(mission, "targeted")}`}</button>
    </article>
  `;
}

function renderDifficultyBadge(difficulty = 1) {
  const ranks = ["F", "F", "E", "D", "C", "B", "A", "S"];
  const rank = ranks[Math.max(0, Math.min(ranks.length - 1, difficulty))] || "F";
  return `<span class="rank-pill rank-${rank}">${rank}</span>`;
}

function formatRequirementValue(mission, key) {
  const requirements = mission.requirements || {};
  if (key === "damageTypes") return (requirements.damageTypes || []).join(" / ") || "unknown";
  if (key === "careerCategories") return formatCareerRequirements(requirements.careerCategories);
  if (key === "weaponTypes") return (requirements.weaponTypes || []).join(" / ") || "unknown";
  if (key === "teamSize") {
    const teamSize = mission.recommendedTeamSize || {};
    return `${teamSize.min || 1}-${teamSize.max || 4} people`;
  }
  return (mission.intel && mission.intel[key]) || "unknown";
}

function formatCareerRequirements(categories = []) {
  if (categories.length === 0) return "unknown";
  return categories.map((category) => (careerCategories[category] && careerCategories[category].name) || category).join(" + ");
}

function getIntelHint(key) {
  const hints = {
    damageTypes: "Enemy damage type. Use matching armor.",
    careerCategories: "Recommended mercenary career category.",
    weaponTypes: "Recommended weapon or damage direction.",
    teamSize: "Recommended team size range.",
  };
  return hints[key] || "locked";
}

function formatInvestigationCost(mission, mode) {
  const base = mission.investigateCost || 0;
  const config = economyConfig.contracts.costs;
  const multiplier = mode === "random" ? config.randomInvestigationMultiplier : mode === "power" ? config.powerInvestigationMultiplier : 1;
  const buildings = getState().buildings || {};
  const facilityDiscount = (buildings.intel || 0) * economyConfig.facilities.intelInvestigationDiscountPerLevel;
  const discount = Math.min(config.maxInvestigationDiscount, facilityDiscount);
  return `${Math.max(1, Math.round(base * multiplier * (1 - discount)))} gold`;
}

function renderDispatchSummary(mission, selectedIds) {
  if (mission.status === "active") return "";
  const range = getMissionPowerRange(mission);
  const teamPower = getTeamCombatPower(selectedIds);
  return `
    <div class="dispatch-summary">
      <div class="field-list">
        <div class="field"><span>Selected</span><strong>${selectedIds.length > 0 ? `${selectedIds.length} people` : "none"}</strong></div>
        <div class="field"><span>Team power</span><strong>${teamPower}</strong></div>
        <div class="field"><span>Required range</span><strong>${range.low}-${range.high}</strong></div>
      </div>
    </div>
  `;
}

function renderDispatchPanel(mission, selectedIds) {
  const state = getState();
  const availableRoster = state.roster.filter((character) => character.status === "待命");
  const teamPower = getTeamCombatPower(selectedIds);
  const range = getMissionPowerRange(mission);
  return `
    <div class="dispatch-panel">
      <div class="dispatch-status">
        <div class="field"><span>Selected</span><strong>${selectedIds.length}/4</strong></div>
        <div class="field"><span>Team power</span><strong>${teamPower}</strong></div>
        <div class="field"><span>Required range</span><strong>${range.low}-${range.high}</strong></div>
        <button class="primary-button" data-confirm-dispatch="${mission.id}" ${state.gameStatus !== "active" || selectedIds.length === 0 ? "disabled" : ""} type="button">Confirm dispatch</button>
      </div>
      <div class="dispatch-roster">
        ${
          availableRoster.length > 0
            ? availableRoster.map((character) => renderDispatchCharacter(character, selectedIds.includes(character.id))).join("")
            : `<p class="muted">No available mercenaries.</p>`
        }
      </div>
    </div>
  `;
}

function renderDispatchCharacter(character, selected) {
  return renderCharacterCard(character, { mode: "dispatch", selected });
}

function bindContractEvents(mission) {
  const dossier = document.querySelector("#contract-dossier");
  dossier.querySelector("[data-close-contract]").addEventListener("click", () => {
    document.querySelector("#contract-dialog").close();
    openContractId = null;
    dispatchMissionId = null;
    dispatchSelection.clear();
  });

  dossier.querySelectorAll("[data-open-dispatch]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchMissionId = dispatchMissionId === button.dataset.openDispatch ? null : button.dataset.openDispatch;
      if (!dispatchMissionId) dispatchSelection.clear();
      renderContractCard(mission.id);
    });
  });

  dossier.querySelectorAll("[data-investigate-contract]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      const cost = extractCost(button.textContent) || mission.investigateCost || 0;
      if (state.gold < cost) {
        showInsufficientFunds(state.gold, cost);
        return;
      }
      if (!confirmResourceSpend(`Investigate contract: ${mission.name}`, cost)) return;
      const beforeGold = getState().gold;
      investigateMission(button.dataset.investigateContract, button.dataset.intelKey || "random");
      const afterGold = getState().gold;
      if (afterGold >= beforeGold) {
        showSpendFailure("Investigate contract", "Investigation was not completed.");
        return;
      }
      showSpendSuccess("Investigate contract", beforeGold - afterGold, afterGold);
      renderContractCard(mission.id);
    });
  });

  dossier.querySelectorAll("[data-toggle-dispatch-member]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleDispatchMember(button.dataset.toggleDispatchMember);
      renderContractCard(mission.id);
    });
  });

  dossier.querySelectorAll("[data-open-dispatch-character]").forEach((button) => {
    button.addEventListener("click", () => openCharacterSheet(button.dataset.openDispatchCharacter));
  });

  dossier.querySelectorAll("[data-equip-dispatch-character]").forEach((button) => {
    button.addEventListener("click", () => openCharacterSheet(button.dataset.equipDispatchCharacter, { tab: "equipment" }));
  });

  dossier.querySelectorAll("[data-confirm-dispatch]").forEach((button) => {
    button.addEventListener("click", () => {
      startMission(button.dataset.confirmDispatch, [...dispatchSelection]);
      dispatchMissionId = null;
      dispatchSelection.clear();
      document.querySelector("#contract-dialog").close();
      openContractId = null;
    });
  });
}

function toggleDispatchMember(id) {
  if (dispatchSelection.has(id)) {
    dispatchSelection.delete(id);
    return;
  }
  if (dispatchSelection.size >= 4) return;
  dispatchSelection.add(id);
}

function getMissionMembers(mission, roster) {
  return mission.assigned.map((memberId) => roster.find((character) => character.id === memberId)).filter(Boolean);
}

function extractCost(text = "") {
  const match = String(text).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}
