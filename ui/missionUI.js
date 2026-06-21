import { getState } from "../js/state.js";
import { missionIntelFields } from "../data/sampleData.js";
import { getStoryRouteConfig } from "../data/storyRoutes.js";
import { economyConfig } from "../data/economyConfig.js";
import {
  getMissionRiskTag,
  getMissionPowerRange,
  getMissionRank,
  getMissionAveragePowerRequirement,
  getMissions,
  getTeamCombatPower,
  investigateMission,
  refreshMission,
  startMission,
} from "../modules/mission.js";
import { openCharacterSheet, renderCharacterCard } from "./characterUI.js";
import { renderMercenaryAvatar } from "./mercenaryAvatarUI.js";
import { confirmResourceSpend, showInsufficientFunds, showSpendFailure, showSpendSuccess } from "../js/notifications.js";
import { getInvestigationSkillDiscount } from "../modules/skillEffects.js";

let openMissionId = null;
let dispatchMissionId = null;
let dispatchSelection = new Set();

export function initMissionUI() {}

export function renderMissionUI() {
  const state = getState();
  const countBadge = document.querySelector("#selected-count");
  if (countBadge) countBadge.textContent = "从契约详情派遣";

  const container = document.querySelector("#mission-list");
  if (!container) return;

<<<<<<< Updated upstream
  container.innerHTML = getMissions().map((mission) => renderMissionCard(mission, state)).join("");

  container.querySelectorAll("[data-open-mission]").forEach((card) => {
    card.addEventListener("click", () => openMissionCard(card.dataset.openMission));
=======
  container.querySelectorAll("[data-start-mission]").forEach((button) => {
    button.addEventListener("click", () => {
      const memberIds = getSelectedCharacterIds();
      clearSelectedCharacters();
      startMission(button.dataset.startMission, memberIds);
    });
>>>>>>> Stashed changes
  });

  container.querySelectorAll("[data-view-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMissionCard(button.dataset.viewMission);
    });
  });

  container.querySelectorAll("[data-refresh-mission]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleRefreshMission(button.dataset.refreshMission);
    });
  });

  if (openMissionId && document.querySelector("#mission-dialog")?.open) {
    renderMissionDossier(openMissionId);
  }
}

function renderMissionCard(mission, state) {
  const isActive = mission.status === "active";
  const assignedMembers = getMissionMembers(mission, state.roster);
  const lockedIntelCount = getLockedIntelFields(mission).length;
  const powerRange = getMissionPowerRange(mission);
  const risk = getMissionRiskTag(mission);
  const canAct = state.gameStatus === "active";
  const rank = getMissionRank(mission);
  const route = getMissionRouteMeta(mission);
  const routeConfig = getStoryRouteConfig(mission.storyRoute);
  const isEndingMission = routeConfig && mission.isStoryMission && mission.storyStage >= routeConfig.endingStage;
  return `
    <article class="card mission-card mission-summary-card mission-route-${route.key}" data-open-mission="${mission.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${mission.name}</p>
          <p class="muted">${mission.issuer} / ${mission.type} / ${formatDeadline(mission)}</p>
        </div>
        <div class="mission-card-badges">
          ${route.label ? `<span class="route-pill route-${route.key}">${route.label}</span>` : ""}
          <span class="rank-pill rank-${rank}">${rank}</span>
        </div>
      </div>
      <div class="mission-public">
        <span>战力 ${powerRange.low}-${powerRange.high}</span>
        <span>人均 ${getMissionAveragePowerRequirement(mission)}</span>
        <span>${risk.label}</span>
        <span>${mission.duration} 天</span>
        <span>${mission.reward.gold} 金</span>
      </div>
      ${renderMissionSummaryIntel(mission)}
      ${
        isActive
          ? `<div class="mission-team-strip">${assignedMembers.map((character) => renderMercenaryAvatar(character, { size: "small" })).join("")}<span>执行中</span></div>`
          : `<p class="muted">仍有 ${lockedIntelCount} 条情报未调查。点开契约卡片后可调查或派遣。</p>`
      }
      <div class="button-row">
        <button class="primary-button" data-view-mission="${mission.id}" type="button">${isActive ? "查看" : "打开契约"}</button>
        <button class="ghost-button" data-refresh-mission="${mission.id}" ${!canAct || isActive ? "disabled" : ""} type="button">刷新 ${mission.refreshCost || 0} 金</button>
      </div>
    </article>
  `;
}

function handleRefreshMission(missionId) {
  const mission = getState().missions.find((item) => item.id === missionId);
  const cost = mission?.refreshCost ?? 0;
  const before = getState();
  if (before.gold < cost) {
    showInsufficientFunds(before.gold, cost);
    return;
  }
  if (!confirmResourceSpend(`刷新契约：${mission?.name ?? ""}`, cost)) return;
  const beforeGold = getState().gold;
  refreshMission(missionId);
  const afterGold = getState().gold;
  if (afterGold >= beforeGold) {
    showSpendFailure("刷新契约", "刷新没有完成。");
    return;
  }
  showSpendSuccess("刷新契约", beforeGold - afterGold, afterGold);
}

function openMissionCard(id) {
  openMissionId = id;
  if (dispatchMissionId !== id) {
    dispatchMissionId = null;
    dispatchSelection.clear();
  }
  renderMissionDossier(id);
  document.querySelector("#mission-dialog").showModal();
}

function renderMissionDossier(id) {
  const state = getState();
  const mission = getMissions().find((item) => item.id === id);
  if (!mission) {
    const dialog = document.querySelector("#mission-dialog");
    if (dialog) dialog.close();
    openMissionId = null;
    dispatchMissionId = null;
    dispatchSelection.clear();
    return;
  }

  const isActive = mission.status === "active";
  const selectedIds = [...dispatchSelection].filter((memberId) => state.roster.some((character) => character.id === memberId));
  if (selectedIds.length !== dispatchSelection.size) dispatchSelection = new Set(selectedIds);
  const powerRange = getMissionPowerRange(mission);
  const isDispatching = dispatchMissionId === mission.id && !isActive;
  const lockedIntelFields = getLockedIntelFields(mission);
  const canAct = state.gameStatus === "active" && !isActive;
  const daysUntilExpires = Math.max(0, mission.expiresDay - state.day);
  const route = getMissionRouteMeta(mission);

  const dossier = document.querySelector("#mission-dossier");
  dossier.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">契约 / ${mission.typeCode || mission.type} / 第 ${mission.issueDay}-${mission.expiresDay} 天</div>
        <h2 class="dossier-title">${mission.name}</h2>
        <p class="muted">${mission.issuer} / ${mission.type} / ${mission.acquisition || "公开广播"}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-mission aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>公开情报</h3>
        <div class="field-list">
          <div class="field"><span>截止</span><strong>${daysUntilExpires === 0 ? "今天截止" : `${daysUntilExpires} 天后截止`}</strong></div>
          <div class="field"><span>执行时间</span><strong>${mission.duration} 天</strong></div>
          <div class="field"><span>等级</span><strong>${renderDifficultyBadge(mission)}</strong></div>
          <div class="field"><span>人均需求</span><strong>${getMissionAveragePowerRequirement(mission)}</strong></div>
          <div class="field"><span>战力区间</span><strong>${powerRange.low}-${powerRange.high}</strong></div>
          <div class="field"><span>区间精度</span><strong>${powerRange.level}/3</strong></div>
          <div class="field"><span>报酬</span><strong>${mission.reward.gold} 金 / ${mission.reward.reputation} 声望池</strong></div>
        </div>
      </section>
      <section class="dossier-section wide">
        <h3>简报</h3>
        <p class="mission-brief">${mission.description}</p>
      </section>
      <section class="dossier-section wide route-impact route-impact-${route.key}">
        <div class="card-header">
          <div>
            <h3>路线影响</h3>
            <p class="muted">${route.label ? `${route.label} / ${mission.isStoryMission ? "主线契约" : "普通契约"}` : "普通契约 / 暂无明确路线"}</p>
          </div>
          ${isEndingMission ? `<span class="badge danger">结局契约</span>` : mission.routeLocking ? `<span class="badge danger">路线锁定</span>` : ""}
        </div>
        <div class="route-impact-grid">
          <div><span>阶段</span><strong>${mission.isStoryMission ? `第 ${mission.storyStage ?? "?"} 阶段` : "普通契约"}</strong></div>
          <div><span>明账</span><strong>${mission.moralBrief?.visible ?? "这是一份可以结算的契约。"}</strong></div>
          <div><span>暗账</span><strong>${mission.moralBrief?.hiddenCost ?? "有人会替这份报酬支付另一种价格。"}</strong></div>
        </div>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>调查情报</h3>
            <p class="muted">定向调查更贵但可控；随机调查更便宜，但查到什么算什么。</p>
          </div>
          <button class="ghost-button" data-investigate-mission="${mission.id}" data-intel-key="random" ${canAct && (lockedIntelFields.length > 0 || powerRange.level < 3) ? "" : "disabled"} type="button">随机调查 ${formatInvestigationCost(mission, "random")}</button>
        </div>
        <div class="intel-action-grid">
          <article class="intel-action ${powerRange.level >= 3 ? "revealed" : ""}">
            <div>
              <strong>战斗力需求区间</strong>
              <p class="muted">当前 ${powerRange.low}-${powerRange.high}，精度 ${powerRange.level}/3。</p>
            </div>
            <button class="ghost-button" data-investigate-mission="${mission.id}" data-intel-key="power" ${canAct && powerRange.level < 3 ? "" : "disabled"} type="button">缩小区间 ${formatInvestigationCost(mission, "power")}</button>
          </article>
          ${missionIntelFields.map((field) => renderIntelAction(mission, field, canAct)).join("")}
        </div>
      </section>
      <section class="dossier-section wide">
        <div class="card-header">
          <div>
            <h3>派遣队伍</h3>
            <p class="muted">${isActive ? "该契约已经在执行中。" : "选择可派遣佣兵。点开佣兵卡可查看详情或更换装备。"}</p>
          </div>
          ${
            isActive
              ? `<span class="badge">执行中</span>`
              : `<button class="primary-button" data-open-dispatch="${mission.id}" ${state.gameStatus !== "active" ? "disabled" : ""} type="button">${isDispatching ? "收起" : "派遣"}</button>`
          }
        </div>
        ${isDispatching ? renderDispatchPanel(mission, selectedIds) : renderDispatchSummary(mission, selectedIds)}
      </section>
    </div>
  `;

  bindMissionEvents(mission);
}

function getLockedIntelFields(mission) {
  const revealed = mission.revealedIntel || [];
  return missionIntelFields.filter((field) => !revealed.includes(field.key));
}

function isIntelRevealed(mission, key) {
  return (mission.revealedIntel || []).includes(key);
}

function renderMissionSummaryIntel(mission) {
  const chips = [];
  if (isIntelRevealed(mission, "damageTypes")) chips.push(`敌伤：${formatRequirementValue(mission, "damageTypes")}`);
  if (isIntelRevealed(mission, "enemyMecha")) chips.push(`机动兵器：${formatRequirementValue(mission, "enemyMecha")}`);
  if (isIntelRevealed(mission, "skillTags")) chips.push(`能力：${formatRequirementValue(mission, "skillTags")}`);
  if (isIntelRevealed(mission, "weaponTypes")) chips.push(`武器：${formatRequirementValue(mission, "weaponTypes")}`);
  if (isIntelRevealed(mission, "teamSize")) chips.push(`人数：${formatRequirementValue(mission, "teamSize")}`);
  if (chips.length === 0) return "";
  return `<div class="mission-intel-chips">${chips.map((chip) => `<span>${chip}</span>`).join("")}</div>`;
}

function renderIntelAction(mission, field, canAct) {
  const revealed = isIntelRevealed(mission, field.key);
  return `
    <article class="intel-action ${revealed ? "revealed" : ""}">
      <div>
        <strong>${field.label}</strong>
        <p class="muted">${revealed ? formatRequirementValue(mission, field.key) : getIntelHint(field.key)}</p>
      </div>
      <button class="ghost-button" data-investigate-mission="${mission.id}" data-intel-key="${field.key}" ${canAct && !revealed ? "" : "disabled"} type="button">${revealed ? "已知" : `调查 ${formatInvestigationCost(mission, "targeted")}`}</button>
    </article>
  `;
}

function renderDifficultyBadge(mission) {
  const rank = getMissionRank(mission);
  return `<span class="rank-pill rank-${rank}">${rank}</span>`;
}

function formatRequirementValue(mission, key) {
  const requirements = mission.requirements || {};
  if (key === "damageTypes") return (requirements.damageTypes || []).join(" / ") || "未知";
  if (key === "enemyMecha") return requirements.enemyMecha ? "确认存在" : "未发现";
  if (key === "skillTags") return formatSkillTagRequirements(requirements.skillTags);
  if (key === "weaponTypes") return (requirements.weaponTypes || []).join(" / ") || "未知";
  if (key === "teamSize") {
    const teamSize = mission.recommendedTeamSize || {};
    return `${teamSize.min || 1}-${teamSize.max || 4} 人`;
  }
  return (mission.intel && mission.intel[key]) || "未知";
}

function formatSkillTagRequirements(tags = []) {
  if (tags.length === 0) return "\u672a\u77e5";
  return tags.join(" + ");
}

function getIntelHint(key) {
  const hints = {
    damageTypes: "敌方伤害类型。携带对应防具可降低风险。",
    enemyMecha: "敌方是否部署机动兵器。若我方没有对应机体，成功率与伤亡率都会很难看。",
    skillTags: "推荐小队拥有的训练技能标签。",
    weaponTypes: "推荐武器或伤害方向。",
    teamSize: "推荐小队人数区间。",
  };
  return hints[key] || "未调查";
}

function formatInvestigationCost(mission, mode) {
  const base = mission.investigateCost || 0;
  const config = economyConfig.missions.costs;
  const multiplier = mode === "random" ? config.randomInvestigationMultiplier : mode === "power" ? config.powerInvestigationMultiplier : 1;
  const facilities = getState().facilities || {};
  const facilityDiscount = (facilities.intel || 0) * economyConfig.facilities.intelInvestigationDiscountPerLevel;
  const discount = Math.min(config.maxInvestigationDiscount, facilityDiscount + getInvestigationSkillDiscount(getState(), mode));
  return `${Math.max(1, Math.round(base * multiplier * (1 - discount)))} 金`;
}

function renderDispatchSummary(mission, selectedIds) {
  if (mission.status === "active") return "";
  const range = getMissionPowerRange(mission);
  const teamPower = getTeamCombatPower(selectedIds);
  return `
    <div class="dispatch-summary">
      <div class="field-list">
        <div class="field"><span>已选</span><strong>${selectedIds.length > 0 ? `${selectedIds.length} 人` : "无"}</strong></div>
        <div class="field"><span>小队战力</span><strong>${teamPower}</strong></div>
        <div class="field"><span>需求区间</span><strong>${range.low}-${range.high}</strong></div>
      </div>
    </div>
  `;
}

function renderDispatchPanel(mission, selectedIds) {
  const state = getState();
  const availableRoster = state.roster.filter((character) => character.status === "待命");
  const teamPower = getTeamCombatPower(selectedIds);
  const range = getMissionPowerRange(mission);
  return `
    <div class="dispatch-panel">
      <div class="dispatch-status">
        <div class="field"><span>已选</span><strong>${selectedIds.length}/4</strong></div>
        <div class="field"><span>小队战力</span><strong>${teamPower}</strong></div>
        <div class="field"><span>需求区间</span><strong>${range.low}-${range.high}</strong></div>
        <button class="primary-button" data-confirm-dispatch="${mission.id}" ${state.gameStatus !== "active" || selectedIds.length === 0 ? "disabled" : ""} type="button">确认派遣</button>
      </div>
      <div class="dispatch-roster">
        ${
          availableRoster.length > 0
            ? availableRoster.map((character) => renderDispatchCharacter(character, selectedIds.includes(character.id))).join("")
            : `<p class="muted">没有可派遣佣兵。</p>`
        }
      </div>
    </div>
  `;
}

function renderDispatchCharacter(character, selected) {
  return renderCharacterCard(character, { mode: "dispatch", selected });
}

function bindMissionEvents(mission) {
  const dossier = document.querySelector("#mission-dossier");
  dossier.querySelector("[data-close-mission]").addEventListener("click", () => {
    document.querySelector("#mission-dialog").close();
    openMissionId = null;
    dispatchMissionId = null;
    dispatchSelection.clear();
  });

  dossier.querySelectorAll("[data-open-dispatch]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchMissionId = dispatchMissionId === button.dataset.openDispatch ? null : button.dataset.openDispatch;
      if (!dispatchMissionId) dispatchSelection.clear();
      renderMissionDossier(mission.id);
    });
  });

  dossier.querySelectorAll("[data-investigate-mission]").forEach((button) => {
    button.addEventListener("click", () => handleInvestigate(button, mission));
  });

  dossier.querySelectorAll("[data-toggle-dispatch-member]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleDispatchMember(button.dataset.toggleDispatchMember);
      renderMissionDossier(mission.id);
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
      if (!confirmStoryRouteDispatch(mission)) return;
      startMission(button.dataset.confirmDispatch, [...dispatchSelection]);
      dispatchMissionId = null;
      dispatchSelection.clear();
      document.querySelector("#mission-dialog").close();
      openMissionId = null;
    });
  });
}

function confirmStoryRouteDispatch(mission) {
  if (mission.storyRoute !== "heaven" || mission.issuer !== "天人残余") return true;
  return window.confirm(
    "该契约发布方为：天人残余。\n\n一旦接受，所有人类势力将永久终止与你的合作。GMS 将继续提供操作界面，但不会为你的道德、人身安全、现实身份或物种分类承担责任。\n\n是否接受？"
  );
}

function getMissionRouteMeta(mission) {
  const route = mission.storyRoute ?? inferMissionRoute(mission);
  const data = {
    SSS: { key: "sss", label: "SSS路线" },
    FOF: { key: "fof", label: "FOF路线" },
    rust: { key: "rust", label: "锈蚀路线" },
    heaven: { key: "heaven", label: "天人路线" },
  };
  return data[route] ?? { key: "none", label: "" };
}

function inferMissionRoute(mission) {
  if (mission.issuer === "SSS") return "SSS";
  if (mission.issuer === "FOF") return "FOF";
  if (mission.issuer === "锈蚀部队") return "rust";
  if (mission.issuer === "天人残余") return "heaven";
  return null;
}

function handleInvestigate(button, mission) {
  const state = getState();
  const cost = extractCost(button.textContent) || mission.investigateCost || 0;
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return;
  }
  if (!confirmResourceSpend(`调查契约：${mission.name}`, cost)) return;
  const beforeGold = getState().gold;
  investigateMission(button.dataset.investigateMission, button.dataset.intelKey || "random");
  const afterGold = getState().gold;
  if (afterGold >= beforeGold) {
    showSpendFailure("调查契约", "调查没有完成。");
    return;
  }
  showSpendSuccess("调查契约", beforeGold - afterGold, afterGold);
  renderMissionDossier(mission.id);
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

function formatDeadline(mission) {
  const days = Math.max(0, mission.expiresDay - getState().day);
  return days === 0 ? "今天截止" : `${days} 天后截止`;
}

function extractCost(text = "") {
  const match = String(text).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}
