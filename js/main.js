import { facilities } from "../data/sampleData.js";
import { initRouter } from "./router.js";
import { getState, resetState, saveState, subscribe, updateState } from "./state.js";
import { advanceDay } from "../modules/mission.js";
import {
  buySupplies,
  buyBlackMarketItem,
  calculateDailySupplyConsumption,
  calculateDailyExpenseBreakdown,
  calculateSecrecyExpenseItems,
  calculateUnpaidSecrecyReputation,
  canUpgradeFacility,
  getBlackMarketItemCost,
  getFacilityRankLabel,
  getFacilityUpgradeCost,
  getSupplyPurchaseCost,
  hospitalTreatMercenaries,
  entertainmentCenterTreatMercenaries,
  calculateHospitalTreatmentPlan,
  calculateEntertainmentCenterTreatmentPlan,
  approveSecrecyExpenses,
  isSecrecyBillingDay,
  upgradeFacility,
} from "../modules/faction.js";
import { getGameSummary } from "../modules/game.js";
import { initArmorUI } from "../ui/armorUI.js";
import { initCharacterUI, renderCharacterUI } from "../ui/characterUI.js";
import { initInventoryUI, renderInventoryUI } from "../ui/inventoryUI.js";
import { initMechaUI, renderMechaUI } from "../ui/mechaUI.js";
import { initMissionUI, renderMissionUI } from "../ui/missionUI.js";
import { renderAppShell } from "../ui/appShellUI.js";
import { initWeaponUI } from "../ui/weaponUI.js";
import { buyWealthItem, getWealthCollections, getWealthProgress } from "../modules/wealth.js";
import { confirmResourceSpend, showInsufficientFunds, showSpendFailure, showSpendSuccess, showToast } from "./notifications.js";
import { economyConfig } from "../data/economyConfig.js";
import { calculateCharacterCombatPower, getInjuryState, getPressureState } from "../modules/combatPower.js";

let router = null;
let pendingExpenseApproval = false;
let lastRenderedSettlementId = null;

function init() {
  renderAppShell(document.querySelector("#root"));
  router = initRouter();
  initCharacterUI({ onRenderNeeded: renderApp });
  initMissionUI();
  initMechaUI();
  initInventoryUI();
  initArmorUI();
  initWeaponUI();
  bindGlobalActions();
  subscribe(renderApp);
  renderApp();
  showIntroIfNeeded();
}

function bindGlobalActions() {
  document.querySelector("#advance-day").addEventListener("click", requestAdvanceDayApproval);
  document.querySelector("#organization-name").addEventListener("click", editOrganizationName);
  initGlobalLogSidebar();
  document.querySelector("#global-log-close").addEventListener("click", () => {
    closeGlobalLogSidebar();
  });
  document.querySelector("#settlement-close").addEventListener("click", closeSettlementDialog);
  document.querySelector("#save-game").addEventListener("click", () => {
    saveState();
    updateState((draft) => {
      draft.log.push(`第 ${draft.day} 天：进度已保存。`);
    });
  });
  document.querySelector("#reset-game").addEventListener("click", () => {
    resetState();
    showIntroIfNeeded();
  });
  document.querySelector("#intro-confirm").addEventListener("click", closeIntro);
}

function showIntroIfNeeded() {
  const state = getState();
  if (state.introSeen) return;
  const dialog = document.querySelector("#intro-dialog");
  if (!dialog || dialog.open) return;
  try {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  } catch (error) {
    console.warn("Intro dialog could not be opened.", error);
  }
}

function closeIntro() {
  updateState((draft) => {
    draft.introSeen = true;
  });
  document.querySelector("#intro-dialog")?.close();
}

function renderApp() {
  renderCommandPanel();
  renderResources();
  renderGlobalLog();
  renderSettlementDialog();
  renderOverview();
  renderFacilities();
  renderExpenses();
  renderWealth();
  renderCharacterUI();
  renderMissionUI();
  renderMechaUI();
  renderInventoryUI();
  saveState();
}

function requestAdvanceDayApproval() {
  const state = getState();
  if (state.gameStatus !== "active") return;
  pendingExpenseApproval = true;
  router?.switchTab("expenses");
  renderExpenses();
  showToast("请在支出页确认今日支出，批准后才会进入下一天。", "good");
}

function initGlobalLogSidebar() {
  const toggle = document.querySelector("#global-log-toggle");
  toggle?.addEventListener("click", () => {
    const sidebar = document.querySelector("#global-log-sidebar");
    const isOpen = sidebar?.classList.toggle("open");
    if (sidebar) sidebar.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

function closeGlobalLogSidebar() {
  const sidebar = document.querySelector("#global-log-sidebar");
  sidebar?.classList.remove("open");
  if (sidebar) sidebar.hidden = true;
  document.querySelector("#global-log-toggle")?.setAttribute("aria-expanded", "false");
}

function renderGlobalLog() {
  const list = document.querySelector("#global-log-list");
  if (!list) return;
  const logs = [...(getState().log ?? [])].slice(-80).reverse();
  list.innerHTML = logs.length > 0
    ? logs.map((entry) => `<article class="log-entry">${entry}</article>`).join("")
    : `<p class="muted">还没有行动记录。</p>`;
}

function renderCommandPanel() {
  const state = getState();
  const summary = getGameSummary();
  document.querySelector("#organization-name").textContent = state.organizationName ?? "Gun Core";
  document.querySelector("#advance-day").disabled = summary.status !== "active";
}

function editOrganizationName() {
  const current = getState().organizationName ?? "Gun Core";
  const value = window.prompt("修改佣兵组织名称", current);
  if (value === null) return;
  const trimmed = value.trim().slice(0, 32);
  if (!trimmed) return;
  updateState((draft) => {
    draft.organizationName = trimmed;
  });
}

function renderResources() {
  const state = getState();
  const dailyExpenses = calculateDailyExpenseBreakdown(state);
  const summary = getGameSummary();
  const baseStatusDay = document.querySelector("#base-status-day");
  if (baseStatusDay) baseStatusDay.textContent = `第 ${state.day} 天`;
  const grid = document.querySelector("#base-status-grid");
  if (!grid) return;
  grid.innerHTML = [
    ["资金", state.gold],
    ["基地声望", state.reputation],
    ["强化点", state.enhancementPoints ?? 0],
    ["隐秘值", `${state.stealth}/100`],
    ["每日支出", `${dailyExpenses.total} 金`],
    ["补给库存", `${state.supplies ?? 0}`],
    ["待命佣兵", `${summary.availableRoster}/${state.roster.length}`],
    ["执行契约", `${summary.activeMissions}`],
    ["遇袭率", `${Math.max(0, 100 - state.stealth)}%`],
  ]
    .map(([label, value]) => `<div class="base-status-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderSettlementDialog() {
  const state = getState();
  const settlement = state.lastSettlement;
  const dialog = document.querySelector("#settlement-dialog");
  const summary = document.querySelector("#settlement-summary");
  const content = document.querySelector("#settlement-content");
  if (!dialog || !summary || !content) return;

  if (!settlement) {
    if (dialog.open) dialog.close();
    lastRenderedSettlementId = null;
    return;
  }

  summary.textContent = `第 ${settlement.day} 天 · ${settlement.title}`;
  content.innerHTML = `
    <section class="settlement-summary-grid">
      <article class="settlement-stat ${settlement.success ? "good" : "danger"}">
        <span>结果</span>
        <strong>${settlement.success ? "成功" : "失败"}</strong>
      </article>
      <article class="settlement-stat">
        <span>最终战力</span>
        <strong>${settlement.teamPower}</strong>
      </article>
      <article class="settlement-stat">
        <span>需求战力</span>
        <strong>${settlement.requiredPower}</strong>
      </article>
      <article class="settlement-stat">
        <span>金币变化</span>
        <strong>${settlement.goldDelta >= 0 ? `+${settlement.goldDelta}` : settlement.goldDelta}</strong>
      </article>
      <article class="settlement-stat">
        <span>声望变化</span>
        <strong>${settlement.reputationDelta >= 0 ? `+${settlement.reputationDelta}` : settlement.reputationDelta}</strong>
      </article>
      <article class="settlement-stat">
        <span>当前资金</span>
        <strong>${settlement.remainingGold}</strong>
      </article>
    </section>
    <section class="dossier-section">
      <h3>事件摘要</h3>
      <p class="muted">${settlement.summaryText}</p>
      ${settlement.lootName ? `<p class="muted">战利品：${settlement.lootName}</p>` : ""}
    </section>
    <section class="dossier-section wide">
      <h3>队员状态</h3>
      <div class="settlement-member-list">
        ${settlement.members
          .map(
            (member) => `
              <article class="settlement-member-card">
                <div class="card-header">
                  <strong>${member.name}</strong>
                  <span class="badge">${member.status}</span>
                </div>
                <div class="compact-field-list">
                  <div class="field"><span>战力</span><strong>${member.combatPower}</strong></div>
                  <div class="field"><span>伤势</span><strong>${member.injuryLabel}</strong></div>
                  <div class="field"><span>压力</span><strong>${member.pressureLabel}</strong></div>
                  <div class="field"><span>新状态</span><strong>${member.newConditions.length > 0 ? member.newConditions.join("、") : "无"}</strong></div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;

  if (lastRenderedSettlementId !== settlement.id) {
    lastRenderedSettlementId = settlement.id;
    if (!dialog.open) dialog.showModal();
  }
}

function closeSettlementDialog() {
  document.querySelector("#settlement-dialog")?.close();
  updateState((draft) => {
    draft.lastSettlement = null;
  }, { save: true, notify: false });
}

function renderExpenses() {
  const state = getState();
  const breakdown = calculateDailyExpenseBreakdown(state);
  const secrecyItems = calculateSecrecyExpenseItems(state);
  const unpaidSecrecy = calculateUnpaidSecrecyReputation(state);
  const secrecyDue = isSecrecyBillingDay(state.day);
  const totalBadge = document.querySelector("#expense-total-badge");
  const summaryGrid = document.querySelector("#expense-summary-grid");
  const list = document.querySelector("#expense-list");
  if (!totalBadge || !summaryGrid || !list) return;

  totalBadge.textContent = `${breakdown.total} 金/天`;
  summaryGrid.innerHTML = [
    ["佣兵工资", `${breakdown.wages.total} 金`, `${breakdown.wages.items.length} 名待命`],
    ["生活补给", `${calculateDailySupplyConsumption(state)} 份/天`, `库存 ${state.supplies}`],
    ["装备养护", `${breakdown.equipment.total} 金`, `${breakdown.equipment.items.length} 件装备`],
    ["设施维持", `${breakdown.facilities.total + breakdown.base.total} 金`, `${breakdown.facilities.items.length} 座设施`],
  ]
    .map(
      ([label, value, note]) => `
        <article class="expense-summary-card">
          <span>${label}</span>
          <strong>${value}</strong>
          <p class="muted">${note}</p>
        </article>
      `
    )
    .join("");

  list.innerHTML = [
    renderExpenseSection("佣兵工资", "仅待命佣兵按日支付；执行契约期间暂不支付，归来后补发。", breakdown.wages.items, renderWageExpenseLine, breakdown.wages.total),
    renderSupplyExpenseSection(state, breakdown.supplies),
    renderExpenseSection("武器防具养护", "已装备的武器和防具每天都要维护，等级越高费用越高。", breakdown.equipment.items, renderEquipmentExpenseLine, breakdown.equipment.total),
    renderExpenseSection("基础设施维持", "基地基础开销加已解锁设施维持费。", [...breakdown.base.items, ...breakdown.facilities.items], renderFacilityExpenseLine, breakdown.base.total + breakdown.facilities.total),
    renderSecrecyExpenseSection(secrecyItems, unpaidSecrecy, secrecyDue),
    renderExpenseApprovalPanel(state, breakdown),
  ].join("");

  list.querySelectorAll("[data-confirm-expenses]").forEach((button) => {
    button.addEventListener("click", () => {
      const before = getState();
      const approvedCost = breakdown.total;
      const previousDay = before.day;
      const paidSecrecyIds = [...list.querySelectorAll("[data-secrecy-pay]:checked")].map((input) => input.value);
      if (!confirmResourceSpend("批准今日支出并进入下一天", approvedCost)) return;
      if (isSecrecyBillingDay(before.day)) approveSecrecyExpenses(paidSecrecyIds);
      pendingExpenseApproval = false;
      advanceDay();
      const after = getState();
      const spent = Math.min(before.gold, approvedCost);
      showToast(`已进入第 ${after.day} 天。本次批准支出 ${approvedCost} 金，实际支付 ${spent} 金，剩余 ${after.gold} 金。`, "good");
    });
  });
  list.querySelectorAll("[data-buy-supplies]").forEach((button) => {
    button.addEventListener("click", () => {
      const quantity = Number(button.dataset.buySupplies);
      const cost = getSupplyPurchaseCost(quantity);
      if (!confirmGoldSpend(`购买 ${quantity} 份补给`, cost)) return;
      const before = getState();
      const ok = buySupplies(quantity);
      const after = getState();
      if (!ok || after.gold >= before.gold) {
        showSpendFailure("购买补给", getGoldFailureReason(before.gold, cost));
        return;
      }
      showSpendSuccess("购买补给", before.gold - after.gold, after.gold);
      renderApp();
    });
  });
}

function renderExpenseApprovalPanel(state, breakdown) {
  return `
    <section class="expense-section expense-approval-section">
      <div>
        <h3>每日结算批准</h3>
        <p class="muted">${
          pendingExpenseApproval
            ? `确认支付当前每日支出 ${breakdown.total} 金。当前资金 ${state.gold} 金。`
            : "点击顶部“推进一天”后，需要在这里批准支出。"
        }</p>
      </div>
      <button class="approve-button" data-confirm-expenses ${pendingExpenseApproval && state.gameStatus === "active" ? "" : "disabled"} type="button">
        批准支出并进入下一天
      </button>
    </section>
  `;
}

function renderSecrecyExpenseSection(items, unpaidSecrecy, secrecyDue) {
  const total = items.reduce((sum, item) => sum + item.cost, 0);
  return `
    <section class="expense-section">
      <div class="card-header">
        <div>
          <h3>隐秘费用</h3>
          <p class="muted">${
            secrecyDue
              ? "月初结算。可任意勾选支付对象；未支付的声望会永久累计为未遮掩声望，并立即降低隐秘值。"
              : `本日无需结算。当前永久未遮掩声望 ${unpaidSecrecy}，每日遇袭率由隐秘值决定。`
          }</p>
        </div>
        <span class="badge">${secrecyDue ? `${total} 金/月` : `未遮掩 ${unpaidSecrecy}`}</span>
      </div>
      <div class="expense-line-list">
        ${
          secrecyDue && items.length > 0
            ? items.map(renderSecrecyExpenseLine).join("")
            : `<p class="muted">${secrecyDue ? "暂无需要遮掩的声望" : "隐秘费每 30 天结算一次，第 1 天不收。"}</p>`
        }
      </div>
    </section>
  `;
}

function renderSecrecyExpenseLine(item) {
  return `
    <label class="expense-line">
      <span><input data-secrecy-pay value="${item.id}" type="checkbox" checked> ${item.name}</span>
      <small>${item.type === "base" ? "基地声望" : "个人声望"} ${item.reputation} · 不支付将降低 ${item.reputation} 隐秘值</small>
      <strong>${item.cost} 金</strong>
    </label>
  `;
}

function renderSupplyExpenseSection(state, supplies) {
  const dailyConsumption = calculateDailySupplyConsumption(state);
  const daysLeft = dailyConsumption > 0 ? Math.floor((state.supplies ?? 0) / dailyConsumption) : 0;
  const options = economyConfig.dailyExpenses.livingSupplies.purchaseTiers ?? [{ quantity: 1, cost: 1 }];
  return `
    <section class="expense-section">
      <div class="card-header">
        <div>
          <h3>生活补给</h3>
          <p class="muted">库存 ${state.supplies ?? 0}，每日消耗 ${dailyConsumption}，约可维持 ${daysLeft} 天。高等级佣兵消耗更多补给。</p>
        </div>
        <span class="badge">${dailyConsumption} 份/天</span>
      </div>
      <div class="button-row">
        ${options
          .map(({ quantity, cost }) => {
            return `<button class="ghost-button" data-buy-supplies="${quantity}" ${state.gold >= cost ? "" : "disabled"} type="button">购买 ${quantity} · ${cost} 金</button>`;
          })
          .join("")}
      </div>
      <div class="expense-line-list">
        ${
          supplies.items.length > 0
            ? supplies.items.map(renderSupplyExpenseLine).join("")
            : `<p class="muted">暂无支出</p>`
        }
      </div>
    </section>
  `;
}

function renderExpenseSection(title, description, items, renderLine, total) {
  return `
    <section class="expense-section">
      <div class="card-header">
        <div>
          <h3>${title}</h3>
          <p class="muted">${description}</p>
        </div>
        <span class="badge">${total} 金</span>
      </div>
      <div class="expense-line-list">
        ${
          items.length > 0
            ? items.map(renderLine).join("")
            : `<p class="muted">暂无支出</p>`
        }
      </div>
    </section>
  `;
}

function renderWageExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank}级 · ${item.status}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderSupplyExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank}级 · 生活补给</small>
      <strong>${item.cost} 份</strong>
    </div>
  `;
}

function renderEquipmentExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.characterName} · ${item.itemName}</span>
      <small>${item.slotLabel} · ${item.rarity}级 · ${item.type}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function renderFacilityExpenseLine(item) {
  return `
    <div class="expense-line">
      <span>${item.name}</span>
      <small>${item.rank ? `${item.rank}级 · Lv.${item.level}` : "固定开销"}</small>
      <strong>${item.cost} 金</strong>
    </div>
  `;
}

function formatSeverityLabel(severity) {
  if (severity === "heavy") return "重度";
  if (severity === "medium") return "中度";
  return "轻度";
}

function renderWealth() {
  const state = getState();
  const progress = getWealthProgress(state);
  const badge = document.querySelector("#wealth-progress-badge");
  const list = document.querySelector("#wealth-list");
  if (!badge || !list) return;

  badge.textContent = `${progress.owned}/${progress.total} · 已花 ${progress.spent} 金`;
  list.innerHTML = getWealthCollections()
    .map(
      (room) => `
        <section class="wealth-room">
          <div class="card-header">
            <div>
              <h3>${room.name}</h3>
              <p class="muted">${room.description}</p>
            </div>
            <span class="badge">${room.items.filter((item) => item.owned).length}/${room.items.length}</span>
          </div>
          <div class="wealth-item-grid">
            ${room.items.map((item) => renderWealthItem(item, state)).join("")}
          </div>
        </section>
      `
    )
    .join("");

  list.querySelectorAll("[data-buy-wealth-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      const item = getWealthCollections().flatMap((room) => room.items).find((entry) => entry.id === button.dataset.buyWealthItem);
      if (!item) {
        showSpendFailure("购买收藏", "找不到该收藏品。");
        return;
      }
      if (state.gold < item.cost) {
        showInsufficientFunds(state.gold, item.cost);
        return;
      }
      if (!confirmGoldSpend(`购买收藏：${item.name}`, item.cost)) return;
      const beforeGold = getState().gold;
      buyWealthItem(button.dataset.buyWealthItem);
      const afterGold = getState().gold;
      if (afterGold >= beforeGold) {
        showSpendFailure("购买收藏", "购买没有完成。");
        return;
      }
      showSpendSuccess("购买收藏", beforeGold - afterGold, afterGold);
    });
  });
}

function renderWealthItem(item, state) {
  const disabled = item.owned || state.gameStatus !== "active" ? "disabled" : "";
  return `
    <article class="wealth-item ${item.owned ? "owned" : ""}">
      <div>
        <strong>${item.name}</strong>
        <p class="muted">${item.description}</p>
      </div>
      <button class="${item.owned ? "ghost-button" : "primary-button"}" data-buy-wealth-item="${item.id}" ${disabled} type="button">
        ${item.owned ? "已收藏" : `${item.cost} 金`}
      </button>
    </article>
  `;
}

function renderOverview() {
  const state = getState();
  const activeMissions = state.missions.filter((mission) => mission.status === "active");
  const availableMissions = state.missions.filter((mission) => mission.status === "available");
  const wounded = state.roster.filter((character) => getInjuryState(character).points > 0);
  const stressed = state.roster.filter((character) => getPressureState(character).points >= 5);
  const availableRoster = state.roster.filter((character) => character.status === "待命");
  const livingRoster = state.roster.filter((character) => character.status !== "阵亡");
  const activeRoster = livingRoster.filter((character) => character.status !== "待命");
  const totalPower = livingRoster.reduce((sum, character) => sum + calculateCharacterCombatPower(character), 0);
  const avgPower = livingRoster.length > 0 ? Math.round(totalPower / livingRoster.length) : 0;
  const readyPercent = livingRoster.length > 0 ? Math.round((availableRoster.length / livingRoster.length) * 100) : 0;
  const activePercent = livingRoster.length > 0 ? Math.round((activeRoster.length / livingRoster.length) * 100) : 0;

  document.querySelector("#mission-overview-badge").textContent = `${activeMissions.length} 执行 / ${availableMissions.length} 可接`;
  document.querySelector("#mission-overview").innerHTML =
    activeMissions.length > 0
      ? activeMissions
          .map(
            (mission) => `
              <div class="overview-row">
                <span>${mission.name}</span>
                <strong>剩余 ${mission.remaining} 天</strong>
              </div>
            `
          )
          .join("")
      : `<p class="muted">没有正在执行的契约。可在契约页选择队伍后接取。</p>`;

  document.querySelector("#personnel-overview-badge").textContent = `${livingRoster.length} 人 / 总战力 ${totalPower}`;
  document.querySelector("#personnel-overview").innerHTML = `
    <div class="personnel-overview-grid">
      <article class="personnel-metric primary"><span>人员总量</span><strong>${livingRoster.length}</strong></article>
      <article class="personnel-metric power"><span>战力总和</span><strong>${totalPower}</strong></article>
      <article class="personnel-metric"><span>平均战力</span><strong>${avgPower}</strong></article>
      <article class="personnel-metric"><span>待命人员</span><strong>${availableRoster.length}</strong></article>
      <article class="personnel-metric"><span>执行中</span><strong>${activeRoster.length}</strong></article>
    </div>
    <div class="personnel-bars">
      <div class="personnel-bar"><span>待命</span><i><b style="width:${readyPercent}%"></b></i><strong>${readyPercent}%</strong></div>
      <div class="personnel-bar active"><span>外勤</span><i><b style="width:${activePercent}%"></b></i><strong>${activePercent}%</strong></div>
    </div>
    <div class="personnel-alert-row">
      <span class="${wounded.length > 0 ? "danger" : ""}">受伤 ${wounded.length}</span>
      <span class="${stressed.length > 0 ? "warning" : ""}">高压 ${stressed.length}</span>
    </div>
  `;

}

function renderFacilities() {
  const state = getState();
  const container = document.querySelector("#facility-list");
  container.innerHTML = Object.entries(facilities)
    .map(([id, facility]) => {
      const level = state.facilities[id] ?? 0;
      const isUnlocked = level > 0;
      const rank = getFacilityRankLabel(level);
      const cost = getFacilityUpgradeCost(id, level);
      const isStackedDefense = id === "defenses";
      const canUpgrade = (isStackedDefense || level < 7) && canUpgradeFacility(id);
      const disabled = state.gameStatus !== "active" || !canUpgrade ? "disabled" : "";
      const nextRank = getFacilityRankLabel(Math.min(level + 1, 7));
      const statusText = isStackedDefense
        ? isUnlocked
          ? `${level} 座 · 基地战斗力 +${level * economyConfig.facilities.defensePowerPerLevel}`
          : "未修建"
        : isUnlocked
          ? `${rank}级 · 维护费 ${facility.upkeep * level}/天`
          : "未解锁";
      const badgeText = isStackedDefense ? `${level} 座` : isUnlocked ? rank : "未解锁";
      return `
        <article class="card facility-card ${isUnlocked ? "" : "locked"}" data-open-facility="${id}">
          <div class="card-header">
            <div>
              <p class="card-title">${facility.name}</p>
              <p class="muted">${statusText}</p>
            </div>
            <span class="badge">${badgeText}</span>
          </div>
          <p class="muted">${facility.description}</p>
          ${
            isStackedDefense
              ? `<p class="muted">继续修建：防御战斗力 +${economyConfig.facilities.defensePowerPerLevel} · 费用 ${cost} 金</p>`
              : level < 7
                ? `<p class="muted">下一阶段：${nextRank}级 · 费用 ${cost} 金</p>`
                : `<p class="muted">已达到最高等级。</p>`
          }
          <div class="button-row">
            ${renderFacilityAction(id, level, cost, disabled)}
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-open-facility]").forEach((card) => {
    card.addEventListener("click", () => openFacilityDialog(card.dataset.openFacility));
  });
  container.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleFacilityUpgradeSpend(button);
    });
  });
  container.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleBlackMarketSpend(button);
    });
  });
  container.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleTreatmentSpend(button, "hospital");
    });
  });
  container.querySelectorAll("[data-entertainmentCenter-treat]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleTreatmentSpend(button, "entertainmentCenter");
    });
  });
}

function renderFacilityAction(id, level, cost, disabled) {
  const state = getState();
  if (id === "defenses") return `<button class="primary-button" data-upgrade="${id}" ${disabled}>修建防御设施 · ${cost} 金</button>`;
  if (level <= 0) return `<button class="primary-button" data-upgrade="${id}" ${disabled}>解锁 F级 · ${cost} 金</button>`;
  const upgradeButton = renderFacilityUpgradeButton(id, level, cost, disabled);
  if (id === "blackMarket") {
    const rank = getFacilityRankLabel(level);
    const actions = [
      ["weapon", "购买武器"],
      ["armor", "购买防具"],
      ["mecha", "购买机甲"],
    ];
    return actions
      .map(([kind, label]) => {
        const itemCost = getBlackMarketItemCost(kind, rank);
        const isDisabled = state.gameStatus !== "active" ? "disabled" : "";
        return `<button class="${kind === "mecha" ? "primary-button" : "ghost-button"}" data-buy-black-market-item="${kind}" ${isDisabled}>${label} · ${rank}级 ${itemCost} 金</button>`;
      })
      .join("") + upgradeButton;
  }
  if (id === "hospital") {
    const plan = calculateHospitalTreatmentPlan(state);
    return `<button class="primary-button" data-hospital-treat ${state.gameStatus !== "active" || plan.entries.length === 0 ? "disabled" : ""}>治疗物理伤病 · ${plan.cost} 金</button>${upgradeButton}`;
  }
  if (id === "entertainmentCenter") {
    const plan = calculateEntertainmentCenterTreatmentPlan(state);
    return `<button class="primary-button" data-entertainmentCenter-treat ${state.gameStatus !== "active" || plan.entries.length === 0 ? "disabled" : ""}>处理心理负面状态 · ${plan.cost} 金</button>${upgradeButton}`;
  }
  return upgradeButton;
}

function renderFacilityUpgradeButton(id, level, cost, disabled) {
  if (id === "defenses") return `<button class="ghost-button" data-upgrade="${id}" ${disabled}>继续修建 · ${cost} 金</button>`;
  if (level >= 7) return `<button class="ghost-button" disabled>最高 S级</button>`;
  return `<button class="ghost-button" data-upgrade="${id}" ${disabled}>升级到 ${getFacilityRankLabel(level + 1)}级 · ${cost} 金</button>`;
}

function openFacilityDialog(id) {
  const state = getState();
  const facility = facilities[id];
  if (!facility) return;

  const level = state.facilities[id] ?? 0;
  const isUnlocked = level > 0;
  const rank = getFacilityRankLabel(level);
  const nextCost = getFacilityUpgradeCost(id, level);
  const isStackedDefense = id === "defenses";
  const canUpgrade = (isStackedDefense || level < 7) && canUpgradeFacility(id);
  const nextRank = getFacilityRankLabel(Math.min(level + 1, 7));
  const specialText = {
    blackMarket: `只能买到当前黑市评级的商品。当前可购买 ${rank}级补给、武器、防具与机甲。`,
    hospital: (() => {
      const plan = calculateHospitalTreatmentPlan(state);
      return `按单个佣兵身上的单个物理负面状态收费。当前可处理 ${plan.entries.length} 个标签，总费用 ${plan.cost} 金，成功率 ${plan.successChance}%，最高可处理 ${plan.maxPoints} 点伤势标签。`;
    })(),
    entertainmentCenter: (() => {
      const plan = calculateEntertainmentCenterTreatmentPlan(state);
      return `按单个佣兵身上的单个心理负面状态收费。当前可处理 ${plan.entries.length} 个标签，总费用 ${plan.cost} 金，成功率 ${plan.successChance}%，最高可处理 ${plan.maxPoints} 点压力标签。`;
    })(),
    defenses: `基地遭遇突袭时提供额外战斗力。当前已建 ${level} 座，防御战斗力 +${(state.facilities.defenses ?? 0) * economyConfig.facilities.defensePowerPerLevel}。`,
    tavern: "提高招募池规模，便于寻找更多候选佣兵。",
    barracks: `提高可雇佣佣兵上限。当前上限 ${economyConfig.facilities.baseMercenaryLimit + (state.facilities.barracks ?? 0) * economyConfig.facilities.barracksMercenaryLimitPerLevel} 人，每升 1 级 +${economyConfig.facilities.barracksMercenaryLimitPerLevel}。`,
    intel: `每级降低调查契约情报费用 ${Math.round(economyConfig.facilities.intelInvestigationDiscountPerLevel * 100)}%，总折扣仍受调查折扣上限限制。`,
  }[id] ?? "基础设施效果待扩展。";

  document.querySelector("#facility-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">基础设施 / ${id.toUpperCase()}</div>
        <h2 class="dossier-title">${facility.name}</h2>
        <p class="muted">${
          isStackedDefense
            ? `${level} 座 · 防御战斗力 +${level * economyConfig.facilities.defensePowerPerLevel}`
            : `${isUnlocked ? `${rank}级` : "未解锁"} · 维护费 ${facility.upkeep * level}/天`
        }</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-facility aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>状态</h3>
        <div class="field-list">
          ${
            isStackedDefense
              ? `
                <div class="field"><span>已建数量</span><strong>${level} 座</strong></div>
                <div class="field"><span>防御战斗力</span><strong>+${level * economyConfig.facilities.defensePowerPerLevel}</strong></div>
                <div class="field"><span>维护费</span><strong>${facility.upkeep * level} 金/天</strong></div>
                <div class="field"><span>继续修建</span><strong>${nextCost} 金</strong></div>
                <div class="field"><span>单座加成</span><strong>+${economyConfig.facilities.defensePowerPerLevel}</strong></div>
              `
              : `
                <div class="field"><span>当前状态</span><strong>${isUnlocked ? "已解锁" : "未解锁"}</strong></div>
                <div class="field"><span>评级</span><strong>${rank}</strong></div>
                <div class="field"><span>维护费</span><strong>${facility.upkeep * level} 金/天</strong></div>
                <div class="field"><span>${isUnlocked ? "升级费用" : "解锁费用"}</span><strong>${level >= 7 ? "已满级" : `${nextCost} 金`}</strong></div>
                <div class="field"><span>下一评级</span><strong>${level >= 7 ? "S级" : `${nextRank}级`}</strong></div>
                <div class="field"><span>升级条件</span><strong>${level >= 7 ? "已完成" : "支付费用"}</strong></div>
              `
          }
        </div>
      </section>
      <section class="dossier-section">
        <h3>用途</h3>
        <p class="muted">${facility.description}</p>
        <p class="muted">${specialText}</p>
      </section>
      <section class="dossier-section wide">
        <h3>可用操作</h3>
        <div class="button-row">
          ${renderFacilityAction(id, level, nextCost, state.gameStatus !== "active" || !canUpgrade)}
        </div>
      </section>
    </div>
  `;

  const dialog = document.querySelector("#facility-dialog");
  dialog.showModal();
  dialog.querySelector("[data-close-facility]").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      if (handleFacilityUpgradeSpend(button)) dialog.close();
    });
  });
  dialog.querySelectorAll("[data-buy-black-market-item]").forEach((button) => {
    button.addEventListener("click", () => {
      if (handleBlackMarketSpend(button)) dialog.close();
    });
  });
  dialog.querySelectorAll("[data-hospital-treat]").forEach((button) => {
    button.addEventListener("click", () => {
      if (handleTreatmentSpend(button, "hospital")) dialog.close();
    });
  });
  dialog.querySelectorAll("[data-entertainmentCenter-treat]").forEach((button) => {
    button.addEventListener("click", () => {
      if (handleTreatmentSpend(button, "entertainmentCenter")) dialog.close();
    });
  });
}

function confirmGoldSpend(action, cost) {
  const state = getState();
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return false;
  }
  return confirmResourceSpend(action, cost);
}

function getGoldFailureReason(currentGold, cost) {
  if (currentGold < cost) return `当前 ${currentGold} 金，还差 ${cost - currentGold} 金。`;
  return "条件不满足或操作未完成。";
}

function handleFacilityUpgradeSpend(button) {
  const id = button.dataset.upgrade;
  const facility = facilities[id];
  const action = id === "defenses" ? "修建防御设施" : `${facility?.name ?? "设施"}升级`;
  const cost = getCostFromText(button.textContent);
  if (!confirmGoldSpend(action, cost)) return false;
  const beforeGold = getState().gold;
  const beforeLevel = getState().facilities[id] ?? 0;
  upgradeFacility(id);
  const after = getState();
  const afterLevel = after.facilities[id] ?? 0;
  if (afterLevel <= beforeLevel || after.gold >= beforeGold) {
    showSpendFailure(action, getGoldFailureReason(beforeGold, cost));
    return false;
  }
  showSpendSuccess(action, beforeGold - after.gold, after.gold);
  return true;
}

function handleBlackMarketSpend(button) {
  const kind = button.dataset.buyBlackMarketItem;
  const labels = { weapon: "黑市购买武器", armor: "黑市购买防具", mecha: "黑市购买机甲" };
  const action = labels[kind] ?? "黑市采购";
  const cost = getCostFromText(button.textContent);
  if (!confirmGoldSpend(action, cost)) return false;
  const before = getState();
  const beforeCount = kind === "mecha" ? before.mechs.length : before.inventory.length;
  const beforeGold = before.gold;
  buyBlackMarketItem(kind);
  const after = getState();
  const afterCount = kind === "mecha" ? after.mechs.length : after.inventory.length;
  if (afterCount <= beforeCount || after.gold >= beforeGold) {
    showSpendFailure(action, getGoldFailureReason(beforeGold, cost));
    return false;
  }
  showSpendSuccess(action, beforeGold - after.gold, after.gold);
  return true;
}

function handleTreatmentSpend(button, facilityId) {
  const action = facilityId === "entertainmentCenter" ? "娱乐中心处理" : "医疗中心治疗";
  const cost = getCostFromText(button.textContent);
  if (!confirmGoldSpend(action, cost)) return false;
  const before = getState();
  const beforeConditions = before.roster.reduce((sum, character) => sum + (character.conditions?.length ?? 0), 0);
  const beforeGold = before.gold;
  const result = facilityId === "entertainmentCenter" ? entertainmentCenterTreatMercenaries() : hospitalTreatMercenaries();
  const after = getState();
  const afterConditions = after.roster.reduce((sum, character) => sum + (character.conditions?.length ?? 0), 0);
  if (after.gold >= beforeGold) {
    showSpendFailure(action, getGoldFailureReason(beforeGold, cost));
    return false;
  }
  const cured = result?.cured ?? beforeConditions - afterConditions;
  const curedText = cured > 0 ? `，治愈 ${cured} 个负面状态` : "，本次没有治愈负面状态";
  showToast(`${action}完成，花费 ${beforeGold - after.gold} 金${curedText}，剩余 ${after.gold} 金。`, cured > 0 ? "good" : "warning");
  return true;
}

function getCostFromText(text = "") {
  const match = String(text).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

init();
