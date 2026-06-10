import { getState } from "../js/state.js";
import { contractIntelFields } from "../data/sampleData.js";
import { calculateMissionChance, getMissions, investigateMission, refreshMission, startMission } from "../modules/mission.js";

let getSelectedCharacterIds = () => [];
let clearSelectedCharacters = () => {};
let openContractId = null;

export function initMissionUI({ getSelectedIds, clearSelected }) {
  getSelectedCharacterIds = getSelectedIds;
  clearSelectedCharacters = clearSelected;
}

export function renderMissionUI() {
  const selectedIds = getSelectedCharacterIds();
  document.querySelector("#selected-count").textContent = selectedIds.length > 0 ? `已选 ${selectedIds.length} 人` : "未选择队伍";

  const state = getState();
  const roster = state.roster;
  const container = document.querySelector("#mission-list");
  container.innerHTML = getMissions()
    .map((mission) => {
      const isActive = mission.status === "active";
      const chance = isActive ? null : calculateMissionChance(selectedIds, mission);
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
            <span class="badge">${isActive ? `剩余 ${mission.remaining} 天` : `${chance}%`}</span>
          </div>
          <div class="contract-public">
            <span>难度 ${mission.difficulty}</span>
            <span>${mission.duration} 天</span>
            <span>${mission.reward.gold} 金</span>
            <span>${mission.reward.reputation} 声望</span>
          </div>
          <p class="muted">${isActive ? `执行中：${assignedNames}` : `剩余 ${lockedIntelCount} 项情报未调查。点击查看契约卡。`}</p>
          <div class="button-row">
            <button class="ghost-button" data-view-contract="${mission.id}" type="button">查看</button>
            <button class="primary-button" data-start-mission="${mission.id}" ${!canAct || isActive || selectedIds.length === 0 ? "disabled" : ""}>接取</button>
            <button class="ghost-button" data-investigate-mission="${mission.id}" ${canInvestigate ? "" : "disabled"}>调查 ${mission.investigateCost ?? 0} 金</button>
            <button class="ghost-button" data-refresh-mission="${mission.id}" ${!canAct || isActive ? "disabled" : ""}>刷新 ${mission.refreshCost ?? 0} 金</button>
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

  container.querySelectorAll("[data-start-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      startMission(button.dataset.startMission, selectedIds);
      clearSelectedCharacters();
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
  renderContractCard(id);
  document.querySelector("#contract-dialog").showModal();
}

function renderContractCard(id) {
  const state = getState();
  const mission = getMissions().find((item) => item.id === id);
  if (!mission) {
    document.querySelector("#contract-dialog")?.close();
    openContractId = null;
    return;
  }

  const roster = state.roster;
  const assignedNames = mission.assigned
    .map((memberId) => roster.find((character) => character.id === memberId)?.name)
    .filter(Boolean)
    .join("、");
  const revealedIntel = mission.revealedIntel ?? [];
  const isActive = mission.status === "active";
  const selectedIds = getSelectedCharacterIds();
  const chance = isActive ? null : calculateMissionChance(selectedIds, mission);

  const dossier = document.querySelector("#contract-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">CONTRACT / ${mission.typeCode ?? mission.type} / DAY ${mission.issueDay}-${mission.expiresDay}</div>
        <h2 class="dossier-title">${mission.name}</h2>
        <p class="muted">${mission.issuer} · ${mission.type} · ${mission.acquisition ?? "广撒网"}</p>
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
        <p class="muted">${isActive ? `执行队伍：${assignedNames || "未知"}` : "外部列表只展示摘要，完整情报在此查看。"}</p>
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
    </div>
  `;

  dossier.querySelector("[data-close-contract]").addEventListener("click", () => {
    document.querySelector("#contract-dialog").close();
    openContractId = null;
  });
}
