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
  unequipItem,
} from "../modules/character.js";
import { getInventory } from "../modules/inventory.js";
import { getWeaponTagNames } from "../modules/weaponGenerator.js";
import { addLog, getState } from "../js/state.js";
import { identityFee } from "../modules/faction.js";

let selectedCharacters = new Set();
let requestRender = () => {};
let openDossierCharacterId = null;
let activeDossierTab = "attributes";
let selectedEquipmentSlot = "head";

export function initCharacterUI({ onRenderNeeded }) {
  requestRender = onRenderNeeded;
  setupClassOptions();

  document.querySelector("#refresh-recruits").addEventListener("click", refreshRecruits);
  document.querySelector("#create-player").addEventListener("click", openPlayerDialog);
  document.querySelector("#player-form").addEventListener("submit", handlePlayerSubmit);
}

export function renderCharacterUI() {
  const isActive = getState().gameStatus === "active";
  document.querySelector("#refresh-recruits").disabled = !isActive;
  document.querySelector("#create-player").disabled = !isActive || hasPlayerCharacter();
  renderRoster();
  renderRecruits();
  if (openDossierCharacterId && document.querySelector("#mercenary-dialog")?.open) {
    renderCharacterSheet(openDossierCharacterId);
  }
}

export function getSelectedCharacterIds() {
  return [...selectedCharacters];
}

export function clearSelectedCharacters() {
  selectedCharacters.clear();
}

function renderRoster() {
  const container = document.querySelector("#roster-list");
  const roster = getCharacters();
  if (roster.length === 0) {
    container.innerHTML = `<p class="muted">还没有佣兵。先去招募或创建玩家角色。</p>`;
    return;
  }

  container.innerHTML = roster.map(renderCharacterCard).join("");
  container.querySelectorAll("[data-select-character]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCharacter(button.dataset.selectCharacter);
    });
  });
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
  const selected = selectedCharacters.has(character.id);
  const canAct = getState().gameStatus === "active";
  return `
    <article class="card ${selected ? "selected" : ""}" data-open-character="${character.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${character.name}</p>
          <p class="muted">${character.isPlayer ? "玩家角色 · " : ""}${character.className} · ${character.rank} 级 · Lv.${character.level}</p>
        </div>
        <button class="ghost-button" data-select-character="${character.id}" ${!canAct || character.status !== "待命" ? "disabled" : ""}>
          ${selected ? "取消" : "入队"}
        </button>
      </div>
      <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      <div class="stat-line">
        <span>生命 ${character.hp}/${character.maxHp}</span>
        <span>压力 ${character.stress}</span>
        <span>伤势 ${character.wound}</span>
        <span>知名度 ${character.notoriety}</span>
        <span>身份费 ${identityFee(character)}/天</span>
        <span>状态 ${character.status}</span>
      </div>
      <p class="muted">经验 ${character.xp}/100</p>
      <button class="link-button" data-open-character-button="${character.id}" type="button">查看人物卡</button>
    </article>
  `;
}

function renderRecruits() {
  const container = document.querySelector("#recruit-list");
  const state = getState();
  container.innerHTML = getRecruitPool()
    .map((character) => {
      const cost = recruitCost(character);
      return `
        <article class="card">
          <div class="card-header">
            <div>
              <p class="card-title">${character.name}</p>
              <p class="muted">${character.className} · 知名度 ${character.notoriety} · 身份费 ${identityFee(character)}/天 · 雇佣费 ${cost} 金</p>
            </div>
            <button class="primary-button" data-recruit="${character.id}" ${state.gameStatus !== "active" || state.gold < cost ? "disabled" : ""} type="button">招募</button>
          </div>
          <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-recruit]").forEach((button) => {
    button.addEventListener("click", () => hireRecruit(button.dataset.recruit));
  });
}

function toggleCharacter(id) {
  if (selectedCharacters.has(id)) {
    selectedCharacters.delete(id);
  } else if (selectedCharacters.size < 4) {
    selectedCharacters.add(id);
  } else {
    addLog("一支小队最多 4 人。");
  }
  requestRender();
}

function openCharacterSheet(id) {
  openDossierCharacterId = id;
  activeDossierTab = "attributes";
  selectedEquipmentSlot = "head";
  renderCharacterSheet(id);
  document.querySelector("#mercenary-dialog").showModal();
}

function renderCharacterSheet(id) {
  const character = getCharacter(id);
  if (!character) return;

  const dossier = document.querySelector("#mercenary-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">SSS-GUILD DOSSIER / FIELD SHEET</div>
        <h2 class="dossier-title">${character.name}</h2>
        <p class="muted">${character.className} · ${character.rank} 级佣兵 · ${character.status}</p>
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
  bindEquipmentEvents(id);
}

function renderActiveSheetTab(character) {
  if (activeDossierTab === "equipment") return renderEquipmentTab(character);
  if (activeDossierTab === "archive") return `<div class="dossier-grid">${renderCharacterDossier(character)}</div>`;
  return renderAttributesTab(character);
}

function renderAttributesTab(character) {
  const assignedMission =
    character.status.startsWith("履行") || character.status.startsWith("执行") ? character.status : "无";
  return `
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>基本状态</h3>
        <div class="field-list">
          <div class="field"><span>生命值</span><strong>${character.hp}/${character.maxHp}</strong></div>
          <div class="field"><span>当前契约</span><strong>${assignedMission}</strong></div>
          <div class="field"><span>等级</span><strong>Lv.${character.level} / ${character.rank} 级</strong></div>
          <div class="field"><span>经验</span><strong>${character.xp}/100</strong></div>
          <div class="field"><span>压力</span><strong>${character.stress}</strong></div>
          <div class="field"><span>伤势</span><strong>${character.wound}</strong></div>
        </div>
      </section>
      <section class="dossier-section">
        <h3>属性</h3>
        <div class="field-list">
          <div class="field"><span>力量</span><strong>${character.stats.might}</strong></div>
          <div class="field"><span>敏捷</span><strong>${character.stats.agility}</strong></div>
          <div class="field"><span>智识</span><strong>${character.stats.wits}</strong></div>
          <div class="field"><span>意志</span><strong>${character.stats.resolve}</strong></div>
        </div>
      </section>
      <section class="dossier-section wide">
        <h3>技能</h3>
        <div class="badge-row">${character.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}</div>
      </section>
    </div>
  `;
}

function renderEquipmentTab(character) {
  const slots = getEquipmentSlots();
  const candidates = getCandidateItems(selectedEquipmentSlot);
  const canAct = getState().gameStatus === "active";
  return `
    <div class="body-equipment-layout">
      <section class="body-panel">
        <div class="body-map" aria-label="人物装备槽">
          ${Object.entries(slots).map(([slot, label]) => renderBodySlot(character, slot, label)).join("")}
          <div class="body-silhouette" aria-hidden="true">
            <div class="body-head"></div>
            <div class="body-torso"></div>
            <div class="body-arm left"></div>
            <div class="body-arm right"></div>
            <div class="body-leg left"></div>
            <div class="body-leg right"></div>
          </div>
        </div>
      </section>
      <section class="dossier-section equipment-browser">
        <div class="card-header">
          <div>
            <h3>${slots[selectedEquipmentSlot]} 可用装备</h3>
            <p class="muted">${selectedEquipmentSlot === "back" ? "背包槽可以装所有类型的装备。" : "点击左侧槽位切换候选列表，拖动装备到槽位可快速换装。"}</p>
          </div>
          <button class="ghost-button" data-unequip-slot="${selectedEquipmentSlot}" ${canAct && character.equipment[selectedEquipmentSlot] ? "" : "disabled"} type="button">卸下当前</button>
        </div>
        <div class="equipment-pool">${renderEquipmentCandidates(candidates)}</div>
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

function renderEquipmentCandidates(candidates) {
  const canAct = getState().gameStatus === "active";
  if (candidates.length === 0) return `<p class="muted">仓库中没有适合该槽位的装备。</p>`;
  return candidates
    .map(
      (item) => `
        <article class="equipment-item" draggable="true" data-drag-item="${item.id}">
          <div>
            <strong>${item.name}</strong>
            <p class="muted">${item.type} · ${getWeaponTagNames(item).join(" / ") || "无标签"} · ${item.note}</p>
          </div>
          <button class="primary-button" data-equip-item="${item.id}" ${canAct ? "" : "disabled"} type="button">装备</button>
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
