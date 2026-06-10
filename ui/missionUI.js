import { getState } from "../js/state.js";
import { calculateMissionChance, getMissions, startMission } from "../modules/mission.js";

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
      return `
        <article class="card">
          <div class="card-header">
            <div>
              <p class="card-title">${mission.name}</p>
              <p class="muted">难度 ${mission.difficulty} · ${mission.duration} 天 · 奖励 ${mission.reward.gold} 金 / ${mission.reward.reputation} 声望</p>
            </div>
            <span class="badge">${isActive ? `剩余 ${mission.remaining} 天` : `${chance}%`}</span>
          </div>
          <div class="badge-row">${mission.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
          <p class="muted">${isActive ? `执行中：${assignedNames}` : "选择佣兵后可以派遣。最多 4 人。"}</p>
          <div class="button-row">
            <button class="primary-button" data-start-mission="${mission.id}" ${isActive || selectedIds.length === 0 ? "disabled" : ""}>派遣</button>
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
}
