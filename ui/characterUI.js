import {
  canEquipItemToSlot,
  dismissMercenary,
  equipItem,
  eraseMercenaryReputation,
  getCharacter,
  getCharacters,
  getEquipmentSlots,
  getLivingMercenaryCount,
  getMercenaryLimit,
  getRecruitPool,
  hireRecruit,
  recruitCost,
  refreshRecruits,
  renderCharacterDossier,
  spendEnhancementPoint,
  unequipItem,
  updateCharacter,
} from "../modules/character.js";
import { getInventory } from "../modules/inventory.js";
import { calculateEffectiveCharacterCombatPower, getCombatPowerBreakdown } from "../modules/combatPower.js";
import { getWeaponTagNames } from "../modules/weaponGenerator.js";
import { getState } from "../js/state.js";
import { identityFee } from "../modules/faction.js";
import { economyConfig } from "../data/economyConfig.js";
import { confirmResourceSpend, showInsufficientFunds, showSpendFailure, showSpendSuccess, showToast } from "../js/notifications.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";
import { careerCategories } from "../data/sampleData.js";

let requestRender = () => {};
let openDossierCharacterId = null;
let activeDossierTab = "attributes";
let selectedEquipmentSlot = "weapon";

export function initCharacterUI({ onRenderNeeded }) {
  requestRender = onRenderNeeded;
  document.querySelector("#refresh-recruits").addEventListener("click", handleRefreshRecruits);
}

export function renderCharacterUI() {
  const isActive = getState().gameStatus === "active";
  const refreshButton = document.querySelector("#refresh-recruits");
  refreshButton.textContent = `刷新 ${getRecruitRefreshCost()} 金`;
  refreshButton.disabled = !isActive;
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
    container.innerHTML = `<p class="muted">还没有佣兵。先去招募一批能替你承担后果的人。</p>`;
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

export function renderCharacterCard(character, options = {}) {
  const isDispatch = options.mode === "dispatch";
  const selected = Boolean(options.selected);
  const rankLabel = formatRank(character.rank);
  const finalPower = calculateEffectiveCharacterCombatPower(character);
  return `
    <article class="card character-card ${isDispatch ? "dispatch-character-card" : ""} ${selected ? "selected" : ""}" data-open-character="${character.id}">
      <div class="card-header">
        <div class="identity-line">
          ${renderMercenaryAvatar(character)}
          <div>
            <p class="card-title">${character.name}</p>
            <p class="muted">${character.className} · ${rankLabel}</p>
          </div>
        </div>
        ${
          isDispatch
            ? `<button class="${selected ? "ghost-button" : "primary-button"} dispatch-join-button" data-toggle-dispatch-member="${character.id}" type="button">${selected ? "移出" : "加入"}</button>`
            : `<span class="badge">${character.status}</span>`
        }
      </div>
      ${renderCharacterTagRow(character)}
      <div class="character-kpi-grid">
        <div class="character-kpi primary"><span>战力</span><strong>${finalPower}</strong></div>
        <div class="character-kpi ${character.stress >= 60 ? "danger" : character.stress >= 30 ? "warning" : ""}"><span>压力</span><strong>${character.stress}</strong></div>
        <div class="character-kpi ${character.wound > 0 ? "danger" : ""}"><span>伤势</span><strong>${character.wound}</strong></div>
        <div class="character-kpi"><span>身份费</span><strong>${identityFee(character)}/天</strong></div>
      </div>
      <div class="character-meta-row">
        <span>个人声望 ${character.personalReputation ?? 0}</span>
        <span>正面状态 ${getPositiveStatusCount(character)}</span>
        <span>负面状态 ${character.conditions?.length ?? 0}</span>
      </div>
      ${
        isDispatch
          ? `<div class="button-row">
              <button class="link-button" data-open-dispatch-character="${character.id}" type="button">查看人物卡</button>
              <button class="link-button" data-equip-dispatch-character="${character.id}" type="button">更换装备</button>
            </div>`
          : `<button class="link-button" data-open-character-button="${character.id}" type="button">查看人物卡 / 更换装备</button>`
      }
    </article>
  `;
}

function renderRecruits() {
  const container = document.querySelector("#recruit-list");
  const state = getState();
  const livingCount = getLivingMercenaryCount(state);
  const mercenaryLimit = getMercenaryLimit(state);
  const isFull = livingCount >= mercenaryLimit;
  container.innerHTML = getRecruitPool()
    .map((character) => {
      const cost = recruitCost(character);
      const finalPower = calculateEffectiveCharacterCombatPower(character);
      const disabled = state.gameStatus !== "active" || isFull ? "disabled" : "";
      return `
        <article class="card recruit-card">
          <div class="card-header">
            <div class="identity-line">
              ${renderMercenaryAvatar(character)}
              <div>
                <p class="card-title">${character.name}</p>
                <p class="muted">${character.className} · ${formatRank(character.rank)}</p>
              </div>
            </div>
            <button class="primary-button" data-recruit="${character.id}" ${disabled} type="button">招募 ${cost} 金</button>
          </div>
          <div class="character-kpi-grid recruit-kpis">
            <div class="character-kpi primary"><span>战力</span><strong>${finalPower}</strong></div>
            <div class="character-kpi"><span>个人声望</span><strong>${character.personalReputation ?? 0}</strong></div>
            <div class="character-kpi"><span>日薪</span><strong>${identityFee(character)}/天</strong></div>
            <div class="character-kpi cost"><span>雇佣费</span><strong>${cost}</strong></div>
          </div>
          ${renderCharacterTagRow(character)}
          ${isFull ? `<p class="muted">佣兵上限 ${livingCount}/${mercenaryLimit}，升级兵营可提高上限。</p>` : ""}
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-recruit]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      const recruit = getRecruitPool().find((character) => character.id === button.dataset.recruit);
      const cost = recruit ? recruitCost(recruit) : 0;
      if (getLivingMercenaryCount(state) >= getMercenaryLimit(state)) {
        showToast(`佣兵上限已满：${getLivingMercenaryCount(state)}/${getMercenaryLimit(state)}。升级兵营可提高上限。`, "bad");
        return;
      }
      if (state.gold < cost) {
        showInsufficientFunds(state.gold, cost);
        return;
      }
      if (!confirmResourceSpend(`雇佣「${recruit.name}」`, cost)) return;
      const beforeGold = getState().gold;
      hireRecruit(button.dataset.recruit);
      const afterGold = getState().gold;
      if (afterGold >= beforeGold) {
        showSpendFailure("雇佣佣兵", "雇佣未完成。");
        return;
      }
      showSpendSuccess("雇佣佣兵", beforeGold - afterGold, afterGold);
    });
  });
}

export function renderCharacterTagRow(character) {
  const tags = [
    { label: character.careerCategoryName ?? "未分类", className: "badge" },
    { label: character.className, className: "badge" },
    ...(character.positiveConditions ?? []).slice(0, 3).map((condition) => ({
      label: condition.name,
      className: `badge positive-condition-badge positive-condition-${condition.severity ?? "light"}`,
    })),
    ...(character.conditions ?? []).slice(0, 4).map((condition) => ({
      label: condition.name,
      className: `badge condition-badge condition-${condition.severity ?? "light"}`,
    })),
  ];
  const weapon = character.equipment?.weapon;
  const armor = character.equipment?.armor;
  if (weapon?.damageType) tags.push({ label: `武器：${weapon.damageType}`, className: "badge equipment-tag weapon-tag" });
  if (armor?.protectionType) tags.push({ label: `防具：${armor.protectionType}`, className: "badge equipment-tag armor-tag" });
  return `<div class="badge-row character-tag-row">${tags.map((tag) => `<span class="${tag.className}">${tag.label}</span>`).join("")}</div>`;
}

function handleRefreshRecruits() {
  const state = getState();
  const cost = getRecruitRefreshCost();
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return;
  }
  if (!confirmResourceSpend("刷新招募名单", cost)) return;
  const beforeGold = state.gold;
  refreshRecruits();
  const afterGold = getState().gold;
  if (afterGold >= beforeGold) {
    showSpendFailure("刷新招募名单", "刷新未完成。");
    return;
  }
  showSpendSuccess("刷新招募名单", beforeGold - afterGold, afterGold);
}

function getRecruitRefreshCost() {
  return economyConfig.recruitment.refreshCost;
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
  const breakdown = getCombatPowerBreakdown(character);
  const dossier = document.querySelector("#mercenary-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div class="identity-line identity-line-large dossier-identity">
        ${renderMercenaryAvatar(character, { size: "large" })}
        <div>
          <div class="dossier-code">SSS-GUILD DOSSIER / FIELD SHEET</div>
          <button class="editable-title" data-edit-character-name="${character.id}" title="点击重命名" type="button">${character.name}</button>
          <button class="editable-callsign" data-edit-character-callsign="${character.id}" title="点击修改外号" type="button">外号：${character.callsign ?? "未登记"}</button>
          <div class="dossier-chip-row">
            ${renderCareerChip(character)}
            <span class="career-chip" title="具体职业会影响职业加成和契约中的建议职业匹配。">${character.className}</span>
            ${renderStatusSwitch(character.status)}
          </div>
        </div>
      </div>
      <div class="dossier-head-stats">
        ${renderRankBadge(character.rank)}
        <div class="mini-stat primary"><span>最终战力</span><strong>${breakdown.final}</strong></div>
        <div class="mini-stat ${character.stress >= 60 ? "danger" : character.stress >= 30 ? "warning" : ""}"><span>压力</span><strong>${character.stress}</strong></div>
        <div class="mini-stat ${character.wound > 0 ? "danger" : ""}"><span>伤势</span><strong>${character.wound}</strong></div>
        <div class="mini-stat"><span>个人声望</span><strong>${character.personalReputation ?? 0}</strong></div>
      </div>
      <button class="ghost-button dialog-close-button" data-close-dossier aria-label="关闭" title="关闭" type="button">关闭</button>
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
    button.addEventListener("click", () => {
      if (!confirmResourceSpend("强化佣兵", 1, "强化点")) return;
      const before = getState();
      const targetBefore = getCharacter(button.dataset.spendEnhancement);
      const beforePower = targetBefore?.combatPower ?? 0;
      spendEnhancementPoint(button.dataset.spendEnhancement);
      const after = getState();
      const targetAfter = getCharacter(button.dataset.spendEnhancement);
      if ((after.enhancementPoints ?? 0) >= (before.enhancementPoints ?? 0) || (targetAfter?.combatPower ?? 0) <= beforePower) {
        showSpendFailure("强化佣兵", "强化点不足或目标不可用。");
        return;
      }
      showToast(`强化佣兵成功，消耗 1 强化点，剩余 ${after.enhancementPoints ?? 0}。`, "good");
    });
  });
  dossier.querySelectorAll("[data-edit-character-name]").forEach((button) => {
    button.addEventListener("click", () => editCharacterIdentity(button.dataset.editCharacterName, "name"));
  });
  dossier.querySelectorAll("[data-edit-character-callsign]").forEach((button) => {
    button.addEventListener("click", () => editCharacterIdentity(button.dataset.editCharacterCallsign, "callsign"));
  });
  dossier.querySelectorAll("[data-erase-reputation]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = getCharacter(button.dataset.eraseReputation);
      const cost = (target?.personalReputation ?? 0) * economyConfig.secrecy.eraseMercenaryReputationCostPerPoint;
      if (getState().gold < cost) {
        showInsufficientFunds(getState().gold, cost);
        return;
      }
      if (!confirmResourceSpend(`抹去「${target?.name ?? "佣兵"}」的黑历史`, cost)) return;
      const beforeGold = getState().gold;
      eraseMercenaryReputation(button.dataset.eraseReputation);
      const afterGold = getState().gold;
      if (afterGold >= beforeGold) {
        showSpendFailure("抹去黑历史", "操作未完成。");
        return;
      }
      showSpendSuccess("抹去黑历史", beforeGold - afterGold, afterGold);
      renderCharacterSheet(id);
    });
  });
  dossier.querySelectorAll("[data-dismiss-mercenary]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = getCharacter(button.dataset.dismissMercenary);
      if (!target) return;
      const confirmed = window.confirm(
        isDeadStatus(target.status)
          ? `确认收尸 ${target.name}？装备会回到仓库，财务系统会停止把尸体当作员工。`
          : `确认解雇 ${target.name}？装备会回到仓库，但该佣兵会离开基地。`
      );
      if (!confirmed) return;
      dismissMercenary(button.dataset.dismissMercenary);
      document.querySelector("#mercenary-dialog").close();
      openDossierCharacterId = null;
      requestRender();
    });
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
  requestRender();
}

function renderAttributesTab(character) {
  const state = getState();
  const dead = isDeadStatus(character.status);
  const canEnhance = state.gameStatus === "active" && !dead && (state.enhancementPoints ?? 0) > 0;
  const canDismiss = (character.status === "待命" || dead) && state.gameStatus === "active";
  const dismissLabel = dead ? "收尸" : "解雇该佣兵";
  return `
    <div class="dossier-grid">
      ${renderCombatPowerBreakdown(character)}
      <section class="dossier-section">
        <h3>身份风险</h3>
        <div class="field-list">
          <div class="field"><span>个人声望</span><strong>${character.personalReputation ?? 0}</strong></div>
          <div class="field"><span>月隐秘费</span><strong>${character.personalReputation ?? 0} 金</strong></div>
          <div class="field"><span>抹去黑历史</span><strong>${(character.personalReputation ?? 0) * economyConfig.secrecy.eraseMercenaryReputationCostPerPoint} 金</strong></div>
        </div>
        <button class="ghost-button full-width-button" data-erase-reputation="${character.id}" ${(character.personalReputation ?? 0) > 0 && state.gameStatus === "active" ? "" : "disabled"} type="button">一次性抹去该佣兵全部个人声望</button>
        <button class="ghost-button full-width-button" data-dismiss-mercenary="${character.id}" ${canDismiss ? "" : "disabled"} type="button">${dismissLabel}</button>
      </section>
      <section class="dossier-section wide">
        <h3>成长</h3>
        <button class="primary-button full-width-button" data-spend-enhancement="${character.id}" ${canEnhance ? "" : "disabled"} type="button">消耗基地强化点（剩余 ${state.enhancementPoints ?? 0}）</button>
      </section>
      <section class="dossier-section wide">
        <h3>正面状态</h3>
        ${renderPositiveStatusList(character)}
      </section>
      <section class="dossier-section wide">
        <h3>负面状态</h3>
        ${renderConditionList(character)}
      </section>
    </div>
  `;
}

function renderCombatPowerBreakdown(character) {
  const breakdown = getCombatPowerBreakdown(character);
  return `
    <section class="dossier-section">
      <h3>战力构成</h3>
      <div class="field-list">
        <div class="field"><span>基础战力</span><strong>${breakdown.base}</strong></div>
        <div class="field"><span>装备战力</span><strong class="tag-positive">+${breakdown.equipment}</strong></div>
        <div class="field"><span>正面状态</span><strong class="tag-positive">+${breakdown.positive}</strong></div>
        <div class="field"><span>职业加成</span><strong class="tag-positive">+${breakdown.classBonus}</strong></div>
        <div class="field"><span>伤势扣减</span><strong class="tag-negative">-${breakdown.injuryPenalty}</strong></div>
        <div class="field"><span>压力扣减</span><strong class="tag-negative">-${breakdown.stressPenalty}</strong></div>
        <div class="field"><span>负面状态</span><strong class="tag-negative">-${breakdown.conditionPenalty}</strong></div>
        <div class="field"><span>最终战力</span><strong>${breakdown.final}</strong></div>
      </div>
    </section>
  `;
}

function renderPositiveStatusList(character) {
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

function renderCareerChip(character) {
  const category = careerCategories[character.careerCategory];
  const title = category ? `${category.name}：${category.description}` : "职业大类会影响契约适配和角色成长。";
  return `<span class="career-chip career-chip-primary" title="${title}">${character.careerCategoryName ?? "未分类"}</span>`;
}

function renderStatusSwitch(status) {
  const isReady = status === "待命";
  return `<span class="status-switch ${isReady ? "ready" : "busy"}" title="角色当前是否可被派遣"><i></i>${status}</span>`;
}

function renderRankBadge(rank) {
  const key = rank && rank !== "无" ? rank : "none";
  return `<div class="rank-badge rank-${key}"><span>评级</span><strong>${formatRank(rank)}</strong></div>`;
}

function getPositiveStatusCount(character) {
  return character.positiveConditions?.length ?? 0;
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
            <h3>${slots[selectedEquipmentSlot]} · 可用装备</h3>
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
      renderCharacterSheet(characterId);
      requestRender();
    });
  });

  dossier.querySelectorAll("[data-drag-item]").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.dragItem);
      event.dataTransfer.effectAllowed = "move";
    });
  });

  dossier.querySelectorAll("[data-equip-item]").forEach((button) => {
    button.addEventListener("click", () => {
      equipItem(characterId, selectedEquipmentSlot, button.dataset.equipItem);
      renderCharacterSheet(characterId);
      requestRender();
    });
  });
  dossier.querySelectorAll("[data-unequip-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      unequipItem(characterId, button.dataset.unequipSlot);
      renderCharacterSheet(characterId);
      requestRender();
    });
  });
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
  return rank === "无" ? "无等级" : `${rank}级佣兵`;
}

function isDeadStatus(status) {
  return status === "阵亡" || status === "闃典骸";
}
