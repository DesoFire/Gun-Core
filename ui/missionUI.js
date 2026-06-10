import { getState } from "../js/state.js";
import { contractIntelFields } from "../data/sampleData.js";
import { calculateMissionChance, getMissions, investigateMission, refreshMission, startMission } from "../modules/mission.js";

let getSelectedCharacterIds = () => [];
let clearSelectedCharacters = () => {};

export function initMissionUI({ getSelectedIds, clearSelected }) {
  getSelectedCharacterIds = getSelectedIds;
  clearSelectedCharacters = clearSelected;
}

export function renderMissionUI() {
  const selectedIds = getSelectedCharacterIds();
  document.querySelector("#selected-count").textContent = selectedIds.length > 0 ? `已选 ${selectedIds.length} 人` : "未选择队伍";

  const roster = getState().roster;
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
      const canInvestigate = !isActive && lockedIntelCount > 0;
      return `
        <article class="card contract-card">
          <div class="card-header">
            <div>
              <p class="card-title">${mission.name}</p>
              <p class="muted">发布方 ${mission.issuer} · ${mission.type} · ${mission.acquisition ?? "广撒网"}</p>
            </div>
            <span class="badge">${isActive ? `剩余 ${mission.remaining} 天` : `${chance}%`}</span>
          </div>
          <p class="contract-brief">${mission.description}</p>
          <div class="contract-public">
            <span>难度 ${mission.difficulty}</span>
            <span>${mission.duration} 天</span>
            <span>${mission.reward.gold} 金</span>
            <span>${mission.reward.reputation} 声望</span>
          </div>
          <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
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
          <p class="muted">${isActive ? `执行中：${assignedNames}` : `选择佣兵后可以派遣。最多 4 人。剩余 ${lockedIntelCount} 项情报可调查。`}</p>
          <div class="button-row">
            <button class="primary-button" data-start-mission="${mission.id}" ${isActive || selectedIds.length === 0 ? "disabled" : ""}>接取</button>
            <button class="ghost-button" data-investigate-mission="${mission.id}" ${canInvestigate ? "" : "disabled"}>调查 ${mission.investigateCost ?? 0} 金</button>
            <button class="ghost-button" data-refresh-mission="${mission.id}" ${isActive ? "disabled" : ""}>刷新 ${mission.refreshCost ?? 0} 金</button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-start-mission]").forEach((button) => {
    button.addEventListener("click", () => {
      startMission(button.dataset.startMission, selectedIds);
      clearSelectedCharacters();
    });
  });

  container.querySelectorAll("[data-investigate-mission]").forEach((button) => {
    button.addEventListener("click", () => {
      investigateMission(button.dataset.investigateMission);
    });
  });

  container.querySelectorAll("[data-refresh-mission]").forEach((button) => {
    button.addEventListener("click", () => {
      refreshMission(button.dataset.refreshMission);
    });
  });
}
