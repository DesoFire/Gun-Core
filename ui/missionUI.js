import { getState } from "../js/state.js";
import { contractIntelFields } from "../data/sampleData.js";
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
      const lockedIntelCount = contractIntelFields.filter((field) => !revealedIntel.includes(field.key)).length;
      const powerRange = getMissionPowerRange(mission);
      const risk = getContractRiskTag(mission);
      const canAct = state.gameStatus === "active";
      const canInvestigate = canAct && !isActive && (lockedIntelCount > 0 || powerRange.level < 3);
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
            <span>难度 ${mission.difficulty}</span>
            <span>战力 ${powerRange.low}-${powerRange.high}</span>
            <span>建议 ${mission.recommendedTeamSize?.min ?? 1}-${mission.recommendedTeamSize?.max ?? 4} 人</span>
            <span>${risk.label}</span>
            <span>${mission.duration} 天</span>
            <span>${mission.reward.gold} 金</span>
          </div>
          ${
            isActive
              ? `<div class="contract-team-strip">${assignedMembers.map((character) => renderMercenaryAvatar(character, { size: "small" })).join("")}<span>执行中</span></div>`
              : `<p class="muted">剩余 ${lockedIntelCount} 项情报未调查。点开契约卡派遣队员。</p>`
          }
          <div class="button-row">
            <button class="primary-button" data-view-contract="${mission.id}" type="button">${isActive ? "查看" : "打开契约卡"}</button>
            <button class="ghost-button" data-investigate-mission="${mission.id}" ${canInvestigate ? "" : "disabled"} type="button">调查 ${mission.investigateCost ?? 0} 金</button>
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

  container.querySelectorAll("[data-investigate-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      investigateMission(button.dataset.investigateMission);
    });
  });

  container.querySelectorAll("[data-refresh-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
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
          <div class="field"><span>推荐人数</span><strong>${mission.recommendedTeamSize?.min ?? 1}-${mission.recommendedTeamSize?.max ?? 4}</strong></div>
          <div class="field"><span>情报精度</span><strong>${powerRange.level}/3</strong></div>
          <div class="field"><span>报酬</span><strong>${mission.reward.gold} 金 / ${mission.reward.reputation} 声望池</strong></div>
          <div class="field"><span>当前风险</span><strong>${isActive ? `剩余 ${mission.remaining} 天` : risk.label}</strong></div>
          <div class="field"><span>已选战力</span><strong>${teamPower}</strong></div>
        </div>
      </section>
      <section class="dossier-section">
        <h3>行动标签</h3>
        <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
        <div class="field-list compact-field-list">
          <div class="field"><span>推荐武器</span><strong>${mission.requirements?.weaponTypes?.join(" / ") || "未明"}</strong></div>
          <div class="field"><span>推荐伤害</span><strong>${mission.requirements?.damageTypes?.join(" / ") || "未明"}</strong></div>
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
        <h3>可调查情报</h3>
        <div class="intel-list">
          ${contractIntelFields
            .map((field) => {
              const isRevealed = revealedIntel.includes(field.key);
              return `
                <div class="intel-row ${isRevealed ? "revealed" : ""}">
                  <span>${field.label}</span>
                  <strong>${isRevealed ? mission.intel?.[field.key] ?? "情报缺失" : "未调查"}</strong>
                </div>
              `;
            })
            .join("")}
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
        <span>武器匹配 ${fit.matchingWeapons}</span>
        <span>伤害匹配 ${fit.matchingDamageTypes}</span>
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
          <span>生命 ${character.hp}/${character.maxHp}</span>
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
