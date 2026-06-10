import { getState } from "../js/state.js";
import { contractIntelFields } from "../data/sampleData.js";
import { calculateMissionChance, getMissions, investigateMission, refreshMission, startMission } from "../modules/mission.js";
import { openCharacterSheet } from "./characterUI.js";

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
      const assignedNames = mission.assigned
        .map((id) => roster.find((character) => character.id === id)?.name)
        .filter(Boolean)
        .join("、");
      const revealedIntel = mission.revealedIntel ?? [];
      const lockedIntelCount = contractIntelFields.filter((field) => !revealedIntel.includes(field.key)).length;
      const canAct = state.gameStatus === "active";
      const canInvestigate = canAct && !isActive && lockedIntelCount > 0;
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
            <span>${mission.duration} 天</span>
            <span>${mission.reward.gold} 金</span>
            <span>${mission.reward.reputation} 声望</span>
          </div>
          <p class="muted">${isActive ? `执行中：${assignedNames}` : `剩余 ${lockedIntelCount} 项情报未调查。点开契约卡派遣队员。`}</p>
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
  const assignedNames = mission.assigned
    .map((memberId) => roster.find((character) => character.id === memberId)?.name)
    .filter(Boolean)
    .join("、");
  const revealedIntel = mission.revealedIntel ?? [];
  const isActive = mission.status === "active";
  const selectedIds = [...dispatchSelection].filter((memberId) => roster.some((character) => character.id === memberId));
  if (selectedIds.length !== dispatchSelection.size) dispatchSelection = new Set(selectedIds);
  const chance = isActive ? null : calculateMissionChance(selectedIds, mission);
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
          <div class="field"><span>报酬</span><strong>${mission.reward.gold} 金 / ${mission.reward.reputation} 声望</strong></div>
          <div class="field"><span>当前估算</span><strong>${isActive ? `剩余 ${mission.remaining} 天` : `${chance}%`}</strong></div>
        </div>
      </section>
      <section class="dossier-section">
        <h3>行动标签</h3>
        <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
        <p class="muted">${isActive ? `执行队伍：${assignedNames || "未知"}` : "在本契约卡内点击派遣，然后选择待命队员。"}</p>
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
  return `
    <div class="dispatch-summary">
      <div class="field-list">
        <div class="field"><span>已选队员</span><strong>${selectedIds.length > 0 ? `${selectedIds.length} 人` : "未选择"}</strong></div>
        <div class="field"><span>预估成功率</span><strong>${calculateMissionChance(selectedIds, mission)}%</strong></div>
      </div>
    </div>
  `;
}

function renderDispatchPanel(mission, selectedIds) {
  const state = getState();
  const availableRoster = state.roster.filter((character) => character.status === "待命");
  const chance = calculateMissionChance(selectedIds, mission);
  return `
    <div class="dispatch-panel">
      <div class="dispatch-status">
        <div class="field"><span>已选</span><strong>${selectedIds.length}/4 人</strong></div>
        <div class="field"><span>预估成功率</span><strong>${chance}%</strong></div>
        <button class="primary-button" data-confirm-dispatch="${mission.id}" ${state.gameStatus !== "active" || selectedIds.length === 0 ? "disabled" : ""} type="button">确认派遣</button>
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
          <div>
            <p class="card-title">${character.name}</p>
            <p class="muted">${character.className} · ${formatRank(character.rank)} · ${character.status}</p>
          </div>
          <button class="${selected ? "ghost-button" : "primary-button"}" data-toggle-dispatch-member="${character.id}" type="button">${selected ? "移出" : "加入"}</button>
        </div>
        <div class="stat-line">
          <span>生命 ${character.hp}/${character.maxHp}</span>
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

function formatRank(rank) {
  return rank === "无" ? "无等级" : `${rank}级`;
}
