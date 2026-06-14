import { getState } from "../js/state.js";
import { careerCategories, contractIntelFields } from "../data/sampleData.js";
import {
  evaluateMissionFit,
  getContractRiskTag,
  getMissionPowerRange,
  getMissionRisk,
  getMissions,
  getTeamCombatPower,
  investigateMission,
  refreshMission,
  startMission,
} from "../modules/mission.js";
import { openCharacterSheet } from "./characterUI.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";
import { showInsufficientFunds } from "../js/notifications.js";

let openContractId = null;
let dispatchMissionId = null;
let dispatchSelection = new Set();

export function initMissionUI() {}

export function renderMissionUI() {
  const state = getState();
  document.querySelector("#selected-count").textContent = "在契约卡中派遣";

  const roster = state.roster;
  const container = document.querySelector("#mission-list");
  container.innerHTML = getMissions()
    .map((mission) => {
      const isActive = mission.status === "active";
      const assignedMembers = getMissionMembers(mission, roster);
      const revealedIntel = mission.revealedIntel ?? [];
      const lockedIntelCount = getLockedIntelFields(mission).length;
      const powerRange = getMissionPowerRange(mission);
      const risk = getContractRiskTag(mission);
      const canAct = state.gameStatus === "active";
      const revealedSummary = renderContractSummaryIntel(mission);
      return `
        <article class="card contract-card contract-summary-card" data-open-contract="${mission.id}">
          <div class="card-header">
            <div>
              <p class="card-title">${mission.name}</p>
              <p class="muted">${mission.issuer} · ${mission.type} · 截止第 ${mission.expiresDay} 天</p>
            </div>
            <span class="badge">${isActive ? `剩余 ${mission.remaining} 天` : "待派遣"}</span>
          </div>
          <div class="contract-public">
            <span>战力 ${powerRange.low}-${powerRange.high}</span>
            <span>${risk.label}</span>
            <span>${mission.duration} 天</span>
            <span>截止 ${mission.expiresDay}</span>
            <span>${mission.reward.gold} 金</span>
          </div>
          ${revealedSummary}
          ${
            isActive
              ? `<div class="contract-team-strip">${assignedMembers.map((character) => renderMercenaryAvatar(character, { size: "small" })).join("")}<span>执行中</span></div>`
              : `<p class="muted">${lockedIntelCount} 项关键情报未调查。点开查看详情、调查或派遣。</p>`
          }
          <div class="button-row">
            <button class="primary-button" data-view-contract="${mission.id}" type="button">${isActive ? "查看" : "打开契约卡"}</button>
            <button class="ghost-button" data-refresh-mission="${mission.id}" ${!canAct || isActive ? "disabled" : ""} type="button">刷新 ${mission.refreshCost ?? 0} 金</button>
          </div>
        </article>
      `;
    })
    .join("");

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
      const state = getState();
      const mission = state.missions.find((item) => item.id === button.dataset.refreshMission);
      const cost = mission?.refreshCost ?? 0;
      if (state.gold < cost) {
        showInsufficientFunds(state.gold, cost);
        return;
      }
      refreshMission(button.dataset.refreshMission);
    });
  });

  if (openContractId && document.querySelector("#contract-dialog")?.open) {
    renderContractCard(openContractId);
  }
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
    document.querySelector("#contract-dialog")?.close();
    openContractId = null;
    dispatchMissionId = null;
    dispatchSelection.clear();
    return;
  }

  const roster = state.roster;
  const assignedMembers = getMissionMembers(mission, roster);
  const assignedNames = assignedMembers.map((character) => character.name).join("、");
  const revealedIntel = mission.revealedIntel ?? [];
  const isActive = mission.status === "active";
  const selectedIds = [...dispatchSelection].filter((memberId) => roster.some((character) => character.id === memberId));
  if (selectedIds.length !== dispatchSelection.size) dispatchSelection = new Set(selectedIds);
  const fit = isActive ? null : evaluateMissionFit(selectedIds, mission);
  const risk = fit?.risk ?? getMissionRisk(selectedIds, mission);
  const teamPower = getTeamCombatPower(selectedIds);
  const powerRange = getMissionPowerRange(mission);
  const isDispatching = dispatchMissionId === mission.id && !isActive;
  const lockedIntelFields = getLockedIntelFields(mission);
  const canAct = state.gameStatus === "active" && !isActive;

  const dossier = document.querySelector("#contract-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">CONTRACT / ${mission.typeCode ?? mission.type} / DAY ${mission.issueDay}-${mission.expiresDay}</div>
        <h2 class="dossier-title">${mission.name}</h2>
        <p class="muted">${mission.issuer} · ${mission.type} · ${mission.acquisition ?? "广播网"}</p>
      </div>
      <button class="ghost-button" data-close-contract type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>公开情报</h3>
        <div class="field-list">
          <div class="field"><span>发布日</span><strong>第 ${mission.issueDay} 天</strong></div>
          <div class="field"><span>截止日</span><strong>第 ${mission.expiresDay} 天</strong></div>
          <div class="field"><span>执行时间</span><strong>${mission.duration} 天</strong></div>
          <div class="field"><span>难度</span><strong>${mission.difficulty}</strong></div>
          <div class="field"><span>战力需求</span><strong>${powerRange.low}-${powerRange.high}</strong></div>
          <div class="field"><span>情报精度</span><strong>${powerRange.level}/3</strong></div>
          <div class="field"><span>报酬</span><strong>${mission.reward.gold} 金 / ${mission.reward.reputation} 声望池</strong></div>
          <div class="field"><span>当前风险</span><strong>${isActive ? `剩余 ${mission.remaining} 天` : risk.label}</strong></div>
          <div class="field"><span>已选战力</span><strong>${teamPower}</strong></div>
        </div>
      </section>
      <section class="dossier-section">
        <h3>已知要求</h3>
        <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
        <div class="field-list compact-field-list">
          ${renderKnownRequirementField(mission, "damageTypes")}
          ${renderKnownRequirementField(mission, "careerCategories")}
          ${renderKnownRequirementField(mission, "weaponTypes")}
          ${renderKnownRequirementField(mission, "teamSize")}
        </div>
        ${
          isActive
            ? `<div class="contract-team-strip contract-team-strip-large">${assignedMembers.map((character) => renderMercenaryAvatar(character)).join("")}<span>${assignedNames || "未知队伍"}</span></div>`
            : `<p class="muted">战力需求是隐藏定值，当前仅显示估算区间；调查可收窄区间。</p>`
        }
      </section>
      <section class="dossier-section wide">
        <h3>简报</h3>
        <p class="contract-brief">${mission.description}</p>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>调查</h3>
            <p class="muted">定向调查更贵；随机调查更便宜但不可控。战力区间可重复调查直到精度 3。</p>
          </div>
          <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="random" ${canAct && (lockedIntelFields.length > 0 || powerRange.level < 3) ? "" : "disabled"} type="button">随机调查 ${formatInvestigationCost(mission, "random")}</button>
        </div>
        <div class="intel-action-grid">
          <article class="intel-action ${powerRange.level >= 3 ? "revealed" : ""}">
            <div>
              <strong>战力需求区间</strong>
              <p class="muted">当前 ${powerRange.low}-${powerRange.high}，精度 ${powerRange.level}/3。</p>
            </div>
            <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="power" ${canAct && powerRange.level < 3 ? "" : "disabled"} type="button">细化 ${formatInvestigationCost(mission, "power")}</button>
          </article>
          ${contractIntelFields.map((field) => renderIntelAction(mission, field, canAct)).join("")}
        </div>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>派遣</h3>
            <p class="muted">${isActive ? "该契约已经在执行中。" : "从当前待命佣兵中选择队员；点开人物卡可查看详情或更换装备。"}</p>
          </div>
          ${
            isActive
              ? `<span class="badge">执行中</span>`
              : `<button class="primary-button" data-open-dispatch="${mission.id}" ${state.gameStatus !== "active" ? "disabled" : ""} type="button">${isDispatching ? "收起派遣" : "派遣队员"}</button>`
          }
        </div>
        ${isDispatching ? renderDispatchPanel(mission, selectedIds) : renderDispatchSummary(mission, selectedIds)}
      </section>
    </div>
  `;

  bindContractEvents(mission);
}

function formatCareerRequirements(categories = []) {
  if (categories.length === 0) return "未明";
  return categories.map((category) => careerCategories[category]?.name ?? category).join(" + ");
}

function getLockedIntelFields(mission) {
  const revealed = mission.revealedIntel ?? [];
  return contractIntelFields.filter((field) => !revealed.includes(field.key));
}

function isIntelRevealed(mission, key) {
  return (mission.revealedIntel ?? []).includes(key);
}

function renderContractSummaryIntel(mission) {
  const chips = [];
  if (isIntelRevealed(mission, "damageTypes")) chips.push(`敌伤 ${formatRequirementValue(mission, "damageTypes")}`);
  if (isIntelRevealed(mission, "careerCategories")) chips.push(`职业 ${formatRequirementValue(mission, "careerCategories")}`);
  if (isIntelRevealed(mission, "weaponTypes")) chips.push(`武器 ${formatRequirementValue(mission, "weaponTypes")}`);
  if (isIntelRevealed(mission, "teamSize")) chips.push(`人数 ${formatRequirementValue(mission, "teamSize")}`);
  if (chips.length === 0) return "";
  return `<div class="contract-intel-chips">${chips.map((chip) => `<span>${chip}</span>`).join("")}</div>`;
}

function renderKnownRequirementField(mission, key) {
  const field = contractIntelFields.find((item) => item.key === key);
  return `<div class="field"><span>${field?.label ?? key}</span><strong>${isIntelRevealed(mission, key) ? formatRequirementValue(mission, key) : "未调查"}</strong></div>`;
}

function renderIntelAction(mission, field, canAct) {
  const revealed = isIntelRevealed(mission, field.key);
  return `
    <article class="intel-action ${revealed ? "revealed" : ""}">
      <div>
        <strong>${field.label}</strong>
        <p class="muted">${revealed ? formatRequirementValue(mission, field.key) : getIntelHint(field.key)}</p>
      </div>
      <button class="ghost-button" data-investigate-contract="${mission.id}" data-intel-key="${field.key}" ${canAct && !revealed ? "" : "disabled"} type="button">${revealed ? "已获取" : `调查 ${formatInvestigationCost(mission, "targeted")}`}</button>
    </article>
  `;
}

function formatRequirementValue(mission, key) {
  if (key === "damageTypes") return mission.requirements?.damageTypes?.join(" / ") || "未明";
  if (key === "careerCategories") return formatCareerRequirements(mission.requirements?.careerCategories);
  if (key === "weaponTypes") return mission.requirements?.weaponTypes?.join(" / ") || "未明";
  if (key === "teamSize") return `${mission.recommendedTeamSize?.min ?? 1}-${mission.recommendedTeamSize?.max ?? 4} 人`;
  return mission.intel?.[key] ?? "未明";
}

function getIntelHint(key) {
  const hints = {
    damageTypes: "敌人主要伤害类型，用于选择对应防具。",
    careerCategories: "建议带上的佣兵职业大类。",
    weaponTypes: "推荐武器类型和伤害配装方向。",
    teamSize: "推荐派遣人数区间。",
  };
  return hints[key] ?? "未调查";
}

function formatInvestigationCost(mission, mode) {
  const base = mission.investigateCost ?? 0;
  const multiplier = mode === "random" ? 0.65 : mode === "power" ? 0.85 : 1;
  return `${Math.max(1, Math.round(base * multiplier))} 金`;
}

function renderDispatchSummary(mission, selectedIds) {
  if (mission.status === "active") return "";
  const range = getMissionPowerRange(mission);
  const teamPower = getTeamCombatPower(selectedIds);
  const fit = evaluateMissionFit(selectedIds, mission);
  return `
    <div class="dispatch-summary">
      <div class="field-list">
        <div class="field"><span>已选队员</span><strong>${selectedIds.length > 0 ? `${selectedIds.length} 人` : "未选择"}</strong></div>
        <div class="field"><span>队伍战力</span><strong>${teamPower}</strong></div>
        <div class="field"><span>需求区间</span><strong>${range.low}-${range.high}</strong></div>
        <div class="field"><span>风险判断</span><strong>${fit.risk.label}</strong></div>
      </div>
      <p class="muted">${fit.risk.description}</p>
    </div>
  `;
}

function renderDispatchPanel(mission, selectedIds) {
  const state = getState();
  const availableRoster = state.roster.filter((character) => character.status === "待命");
  const fit = evaluateMissionFit(selectedIds, mission);
  const teamPower = getTeamCombatPower(selectedIds);
  const range = getMissionPowerRange(mission);
  return `
    <div class="dispatch-panel">
      <div class="dispatch-status">
        <div class="field"><span>已选</span><strong>${selectedIds.length}/4 人</strong></div>
        <div class="field"><span>队伍战力</span><strong>${teamPower}</strong></div>
        <div class="field"><span>需求区间</span><strong>${range.low}-${range.high}</strong></div>
        <div class="field"><span>风险判断</span><strong>${fit.risk.label}</strong></div>
        <button class="primary-button" data-confirm-dispatch="${mission.id}" ${state.gameStatus !== "active" || selectedIds.length === 0 ? "disabled" : ""} type="button">确认派遣</button>
      </div>
      <div class="dispatch-fit-note">
        <span>${fit.risk.description}</span>
        <span>人数偏差惩罚 ${fit.teamSizePenalty}</span>
        <span>标签匹配 ${fit.matchingTags}</span>
        <span>职业匹配 ${fit.matchingCareerCategories}</span>
        ${isIntelRevealed(mission, "weaponTypes") ? `<span>武器匹配 ${fit.matchingWeapons}</span>` : ""}
        ${isIntelRevealed(mission, "damageTypes") ? `<span>伤害匹配 ${fit.matchingDamageTypes}</span>` : ""}
        ${fit.careerCategoryPenalty > 0 ? `<span>职业缺口惩罚 ${fit.careerCategoryPenalty}</span>` : ""}
      </div>
      <div class="dispatch-roster">
        ${
          availableRoster.length > 0
            ? availableRoster.map((character) => renderDispatchCharacter(character, selectedIds.includes(character.id))).join("")
            : `<p class="muted">当前没有可派遣的待命佣兵。</p>`
        }
      </div>
    </div>
  `;
}

function renderDispatchCharacter(character, selected) {
  return `
    <article class="dispatch-character ${selected ? "selected" : ""}">
      <div>
        <div class="card-header">
          <div class="identity-line">
            ${renderMercenaryAvatar(character)}
            <div>
              <p class="card-title">${character.name}</p>
              <p class="muted">${character.className} · ${formatRank(character.rank)} · ${character.status}</p>
            </div>
          </div>
          <button class="${selected ? "ghost-button" : "primary-button"}" data-toggle-dispatch-member="${character.id}" type="button">${selected ? "移出" : "加入"}</button>
        </div>
        <div class="stat-line">
          <span>战力 ${character.combatPower ?? 0}</span>
          <span>压力 ${character.stress}</span>
          <span>伤势 ${character.wound}</span>
          <span>特性 ${character.traits?.length ?? 0}</span>
        </div>
        <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      </div>
      <div class="button-row">
        <button class="link-button" data-open-dispatch-character="${character.id}" type="button">查看人物卡</button>
        <button class="link-button" data-equip-dispatch-character="${character.id}" type="button">更换装备</button>
      </div>
    </article>
  `;
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
      const costText = button.textContent.match(/(\d+) 金/);
      const cost = costText ? Number(costText[1]) : mission.investigateCost ?? 0;
      if (state.gold < cost) {
        showInsufficientFunds(state.gold, cost);
        return;
      }
      investigateMission(button.dataset.investigateContract, button.dataset.intelKey ?? "random");
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
      const selectedIds = [...dispatchSelection];
      startMission(button.dataset.confirmDispatch, selectedIds);
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

function formatRank(rank) {
  return rank === "无" ? "无等级" : `${rank}级`;
}
