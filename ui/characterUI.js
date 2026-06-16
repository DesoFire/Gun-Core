import {
  canEquipItemToSlot,
  createTrainingChoices,
  dismissMercenary,
  equipItem,
  eraseMercenaryReputation,
  getCharacter,
  getCharacters,
  getEquipmentSlots,
  getLivingMercenaryCount,
  getMercenaryLimit,
  getRecruitPool,
  getTrainingPools,
  hireRecruit,
  recruitCost,
  refreshRecruits,
  renderCharacterDossier,
  spendEnhancementPointForPower,
  spendEnhancementPointForSkill,
  unequipItem,
  updateCharacter,
} from "../modules/character.js";
import { getInventory } from "../modules/inventory.js";
import { calculateEffectiveCharacterCombatPower, getCombatPowerBreakdown, getConditionStressPoints, getConditionWoundPoints, getInjuryState, getPressureState } from "../modules/combatPower.js";
import { getWeaponTagNames } from "../modules/weaponGenerator.js";
import { getState } from "../js/state.js";
import { identityFee } from "../modules/faction.js";
import { economyConfig } from "../data/economyConfig.js";
import { confirmResourceSpend, showInsufficientFunds, showSpendFailure, showSpendSuccess, showToast } from "../js/notifications.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";

let requestRender = () => {};
let openDossierCharacterId = null;
let activeDossierTab = "attributes";
let selectedEquipmentSlot = "weapon";
let trainingDialogCharacterId = null;
let selectedTrainingPoolId = null;

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
  const injury = getInjuryState(character);
  const pressure = getPressureState(character);
  return `
    <article class="card character-card ${isDispatch ? "dispatch-character-card" : ""} ${selected ? "selected" : ""}" data-open-character="${character.id}">
      <div class="card-header">
        <div class="identity-line">
          ${renderMercenaryAvatar(character)}
          <div>
            <p class="card-title">${character.name}</p>
            <p class="muted">${rankLabel} · ${formatSkillSummary(character)}</p>
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
        <div class="character-kpi status-kpi status-${pressure.level}"><span>压力</span><strong>${pressure.label}</strong><small>${pressure.points} 点</small></div>
        <div class="character-kpi status-kpi status-${injury.level}"><span>伤势</span><strong>${injury.label}</strong><small>${injury.points} 点</small></div>
        <div class="character-kpi"><span>身份费</span><strong>${identityFee(character)}/天</strong></div>
      </div>
      <div class="character-meta-row">
        <span>个人声望 ${character.personalReputation ?? 0}</span>
        <span>技能 ${getSkillCount(character)}</span>
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
                <p class="muted">${formatRank(character.rank)} · ${formatSkillSummary(character)}</p>
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
    ...(character.skills ?? []).slice(0, 4).map((skill) => ({
      label: skill.name,
      className: "badge skill-badge",
    })),
    ...getCharacterSkillTags(character).slice(0, 5).map((tag) => ({
      label: tag,
      className: "badge skill-tag",
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
  selectedTrainingPoolId = null;
  renderCharacterSheet(id);
  document.querySelector("#mercenary-dialog").showModal();
}

function renderCharacterSheet(id) {
  const character = getCharacter(id);
  if (!character) return;
  const breakdown = getCombatPowerBreakdown(character);
  const injury = getInjuryState(character);
  const pressure = getPressureState(character);
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
            ${renderSkillTagChips(character)}
            ${renderStatusSwitch(character.status)}
          </div>
        </div>
      </div>
      <div class="dossier-head-stats">
        ${renderRankBadge(character.rank)}
        <div class="mini-stat primary"><span>最终战力</span><strong>${breakdown.final}</strong></div>
        <div class="mini-stat status-${pressure.level}"><span>压力</span><strong>${pressure.label}</strong><small>${pressure.points} 点</small></div>
        <div class="mini-stat status-${injury.level}"><span>伤势</span><strong>${injury.label}</strong><small>${injury.points} 点</small></div>
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
  dossier.querySelectorAll("[data-gain-power]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirmResourceSpend("强化战力", 1, "强化点")) return;
      const result = spendEnhancementPointForPower(button.dataset.gainPower);
      if (!result?.ok) {
        showSpendFailure("强化战力", "强化点不足或目标不可强化。");
        return;
      }
      showToast(`强化完成：基础战力 +${result.gain}。剩余强化点 ${getState().enhancementPoints ?? 0}。`, "good");
      renderCharacterSheet(id);
      requestRender();
    });
  });
  dossier.querySelectorAll("[data-open-skill-training]").forEach((button) => {
    button.addEventListener("click", () => {
      trainingDialogCharacterId = button.dataset.openSkillTraining;
      selectedTrainingPoolId = null;
      renderCharacterSheet(id);
    });
  });
  dossier.querySelectorAll("[data-close-skill-training]").forEach((button) => {
    button.addEventListener("click", () => {
      trainingDialogCharacterId = null;
      selectedTrainingPoolId = null;
      renderCharacterSheet(id);
    });
  });
  dossier.querySelectorAll("[data-select-training-pool]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTrainingPoolId = button.dataset.selectTrainingPool;
      renderCharacterSheet(id);
    });
  });
  dossier.querySelectorAll("[data-learn-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirmResourceSpend("学习技能", 1, "强化点")) return;
      const result = spendEnhancementPointForSkill(button.dataset.learnSkillCharacter, button.dataset.learnSkill);
      if (!result?.ok) {
        showSpendFailure("学习技能", "强化点不足、技能已拥有，或目标不可训练。");
        return;
      }
      showSpendSuccess("学习技能", 1, getState().enhancementPoints ?? 0);
      showToast(`学会技能：${result.skill.name}。`, "good");
      trainingDialogCharacterId = null;
      selectedTrainingPoolId = null;
      renderCharacterSheet(id);
      requestRender();
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
  const canDismiss = (character.status === "\u5f85\u547d" || dead) && state.gameStatus === "active";
  const dismissLabel = dead ? "\u6536\u5c38" : "\u89e3\u96c7\u8be5\u4f63\u5175";
  return `
    <div class="dossier-grid">
      ${renderCombatPowerBreakdown(character)}
      <section class="dossier-section">
        <h3>\u8eab\u4efd\u98ce\u9669</h3>
        <div class="field-list">
          <div class="field"><span>\u4e2a\u4eba\u58f0\u671b</span><strong>${character.personalReputation ?? 0}</strong></div>
          <div class="field"><span>\u6708\u9690\u79d8\u8d39</span><strong>${character.personalReputation ?? 0} \u91d1</strong></div>
          <div class="field"><span>\u62b9\u53bb\u9ed1\u5386\u53f2</span><strong>${(character.personalReputation ?? 0) * economyConfig.secrecy.eraseMercenaryReputationCostPerPoint} \u91d1</strong></div>
        </div>
        <button class="ghost-button full-width-button" data-erase-reputation="${character.id}" ${(character.personalReputation ?? 0) > 0 && state.gameStatus === "active" ? "" : "disabled"} type="button">\u4e00\u6b21\u6027\u62b9\u53bb\u8be5\u4f63\u5175\u5168\u90e8\u4e2a\u4eba\u58f0\u671b</button>
        <button class="ghost-button full-width-button" data-dismiss-mercenary="${character.id}" ${canDismiss ? "" : "disabled"} type="button">${dismissLabel}</button>
      </section>
      <section class="dossier-section wide">
        <h3>\u8bad\u7ec3</h3>
        ${renderEnhancementActions(character)}
        ${trainingDialogCharacterId === character.id ? renderTrainingPanel(character) : ""}
      </section>
      <section class="dossier-section wide">
        <h3>持有技能</h3>
        ${renderSkillList(character)}
      </section>
      <section class="dossier-section wide">
        <h3>\u8d1f\u9762\u72b6\u6001</h3>
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
        <div class="field"><span>技能加成</span><strong class="tag-positive">+${breakdown.skillBonus}</strong></div>
        <div class="field"><span>物理伤势</span><strong class="tag-negative">${breakdown.injuryLabel} ${breakdown.injuryPoints} 点 / -${breakdown.injuryPenalty}</strong></div>
        <div class="field"><span>物理结算后</span><strong>${breakdown.physicalTotal}</strong></div>
        <div class="field"><span>精神压力</span><strong class="tag-negative">${breakdown.pressureLabel} ${breakdown.pressurePoints} 点 / -${Math.round(breakdown.pressurePenaltyRate * 100)}%</strong></div>
        <div class="field"><span>压力折损</span><strong class="tag-negative">-${breakdown.pressurePenalty}</strong></div>
        <div class="field"><span>最终战力</span><strong>${breakdown.final}</strong></div>
      </div>
    </section>
  `;
}

function renderEnhancementActions(character) {
  const state = getState();
  const canUse = state.gameStatus === "active" && !isDeadStatus(character.status) && (state.enhancementPoints ?? 0) > 0;
  return `
    <div class="enhancement-actions">
      <div class="field-list">
        <div class="field"><span>强化点剩余</span><strong>${state.enhancementPoints ?? 0}</strong></div>
      </div>
      <div class="button-row">
        <button class="primary-button" data-gain-power="${character.id}" ${canUse ? "" : "disabled"} type="button">消耗 1 点：基础战力 +20</button>
        <button class="skill-training-button" data-open-skill-training="${character.id}" ${canUse ? "" : "disabled"} type="button">消耗 1 点：学习技能</button>
      </div>
    </div>
  `;
}

function renderTrainingPanel(character) {
  const state = getState();
  const pools = getTrainingPools();
  const canTrain = state.gameStatus === "active" && !isDeadStatus(character.status) && (state.enhancementPoints ?? 0) > 0;
  if (!selectedTrainingPoolId || !createTrainingChoices(character.id, selectedTrainingPoolId).length) {
    selectedTrainingPoolId = Object.keys(pools).find((poolId) => createTrainingChoices(character.id, poolId).length > 0) ?? null;
  }
  const selectedChoices = selectedTrainingPoolId ? createTrainingChoices(character.id, selectedTrainingPoolId) : [];
  return `
    <div class="training-popover">
      <div class="card-header">
        <div>
          <h3>选择训练池</h3>
          <p class="muted">先选训练方向，再从随机候选技能中选择 1 个。</p>
        </div>
        <button class="ghost-button" data-close-skill-training type="button">关闭</button>
      </div>
      <div class="training-layout">
        <div class="training-pool-list">
          ${Object.entries(pools).map(([poolId, pool]) => {
            const availableCount = createTrainingChoices(character.id, poolId).length;
            const active = selectedTrainingPoolId === poolId ? "active" : "";
            return `<button class="training-pool-button ${active}" data-select-training-pool="${poolId}" ${canTrain && availableCount > 0 ? "" : "disabled"} type="button">
              <strong>${pool.name}</strong>
              <span>${availableCount > 0 ? "\u53ef\u62bd\u53d6 " + availableCount + " \u9879" : "\u5df2\u62bd\u7a7a"}</span>
            </button>`;
          }).join("")}
        </div>
        <div class="training-choice-list">
          ${selectedChoices.length > 0 ? selectedChoices.map((skill) => `
            <button class="training-choice-card" data-learn-skill-character="${character.id}" data-learn-skill="${skill.id}" ${canTrain ? "" : "disabled"} type="button">
              <strong>${skill.name}</strong>
              <span>${(skill.tags ?? []).join(" / ")}</span>
              <small>${skill.description ?? ""}</small>
            </button>
          `).join("") : `<p class="muted">\u6ca1\u6709\u53ef\u62bd\u53d6\u7684\u8bad\u7ec3\u6280\u80fd\u3002</p>`}
        </div>
      </div>
    </div>
  `;
}

function renderSkillList(character) {
  const skills = character.skills ?? [];
  if (skills.length === 0) return `<p class="muted">\u8fd8\u6ca1\u6709\u8bad\u7ec3\u6280\u80fd\u3002</p>`;
  return `
    <div class="trait-list">
      ${skills.map((skill) => `
        <article class="trait-item skill-item">
          <div>
            <strong>${skill.name}</strong>
            <p class="muted">${skill.description ?? ""}</p>
          </div>
          <span class="badge skill-badge">${(skill.tags ?? []).join(" / ")}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSkillTagChips(character) {
  const tags = getCharacterSkillTags(character).slice(0, 6);
  if (tags.length === 0) return `<span class="career-chip career-chip-primary" title="\u5c1a\u672a\u83b7\u5f97\u8bad\u7ec3\u6280\u80fd">\u672a\u8bad\u7ec3</span>`;
  return tags.map((tag) => `<span class="career-chip career-chip-primary" title="\u8bad\u7ec3\u6280\u80fd\u6807\u7b7e\uff0c\u7528\u4e8e\u5951\u7ea6\u63a8\u8350\u80fd\u529b\u5339\u914d\u3002">${tag}</span>`).join("");
}

function renderStatusSwitch(status) {
  const isReady = status === "待命";
  return `<span class="status-switch ${isReady ? "ready" : "busy"}" title="角色当前是否可被派遣"><i></i>${status}</span>`;
}

function renderRankBadge(rank) {
  const key = rank && rank !== "无" ? rank : "none";
  return `<div class="rank-badge rank-${key}"><span>评级</span><strong>${formatRank(rank)}</strong></div>`;
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
              <span class="badge condition-badge condition-${condition.severity ?? "light"}">${formatConditionEffect(condition)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function formatConditionEffect(condition) {
  const severity = formatSeverity(condition.severity);
  if (condition.category === "mental") return `${severity} / 压力 +${getConditionStressPoints(condition)}`;
  return `${severity} / 伤势 +${getConditionWoundPoints(condition)}`;
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

function getCharacterSkillTags(character) {
  return [...new Set((character.skills ?? []).flatMap((skill) => skill.tags ?? []))];
}

function formatSkillSummary(character) {
  const count = character.skills?.length ?? 0;
  return count > 0 ? count + " \u9879\u8bad\u7ec3\u6280\u80fd" : "\u672a\u8bad\u7ec3";
}

function getSkillCount(character) {
  return character.skills?.length ?? 0;
}
