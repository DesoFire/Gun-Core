import {
  canEquipItemToSlot,
  createCharacter,
  equipItem,
  getCharacter,
  getCharacterClasses,
  getCharacters,
  getEquipmentSlots,
  getRecruitPool,
  hasPlayerCharacter,
  hireRecruit,
  recruitCost,
  refreshRecruits,
  renderCharacterDossier,
  spendEnhancementPoint,
  unequipItem,
} from "../modules/character.js";
import { getInventory } from "../modules/inventory.js";
import { calculateCharacterCombatPower } from "../modules/combatPower.js";
import { getWeaponTagNames } from "../modules/weaponGenerator.js";
import { addLog, getState } from "../js/state.js";
import { identityFee } from "../modules/faction.js";
import { showInsufficientFunds } from "../js/notifications.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";

let requestRender = () => {};
let openDossierCharacterId = null;
let activeDossierTab = "attributes";
let selectedEquipmentSlot = "weapon";

export function initCharacterUI({ onRenderNeeded }) {
  requestRender = onRenderNeeded;
  setupClassOptions();

  document.querySelector("#refresh-recruits").addEventListener("click", handleRefreshRecruits);
  document.querySelector("#create-player").addEventListener("click", openPlayerDialog);
  document.querySelector("#player-form").addEventListener("submit", handlePlayerSubmit);
}

export function renderCharacterUI() {
  const isActive = getState().gameStatus === "active";
  const refreshButton = document.querySelector("#refresh-recruits");
  refreshButton.textContent = `刷新 ${getRecruitRefreshCost()} 金`;
  refreshButton.disabled = !isActive;
  document.querySelector("#create-player").disabled = !isActive || hasPlayerCharacter();
  renderRoster();
  renderRecruits();
  if (openDossierCharacterId && document.querySelector("#mercenary-dialog")?.open) {
    renderCharacterSheet(openDossierCharacterId);
  }
}

function renderRoster() {
  const container = document.querySelector("#roster-list");
  const roster = getCharacters();
  if (roster.length === 0) {
    container.innerHTML = `<p class="muted">还没有佣兵。先去招募或创建玩家角色。</p>`;
    return;
  }

  container.innerHTML = roster.map(renderCharacterCard).join("");
  container.querySelectorAll("[data-open-character]").forEach((card) => {
    card.addEventListener("click", () => openCharacterSheet(card.dataset.openCharacter));
  });
  container.querySelectorAll("[data-open-character-button]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openCharacterSheet(button.dataset.openCharacterButton);
    });
  });
}

function renderCharacterCard(character) {
  const rankLabel = formatRank(character.rank);
  const combatPower = calculateCharacterCombatPower(character);
  return `
    <article class="card character-card" data-open-character="${character.id}">
      <div class="card-header">
        <div class="identity-line">
          ${renderMercenaryAvatar(character)}
          <div>
            <p class="card-title">${character.name}</p>
            <p class="muted">${character.isPlayer ? "玩家角色 · " : ""}${character.careerCategoryName ?? "未分类"} / ${character.className} · ${rankLabel}</p>
          </div>
        </div>
        <span class="badge">${character.status}</span>
      </div>
      <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      <div class="character-kpi-grid">
        <div class="character-kpi primary"><span>战力</span><strong>${combatPower}</strong></div>
        <div class="character-kpi ${character.stress >= 60 ? "danger" : character.stress >= 30 ? "warning" : ""}"><span>压力</span><strong>${character.stress}</strong></div>
        <div class="character-kpi ${character.wound > 0 ? "danger" : ""}"><span>伤势</span><strong>${character.wound}</strong></div>
        <div class="character-kpi"><span>身份费</span><strong>${identityFee(character)}/天</strong></div>
      </div>
      <div class="character-meta-row">
        <span>知名度 ${character.notoriety}</span>
        <span>正面 ${character.positiveConditions?.length ?? 0}</span>
        <span>负面 ${character.conditions?.length ?? 0}</span>
        <span>特性 ${character.traits?.length ?? 0}</span>
      </div>
      <button class="link-button" data-open-character-button="${character.id}" type="button">查看人物卡 / 更换装备</button>
    </article>
  `;
}

function renderRecruits() {
  const container = document.querySelector("#recruit-list");
  const state = getState();
  container.innerHTML = getRecruitPool()
    .map((character) => {
      const cost = recruitCost(character);
      const combatPower = calculateCharacterCombatPower(character);
      return `
        <article class="card recruit-card">
          <div class="card-header">
            <div class="identity-line">
              ${renderMercenaryAvatar(character)}
              <div>
                <p class="card-title">${character.name}</p>
                <p class="muted">${character.careerCategoryName ?? "未分类"} / ${character.className}</p>
              </div>
            </div>
            <button class="primary-button" data-recruit="${character.id}" ${state.gameStatus !== "active" ? "disabled" : ""} type="button">招募 ${cost} 金</button>
          </div>
          <div class="character-kpi-grid recruit-kpis">
            <div class="character-kpi primary"><span>战力</span><strong>${combatPower}</strong></div>
            <div class="character-kpi"><span>知名度</span><strong>${character.notoriety}</strong></div>
            <div class="character-kpi"><span>日薪</span><strong>${identityFee(character)}/天</strong></div>
            <div class="character-kpi cost"><span>雇佣费</span><strong>${cost}</strong></div>
          </div>
          <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-recruit]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      const recruit = getRecruitPool().find((character) => character.id === button.dataset.recruit);
      const cost = recruit ? recruitCost(recruit) : 0;
      if (state.gold < cost) {
        showInsufficientFunds(state.gold, cost);
        return;
      }
      hireRecruit(button.dataset.recruit);
    });
  });
}

function handleRefreshRecruits() {
  const state = getState();
  const cost = getRecruitRefreshCost();
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return;
  }
  refreshRecruits();
}

function getRecruitRefreshCost() {
  return 15;
}

export function openCharacterSheet(id, options = {}) {
  openDossierCharacterId = id;
  activeDossierTab = options.tab ?? "attributes";
  selectedEquipmentSlot = "weapon";
  renderCharacterSheet(id);
  document.querySelector("#mercenary-dialog").showModal();
}

function renderCharacterSheet(id) {
  const character = getCharacter(id);
  if (!character) return;
  const rankLabel = formatRank(character.rank);

  const dossier = document.querySelector("#mercenary-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div class="identity-line identity-line-large">
          ${renderMercenaryAvatar(character, { size: "large" })}
          <div>
            <div class="dossier-code">SSS-GUILD DOSSIER / FIELD SHEET</div>
          <button class="editable-title" data-edit-character-name="${character.id}" type="button">${character.name}</button>
          <button class="editable-callsign" data-edit-character-callsign="${character.id}" type="button">外号：${character.callsign ?? "未登记"}</button>
          <p class="muted">${character.careerCategoryName ?? "未分类"} / ${character.className} · ${rankLabel} · ${character.status}</p>
          </div>
        </div>
      <button class="ghost-button" data-close-dossier type="button">关闭</button>
    </div>
    <div class="subtabbar" aria-label="人物卡切换">
      <button class="subtab-button ${activeDossierTab === "attributes" ? "active" : ""}" data-dossier-tab="attributes" type="button">属性</button>
      <button class="subtab-button ${activeDossierTab === "equipment" ? "active" : ""}" data-dossier-tab="equipment" type="button">装备</button>
      <button class="subtab-button ${activeDossierTab === "archive" ? "active" : ""}" data-dossier-tab="archive" type="button">档案</button>
    </div>
    <div class="dossier-content">${renderActiveSheetTab(character)}</div>
  `;

  dossier.querySelector("[data-close-dossier]").addEventListener("click", () => {
    document.querySelector("#mercenary-dialog").close();
    openDossierCharacterId = null;
  });
  dossier.querySelectorAll("[data-dossier-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeDossierTab = button.dataset.dossierTab;
      renderCharacterSheet(id);
    });
  });
  dossier.querySelectorAll("[data-spend-enhancement]").forEach((button) => {
    button.addEventListener("click", () => spendEnhancementPoint(button.dataset.spendEnhancement));
  });
  dossier.querySelectorAll("[data-edit-character-name]").forEach((button) => {
    button.addEventListener("click", () => editCharacterIdentity(button.dataset.editCharacterName, "name"));
  });
  dossier.querySelectorAll("[data-edit-character-callsign]").forEach((button) => {
    button.addEventListener("click", () => editCharacterIdentity(button.dataset.editCharacterCallsign, "callsign"));
  });
  bindEquipmentEvents(id);
}

function renderActiveSheetTab(character) {
  if (activeDossierTab === "equipment") return renderEquipmentTab(character);
  if (activeDossierTab === "archive") return `<div class="dossier-grid">${renderCharacterDossier(character)}</div>`;
  return renderAttributesTab(character);
}

function editCharacterIdentity(characterId, field) {
  const character = getCharacter(characterId);
  if (!character) return;
  const label = field === "name" ? "姓名" : "外号";
  const currentValue = field === "name" ? character.name : character.callsign ?? "";
  const value = window.prompt(`修改${label}`, currentValue);
  if (value === null) return;
  const trimmed = value.trim();
  if (!trimmed) return;
  updateCharacter(characterId, { [field]: trimmed });
  renderCharacterSheet(characterId);
}

function renderAttributesTab(character) {
  const assignedMission =
    character.status.startsWith("履行") || character.status.startsWith("执行") ? character.status : "无";
  const combatPower = calculateCharacterCombatPower(character);
  const state = getState();
  const canEnhance = state.gameStatus === "active" && character.status !== "阵亡" && (state.enhancementPoints ?? 0) > 0;
  return `
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>基本状态</h3>
        <div class="field-list">
          <div class="field"><span>战斗力</span><strong>${combatPower}</strong></div>
          <div class="field"><span>基础战力</span><strong>${character.combatPower ?? 0}</strong></div>
          <div class="field"><span>当前契约</span><strong>${assignedMission}</strong></div>
          <div class="field"><span>评级</span><strong>${formatRank(character.rank)}</strong></div>
          <div class="field"><span>晋升序号</span><strong>${character.level}/7</strong></div>
          <div class="field"><span>压力</span><strong>${character.stress}</strong></div>
          <div class="field"><span>伤势</span><strong>${character.wound}</strong></div>
        </div>
        <button class="primary-button full-width-button" data-spend-enhancement="${character.id}" ${canEnhance ? "" : "disabled"} type="button">消耗基地强化点（剩余 ${state.enhancementPoints ?? 0}）</button>
      </section>
      <section class="dossier-section wide">
        <h3>技能</h3>
        <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      </section>
      <section class="dossier-section wide">
        <h3>正面状态</h3>
        ${renderPositiveConditionList(character)}
      </section>
      <section class="dossier-section wide">
        <h3>正面特性</h3>
        ${renderTraitList(character)}
      </section>
      <section class="dossier-section wide">
        <h3>负面状态</h3>
        ${renderConditionList(character)}
      </section>
    </div>
  `;
}

function renderPositiveConditionList(character) {
  const conditions = character.positiveConditions ?? [];
  if (conditions.length === 0) return `<p class="muted">还没有形成稳定的正面状态。</p>`;
  return `
    <div class="trait-list">
      ${conditions
        .map(
          (condition) => `
            <article class="trait-item positive-condition-item positive-condition-${condition.severity ?? "light"}">
              <div>
                <strong>${condition.name}</strong>
                <p class="muted">${condition.description}</p>
              </div>
              <span class="badge positive-condition-badge positive-condition-${condition.severity ?? "light"}">${formatSeverity(condition.severity)} / +${condition.powerBonus ?? 0} 战力</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTraitList(character) {
  const traits = character.traits ?? [];
  if (traits.length === 0) return `<p class="muted">还没有通过行动晋升获得特性。</p>`;
  return `
    <div class="trait-list">
      ${traits
        .map(
          (trait) => `
            <article class="trait-item">
              <div>
                <strong>${trait.name}</strong>
                <p class="muted">${trait.description}</p>
              </div>
              <span class="badge">${trait.source === "combat" ? "战斗" : "后勤"}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderConditionList(character) {
  const conditions = character.conditions ?? [];
  if (conditions.length === 0) return `<p class="muted">暂时没有被合同附赠人生体验。</p>`;
  return `
    <div class="trait-list">
      ${conditions
        .map(
          (condition) => `
            <article class="trait-item condition-item condition-${condition.severity ?? "light"}">
              <div>
                <strong>${condition.name}</strong>
                <p class="muted">${condition.description}</p>
              </div>
              <span class="badge condition-badge condition-${condition.severity ?? "light"}">${formatSeverity(condition.severity)} / -${condition.powerPenalty ?? 0} 战力</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function formatSeverity(severity) {
  if (severity === "heavy") return "重";
  if (severity === "medium") return "中";
  return "轻";
}

function renderEquipmentTab(character) {
  const slots = getEquipmentSlots();
  const candidates = getCandidateItems(selectedEquipmentSlot);
  const canAct = getState().gameStatus === "active";
  const slotLocked = isSlotLocked(character, selectedEquipmentSlot);
  return `
    <div class="body-equipment-layout">
      <section class="body-panel">
        <div class="simple-equipment-map" aria-label="人物装备槽">
          ${Object.entries(slots).map(([slot, label]) => renderBodySlot(character, slot, label)).join("")}
        </div>
      </section>
      <section class="dossier-section equipment-browser">
        <div class="card-header">
          <div>
            <h3>${slots[selectedEquipmentSlot]} 可用装备</h3>
            <p class="muted">${slotLocked ? "双手缺失，无法获得武器战斗力。" : "当前只保留武器和防具两个槽位。"}</p>
          </div>
          <button class="ghost-button" data-unequip-slot="${selectedEquipmentSlot}" ${canAct && character.equipment[selectedEquipmentSlot] ? "" : "disabled"} type="button">卸下当前</button>
        </div>
        <div class="equipment-pool">${renderEquipmentCandidates(candidates, slotLocked)}</div>
      </section>
    </div>
  `;
}

function renderBodySlot(character, slot, label) {
  const equipped = character.equipment[slot];
  return `
    <button class="body-slot slot-${slot} ${selectedEquipmentSlot === slot ? "active" : ""}"
      data-select-slot="${slot}"
      data-drop-slot="${slot}"
      type="button">
      <span>${label}</span>
      <strong>${equipped ? equipped.name : "空"}</strong>
    </button>
  `;
}

function renderEquipmentCandidates(candidates, slotLocked = false) {
  const canAct = getState().gameStatus === "active";
  if (candidates.length === 0) return `<p class="muted">仓库中没有适合该槽位的装备。</p>`;
  return candidates
    .map(
      (item) => `
        <article class="equipment-item" draggable="true" data-drag-item="${item.id}">
          <div>
            <strong>${item.name}</strong>
            <p class="muted">${item.type} · ${getWeaponTagNames(item).join(" / ") || "无标签"} · ${item.note}</p>
            <p class="muted">${renderEquipmentSummary(item)}</p>
          </div>
          <button class="primary-button" data-equip-item="${item.id}" ${canAct && !slotLocked ? "" : "disabled"} type="button">装备</button>
        </article>
      `
    )
    .join("");
}

function getCandidateItems(slot) {
  return getInventory().filter((item) => canEquipItemToSlot(item, slot));
}

function bindEquipmentEvents(characterId) {
  if (activeDossierTab !== "equipment") return;
  const dossier = document.querySelector("#mercenary-dossier");

  dossier.querySelectorAll("[data-select-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedEquipmentSlot = button.dataset.selectSlot;
      renderCharacterSheet(characterId);
    });
    button.addEventListener("dragover", (event) => {
      event.preventDefault();
      button.classList.add("drag-over");
    });
    button.addEventListener("dragleave", () => button.classList.remove("drag-over"));
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      button.classList.remove("drag-over");
      const itemId = event.dataTransfer.getData("text/plain");
      selectedEquipmentSlot = button.dataset.dropSlot;
      equipItem(characterId, selectedEquipmentSlot, itemId);
    });
  });

  dossier.querySelectorAll("[data-drag-item]").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.dragItem);
      event.dataTransfer.effectAllowed = "move";
    });
  });

  dossier.querySelectorAll("[data-equip-item]").forEach((button) => {
    button.addEventListener("click", () => equipItem(characterId, selectedEquipmentSlot, button.dataset.equipItem));
  });
  dossier.querySelectorAll("[data-unequip-slot]").forEach((button) => {
    button.addEventListener("click", () => unequipItem(characterId, button.dataset.unequipSlot));
  });
}

function openPlayerDialog() {
  if (hasPlayerCharacter()) {
    addLog("玩家代表角色已经存在。");
    return;
  }
  document.querySelector("#player-name").value = "";
  document.querySelector("#player-dialog").showModal();
}

function handlePlayerSubmit(event) {
  if (event.submitter?.value !== "confirm") return;
  event.preventDefault();
  const name = document.querySelector("#player-name").value.trim();
  if (!name) return;
  createCharacter({ name, classId: document.querySelector("#player-class").value, isPlayer: true });
  document.querySelector("#player-dialog").close();
}

function setupClassOptions() {
  const select = document.querySelector("#player-class");
  select.innerHTML = Object.entries(getCharacterClasses())
    .map(([id, item]) => `<option value="${id}">${item.name}</option>`)
    .join("");
}

function isSlotLocked(character, slot) {
  if (slot !== "weapon") return false;
  const limbs = new Set((character.conditions ?? []).map((condition) => condition.limb).filter(Boolean));
  return limbs.has("leftArm") && limbs.has("rightArm");
}

function renderEquipmentSummary(item) {
  if (item.itemCategory === "weapon") return `等级 ${item.rarity} · 战斗力 +${item.power ?? 0} · 伤害 ${item.damageType ?? "未知"}`;
  if (item.itemCategory === "armor") return `等级 ${item.rarity} · 死亡率 -${item.deathRiskReduction ?? 0}% · 防护 ${item.protectionType ?? "未知"}`;
  return "未分类装备";
}

function formatRank(rank) {
  return rank === "无" ? "无等级" : `${rank} 级佣兵`;
}
