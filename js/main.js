import { facilities } from "../data/sampleData.js";
import { initRouter } from "./router.js";
import { getState, resetState, saveState, subscribe, updateState } from "./state.js";
import { advanceDay } from "../modules/mission.js";
import {
  buyBlackMarketItem,
  calculateDailyExpenseBreakdown,
  calculateSecrecyExpenseItems,
  calculateUnpaidSecrecyReputation,
  canUpgradeFacility,
  getBlackMarketItemCost,
  getBlackMarketMechaPurchaseRank,
  getFacilityRankLabel,
  getFacilityUpgradeCost,
  hospitalTreatMercenaries,
  entertainmentCenterTreatMercenaries,
  calculateHospitalTreatmentPlan,
  calculateEntertainmentCenterTreatmentPlan,
  approveSecrecyExpenses,
  buyEmergencyStealth,
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
import { getStoryRouteConfig, storyRouteOrder } from "../data/storyRoutes.js";
import { dialogues } from "../data/dialogues.js";
import { calculateCharacterCombatPower, getInjuryState, getPressureState } from "../modules/combatPower.js";

let router = null;
let lastRenderedSettlementId = null;
let lastDebtReliefNoticeId = null;
let activeCommunication = null;

const PAGE_HELP = {
  overview: {
    eyebrow: "OVERVIEW",
    title: "总览页：先判断今天能不能活",
    summary: "这里把最重要的运营状态压缩成一眼能看的清单。新玩家每天先看这里，再决定去招人、接契约还是处理支出。",
    points: [
      "契约执行会显示正在外勤的小队和剩余天数，没有执行中契约时就该去契约页找活。",
      "人员状态会提示待命、伤病和压力情况。战力高但压力爆表的人不一定可靠。",
      "右侧状态按钮能随时查看资金、隐秘、每日支出和执行中契约数量。",
      "第一天的基本顺序是：看总览、招募或检查佣兵、调查契约、派遣、确认支出、推进一天。",
    ],
  },
  personnel: {
    eyebrow: "ROSTER",
    title: "人员页：不是所有便宜佣兵都便宜",
    summary: "这里负责招募、解雇、查看佣兵详情和调整装备。佣兵的真实价值取决于战力、技能、压力、伤势和日薪。",
    points: [
      "基础战力只是起点，伤势会固定扣战力，压力会按比例折损最终战力。",
      "技能标签会影响契约匹配；契约推荐能力不是装饰，匹配越好越稳。",
      "点开佣兵卡可以查看档案和装备。装备能提高战力，也会带来维护支出。",
      "死人不会自动变成好消息，收尸和替换人员本身也是经营成本。",
    ],
  },
  missions: {
    eyebrow: "CONTRACTS",
    title: "契约页：先调查，再派遣",
    summary: "契约是主要收入来源，但公开情报故意不完整。调查花钱，盲接更贵。",
    points: [
      "战力区间越窄，越能判断小队是否够打。人均需求比总报酬更值得先看。",
      "敌方伤害类型、推荐武器、推荐能力、人数和机动兵器都会影响成功率与伤亡。",
      "点开契约后选择可派遣佣兵，再确认派遣。执行期间佣兵不算待命。",
      "来自明确势力的契约可能影响路线。天人残余契约尤其是不可逆选择。",
    ],
  },
  situation: {
    eyebrow: "SITUATION",
    title: "局势页：战争不是背景板",
    summary: "这里展示各势力和社会状态的变化。它们会影响契约来源、路线倾向和之后的风险。",
    points: [
      "SSS、FOF、锈蚀部队和天人残余不只是名字，它们代表不同路线和后果。",
      "局势数值变化会让某些类型契约更常出现，也可能关闭另一些合作。",
      "如果你频繁服务同一阵营，要准备承担对应路线的政治和生存代价。",
      "看不懂时先记一条：谁给钱不重要，谁被你得罪也会记账。",
    ],
  },
  expenses: {
    eyebrow: "EXPENSES",
    title: "支出页：利润死在账单里",
    summary: "这里显示每日和周期性支出。资金可以短期为负，隐秘归零才是真正失败。",
    points: [
      "待命佣兵要发日薪，执行契约时暂不发，回来后会补发。",
      "装备、设施和生活补给都会吃掉现金流。高战力队伍不是免费资产。",
      "隐秘费用和未支付声望会制造长期压力，月底前最好提前准备。",
      "推进一天前先看支出页，可以避免明明打赢了契约却被账单拖死。",
    ],
  },
  wealth: {
    eyebrow: "WEALTH",
    title: "财富页：把战争财变成胜利条件",
    summary: "这里不是纯装饰。财富收藏代表你的长期目标，也会把短期现金转化成进度。",
    points: [
      "资金富余时购买财富项目，推动长期目标。",
      "不要在现金流脆弱时硬买收藏；漂亮账本不能挡子弹，也不能付日薪。",
      "财富目标让游戏不只是活下去，而是决定你要把这场战争变成什么。",
    ],
  },
  facilities: {
    eyebrow: "FACILITIES",
    title: "基础设施页：升级前先想瓶颈",
    summary: "设施是长期投资。它们会改变招募、调查、治疗、黑市、防御和隐秘压力。",
    points: [
      "酒馆影响招募，兵营提高人数上限，情报室降低调查成本。",
      "医疗中心处理物理伤势，娱乐中心处理心理压力。不要等队伍全崩才升级。",
      "黑市提供装备和机动兵器渠道，但装备越多维护越贵。",
      "防御设施用于基地遇袭，隐秘越低越需要它兜底。",
    ],
  },
  warehouse: {
    eyebrow: "WAREHOUSE",
    title: "仓库页：装备是战力，也是负担",
    summary: "这里管理武器、防具和机动兵器。装备能救命，也会增加维护成本。",
    points: [
      "武器提供战力和伤害类型，防具提供防护类型和死亡率降低。",
      "机动兵器很强，但需要合适佣兵和更高维护成本。",
      "契约推荐武器和敌方伤害类型要一起看，别只追最高战力数字。",
      "闲置装备仍可能产生维护压力，仓库不是免费垃圾桶。",
    ],
  },
  mechs: {
    eyebrow: "MECHS",
    title: "机甲页：高风险高维护的战力跳跃",
    summary: "机甲适合对抗机动兵器威胁，但不是所有队伍都能用，也不是每个契约都值得动用。",
    points: [
      "敌方存在机动兵器时，没有对应机体会让成功率和伤亡变难看。",
      "机甲需要合适的佣兵能力标签，强行配置不一定划算。",
      "机甲维护成本高，适合关键契约，不适合每次都拿来碾小任务。",
    ],
  },
  help: {
    eyebrow: "MANUAL",
    title: "帮助页：忘了系统时来这里",
    summary: "这里集中放完整规则说明。第一次玩不需要全背，遇到问题再查就行。",
    points: [
      "新玩家优先读每日循环、契约与情报、隐秘与遇袭。",
      "如果资金老是崩，读支出和资金建议。",
      "如果战斗结果看不懂，读佣兵状态、装备与机动兵器。",
    ],
  },
};

function init() {
  renderAppShell(document.querySelector("#root"));
  router = initRouter({ onChange: handleTabChange });
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
  initBaseStatusSidebar();
  document.querySelector("#global-log-close").addEventListener("click", () => {
    closeGlobalLogSidebar();
  });
  document.querySelector("#base-status-close").addEventListener("click", () => {
    closeBaseStatusSidebar();
  });
  document.querySelector("#settlement-close").addEventListener("click", closeSettlementDialog);
  document.querySelector("#expense-approval-close").addEventListener("click", closeExpenseApprovalDialog);
  document.querySelector("#page-help-close").addEventListener("click", closePageHelpDialog);
  document.querySelectorAll("[data-page-help]").forEach((button) => {
    button.addEventListener("click", () => openPageHelp(button.dataset.pageHelp, { markSeen: true }));
  });
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
}

function handleTabChange(tabName) {
  showTabHelpOnce(tabName);
}

function showTabHelpOnce(tabName) {
  const state = getState();
  if (!state.introSeen || !tabName || state.tabHelpSeen?.[tabName]) return;
  openPageHelp(tabName, { markSeen: true });
}

function openPageHelp(tabName, { markSeen = false } = {}) {
  const help = PAGE_HELP[tabName];
  const dialog = document.querySelector("#page-help-dialog");
  if (!help || !dialog) return;
  document.querySelector("#page-help-eyebrow").textContent = help.eyebrow;
  document.querySelector("#page-help-title").textContent = help.title;
  document.querySelector("#page-help-summary").textContent = help.summary;
  document.querySelector("#page-help-content").innerHTML = `
    <ul>
      ${help.points.map((point) => `<li>${point}</li>`).join("")}
    </ul>
  `;
  if (markSeen && !getState().tabHelpSeen?.[tabName]) {
    updateState((draft) => {
      draft.tabHelpSeen ??= {};
      draft.tabHelpSeen[tabName] = true;
    }, { notify: false });
  }
  try {
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  } catch (error) {
    console.warn("Page help dialog could not be opened.", error);
  }
}

function closePageHelpDialog() {
  document.querySelector("#page-help-dialog")?.close();
}
function openCommunication(dialogueId, { onComplete = null } = {}) {
  const dialogue = dialogues[dialogueId];
  const dialog = document.querySelector("#communication-dialog");
  if (!dialogue || !dialog) return;
  activeCommunication = {
    dialogueId,
    nodeId: dialogue.start ?? Object.keys(dialogue.nodes ?? {})[0],
    onComplete,
  };
  renderCommunicationNode();
  try {
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  } catch (error) {
    console.warn("Communication dialog could not be opened.", error);
  }
}

function renderCommunicationNode() {
  if (!activeCommunication) return;
  const dialogue = dialogues[activeCommunication.dialogueId];
  const node = dialogue?.nodes?.[activeCommunication.nodeId];
  if (!dialogue || !node) return;
  const speaker = node.speaker ?? dialogue.speaker ?? {};
  const portrait = speaker.portrait ?? dialogue.speaker?.portrait;
  document.querySelector("#comm-channel").textContent = dialogue.channel ?? "CODEC / ENCRYPTED";
  document.querySelector("#comm-title").textContent = node.title ?? dialogue.title ?? "加密通讯";
  document.querySelector("#comm-frequency").textContent = node.frequency ?? dialogue.frequency ?? "140.85";
  document.querySelector("#comm-security").textContent = node.security ?? dialogue.security ?? "SCRAMBLE: ON";
  document.querySelector("#comm-speaker").textContent = speaker.name ?? "UNKNOWN";
  document.querySelector("#comm-speaker-role").textContent = speaker.role ?? "身份未确认";
  document.querySelector("#comm-text").textContent = node.text ?? "...";

  const portraitImage = document.querySelector("#comm-portrait-image");
  const portraitInitial = document.querySelector("#comm-portrait-initial");
  portraitImage.style.backgroundImage = portrait ? `url("${portrait}")` : "";
  portraitImage.classList.toggle("has-portrait", Boolean(portrait));
  portraitInitial.textContent = speaker.initial ?? speaker.name?.slice(0, 1) ?? "?";

  const choices = document.querySelector("#comm-choices");
  choices.innerHTML = "";
  (node.choices ?? []).forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = index === 0 ? "primary-button comm-choice" : "ghost-button comm-choice";
    button.type = "button";
    button.textContent = choice.text;
    button.addEventListener("click", () => advanceCommunication(choice));
    choices.append(button);
  });
}

function advanceCommunication(choice) {
  if (!activeCommunication || !choice) return;
  if (choice.action === "complete") {
    const onComplete = activeCommunication.onComplete;
    activeCommunication = null;
    document.querySelector("#communication-dialog")?.close();
    if (typeof onComplete === "function") onComplete();
    return;
  }
  if (choice.next) {
    activeCommunication.nodeId = choice.next;
    renderCommunicationNode();
  }
}

function showIntroIfNeeded() {
  const state = getState();
  if (state.introSeen) return;
  const dialog = document.querySelector("#communication-dialog");
  if (!dialog || dialog.open) return;
  openCommunication("intro", { onComplete: closeIntro });
}

function closeIntro() {
  updateState((draft) => {
    draft.introSeen = true;
  });
  showTabHelpOnce("overview");
}

function renderApp() {
  renderCommandPanel();
  renderResources();
  renderDebtReliefNotice();
  renderGlobalLog();
  renderSettlementDialog();
  renderOverview();
  renderSituation();
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
  openExpenseApprovalDialog();
}

function initGlobalLogSidebar() {
  const toggle = document.querySelector("#global-log-toggle");
  toggle?.addEventListener("click", () => {
    const sidebar = document.querySelector("#global-log-sidebar");
    const isOpen = sidebar?.classList.toggle("open");
    if (sidebar) sidebar.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      closeBaseStatusSidebar();
    }
  });
}

function closeGlobalLogSidebar() {
  const sidebar = document.querySelector("#global-log-sidebar");
  sidebar?.classList.remove("open");
  if (sidebar) sidebar.hidden = true;
  document.querySelector("#global-log-toggle")?.setAttribute("aria-expanded", "false");
}

function initBaseStatusSidebar() {
  const toggle = document.querySelector("#base-status-toggle");
  toggle?.addEventListener("click", () => {
    const sidebar = document.querySelector("#base-status-sidebar");
    const isOpen = sidebar?.classList.toggle("open");
    if (sidebar) sidebar.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      closeGlobalLogSidebar();
    }
  });
}

function closeBaseStatusSidebar() {
  const sidebar = document.querySelector("#base-status-sidebar");
  sidebar?.classList.remove("open");
  if (sidebar) sidebar.hidden = true;
  document.querySelector("#base-status-toggle")?.setAttribute("aria-expanded", "false");
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
    ["生活补给", `${dailyExpenses.supplies.total} 金/天`],
    ["待命佣兵", `${summary.availableRoster}/${state.roster.length}`],
    ["执行契约", `${summary.activeMissions}`],
    ["遇袭率", `${Math.max(0, 100 - state.stealth)}%`],
  ]
    .map(([label, value]) => `<div class="base-status-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderDebtReliefNotice() {
  const notice = getState().debtReliefNotice;
  if (!notice || notice.id === lastDebtReliefNoticeId) return;
  lastDebtReliefNoticeId = notice.id;
  showToast(
    `首次出现负资产，系统补偿 ${notice.compensation} 金。负资产只会让你不能购买；真正失败是隐秘值归零，意味着佣兵组织彻底暴露。`,
    "warning"
  );
}

function openExpenseApprovalDialog() {
  const state = getState();
  const breakdown = calculateDailyExpenseBreakdown(state);
  const secrecyItems = calculateSecrecyExpenseItems(state);
  const secrecyDue = isSecrecyBillingDay(state.day);
  const summary = document.querySelector("#expense-approval-summary");
  const content = document.querySelector("#expense-approval-content");
  const dialog = document.querySelector("#expense-approval-dialog");
  if (!summary || !content || !dialog) return;

  const secrecyTotal = secrecyDue ? secrecyItems.reduce((sum, item) => sum + item.cost, 0) : 0;
  const total = breakdown.total + secrecyTotal;
  summary.textContent = `第 ${state.day} 天结束前结算。当前资金 ${state.gold} 金，预计总支出 ${total} 金。`;
  content.innerHTML = `
    <section class="settlement-summary-grid">
      <article class="settlement-stat">
        <span>基地日支出</span>
        <strong>${breakdown.total}</strong>
      </article>
      <article class="settlement-stat">
        <span>隐秘费用</span>
        <strong>${secrecyTotal}</strong>
      </article>
      <article class="settlement-stat">
        <span>总计</span>
        <strong>${total}</strong>
      </article>
      <article class="settlement-stat">
        <span>当前资金</span>
        <strong>${state.gold}</strong>
      </article>
      <article class="settlement-stat">
        <span>生活补给</span>
        <strong>${breakdown.supplies.total} 金/天</strong>
      </article>
      <article class="settlement-stat">
        <span>待命佣兵</span>
        <strong>${state.roster.filter((character) => character.status === "待命").length}</strong>
      </article>
    </section>
    <section class="dossier-section">
      <h3>支出模块</h3>
      <div class="compact-field-list">
        <div class="field"><span>佣兵工资</span><strong>${breakdown.wages.total} 金</strong></div>
        <div class="field"><span>生活补给</span><strong>${breakdown.supplies.total} 金/天</strong></div>
        <div class="field"><span>装备养护</span><strong>${breakdown.equipment.total} 金</strong></div>
        <div class="field"><span>设施维持</span><strong>${breakdown.facilities.total + breakdown.base.total} 金</strong></div>
        <div class="field"><span>隐秘费用</span><strong>${secrecyDue ? `${secrecyTotal} 金` : "本日无需支付"}</strong></div>
      </div>
    </section>
    ${
      secrecyDue && secrecyItems.length > 0
        ? `
          <section class="dossier-section">
            <h3>本月隐秘费用</h3>
            <div class="expense-line-list">
              ${secrecyItems.map(renderSecrecyExpenseLine).join("")}
            </div>
          </section>
        `
        : ""
    }
    <div class="dialog-actions">
      <button id="expense-approval-confirm" class="approve-button" type="button">确认支出并进入下一天</button>
    </div>
  `;

  const confirmButton = content.querySelector("#expense-approval-confirm");
  confirmButton?.addEventListener("click", () => {
    const before = getState();
    const currentBreakdown = calculateDailyExpenseBreakdown(before);
    const currentSecrecyItems = calculateSecrecyExpenseItems(before);
    const currentSecrecyDue = isSecrecyBillingDay(before.day);
    const paidSecrecyIds = [...content.querySelectorAll("[data-secrecy-pay]:checked")].map((input) => input.value);
    const finalCost = currentBreakdown.total + (currentSecrecyDue ? currentSecrecyItems.filter((item) => paidSecrecyIds.includes(item.id)).reduce((sum, item) => sum + item.cost, 0) : 0);
    if (!confirmResourceSpend("确认今日支出并进入下一天", finalCost)) return;
    if (currentSecrecyDue) approveSecrecyExpenses(paidSecrecyIds);
    advanceDay();
    const after = getState();
    showToast(`已进入第 ${after.day} 天。本次结算支出 ${finalCost} 金，剩余 ${after.gold} 金。`, "good");
    closeExpenseApprovalDialog();
  });

  dialog.showModal();
}

function closeExpenseApprovalDialog() {
  document.querySelector("#expense-approval-dialog")?.close();
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
      ${
        settlement.lootName
          ? `<p class="muted">战利品：${settlement.lootName}${settlement.lootType || settlement.lootRarity ? `（${[settlement.lootType, settlement.lootRarity ? `${settlement.lootRarity}级` : ""].filter(Boolean).join(" / ")}）` : ""}</p>`
          : ""
      }
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
  summaryGrid.innerHTML = "";

  list.innerHTML = [
    renderExpenseCard("佣兵工资", `${breakdown.wages.items.length} 名待命佣兵`, "仅待命佣兵按日支付；执行契约期间暂不支付，归来后补发。", breakdown.wages.items, renderWageExpenseLine, `${breakdown.wages.total} 金`),
    renderSupplyExpenseSection(breakdown.supplies),
    renderExpenseCard("装备养护", `${breakdown.equipment.items.length} 件装备`, "武器、防具和机动兵器无论是否装备都需要维护；机动兵器维护费更高。", breakdown.equipment.items, renderEquipmentExpenseLine, `${breakdown.equipment.total} 金`),
    renderExpenseCard("基础设施维持", `${breakdown.facilities.items.length} 座设施`, "基地基础开销加已解锁设施维持费。", [...breakdown.base.items, ...breakdown.facilities.items], renderFacilityExpenseLine, `${breakdown.base.total + breakdown.facilities.total} 金`),
    renderSecrecyExpenseCard(secrecyItems, unpaidSecrecy, secrecyDue),
  ].join("");

  list.querySelectorAll("[data-expense-card]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleExpenseCard(button.dataset.expenseCard);
    });
  });
  list.querySelector("[data-buy-emergency-stealth]")?.addEventListener("click", handleEmergencyStealthSpend);
}

function renderSecrecyExpenseCard(items, unpaidSecrecy, secrecyDue) {
  const total = items.reduce((sum, item) => sum + item.cost, 0);
  const state = getState();
  const cost = economyConfig.secrecy.emergencyStealthCost ?? 500;
  const gain = economyConfig.secrecy.emergencyStealthGain ?? 5;
  const canBuyEmergency = state.gameStatus === "active" && (state.stealth ?? 0) < 100 && (state.gold ?? 0) >= cost;
  return `
    <section class="expense-card-shell">
      <button class="expense-card-header" data-expense-card="secrecy" type="button">
        <div>
          <h3>隐秘费用</h3>
          <p class="muted">${secrecyDue ? `${items.length} 个支付对象` : `未遮掩声望 ${unpaidSecrecy}`}</p>
        </div>
        <span class="badge">${secrecyDue ? `${total} 金/月` : `未遮掩 ${unpaidSecrecy}`}</span>
      </button>
      <div class="expense-card-detail" data-expense-detail="secrecy" hidden>
        <p class="muted">${
          secrecyDue
            ? "月初结算。可任意勾选支付对象；未支付的声望会永久累计为未遮掩声望，并立即降低隐秘值。"
            : `本日无需结算。当前永久未遮掩声望 ${unpaidSecrecy}，每日遇袭率由隐秘值决定。`
        }</p>
        <div class="button-row">
          <button class="primary-button" data-buy-emergency-stealth ${canBuyEmergency ? "" : "disabled"} type="button">紧急隐蔽 · ${cost} 金 / +${gain} 隐秘值</button>
        </div>
        ${
          secrecyDue && items.length > 0
            ? `<div class="expense-line-list">${items.map(renderSecrecyExpenseLine).join("")}</div>`
            : `<p class="muted">${secrecyDue ? "暂无需要遮掩的声望" : "隐秘费每 30 天结算一次，第 1 天不收。"}</p>`
        }
      </div>
    </section>
  `;
}

function handleEmergencyStealthSpend() {
  const cost = economyConfig.secrecy.emergencyStealthCost ?? 500;
  const gain = economyConfig.secrecy.emergencyStealthGain ?? 5;
  const state = getState();
  if ((state.stealth ?? 0) >= 100) {
    showSpendFailure("紧急隐蔽", "隐秘值已满。");
    return;
  }
  if (state.gold < cost) {
    showInsufficientFunds(state.gold, cost);
    return;
  }
  if (!confirmGoldSpend(`紧急隐蔽：提高 ${gain} 点隐秘值`, cost)) return;
  const before = getState();
  const result = buyEmergencyStealth();
  const after = getState();
  if (!result.ok) {
    showSpendFailure("紧急隐蔽", result.reason || "操作没有完成。");
    return;
  }
  showSpendSuccess("紧急隐蔽", before.gold - after.gold, after.gold);
  showToast(`隐秘值提高 ${result.gain} 点，当前 ${after.stealth}/100。`, "good");
  renderApp();
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

function renderSupplyExpenseSection(supplies) {
  return `
    <section class="expense-card-shell">
      <button class="expense-card-header" data-expense-card="supplies" type="button">
        <div>
          <h3>生活补给</h3>
          <p class="muted">${supplies.items.length} 名在籍佣兵自动结算</p>
        </div>
        <span class="badge">${supplies.total} 金/天</span>
      </button>
      <div class="expense-card-detail" data-expense-detail="supplies" hidden>
        <p class="muted">生活补给不再囤货，按佣兵评级每日自动折算为金钱支出。高等级佣兵消耗更多。</p>
        ${
          supplies.items.length > 0
            ? `<div class="expense-line-list">${supplies.items.map(renderSupplyExpenseLine).join("")}</div>`
            : `<p class="muted">暂无支出</p>`
        }
      </div>
    </section>
  `;
}

function renderExpenseCard(title, subtitle, description, items, renderLine, totalText) {
  const key = title;
  return `
    <section class="expense-card-shell">
      <button class="expense-card-header" data-expense-card="${key}" type="button">
        <div>
          <h3>${title}</h3>
          <p class="muted">${subtitle}</p>
        </div>
        <span class="badge">${totalText}</span>
      </button>
      <div class="expense-card-detail" data-expense-detail="${key}" hidden>
        <p class="muted">${description}</p>
        ${
          items.length > 0
            ? `<div class="expense-line-list">${items.map(renderLine).join("")}</div>`
            : `<p class="muted">暂无支出</p>`
        }
      </div>
    </section>
  `;
}

function toggleExpenseCard(key) {
  const detail = document.querySelector(`[data-expense-detail="${CSS.escape(key)}"]`);
  if (!detail) return;
  detail.hidden = !detail.hidden;
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
      <small>${item.rank}级 · ${item.amount} 份折算</small>
      <strong>${item.cost} 金</strong>
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

function renderSituation() {
  const state = getState();
  const balance = state.factionBalance ?? {};
  const routes = state.storyRoutes ?? {};
  const war = normalizePercentGroup(balance.war ?? { SSS: 70, FOF: 24, 天人残余: 5, 锈蚀部队: 1 });
  const map = document.querySelector("#situation-map");
  const relations = document.querySelector("#situation-relations");
  const badge = document.querySelector("#situation-badge");
  if (!map || !relations || !badge) return;

  badge.textContent = `SSS ${war.SSS}% / FOF ${war.FOF}% / 天人 ${war.天人残余}% / 锈蚀 ${war.锈蚀部队}%`;
  map.innerHTML = `
    ${renderEndingPanel(state)}
    ${renderStoryRouteStatus(routes)}
    ${renderFactionBackgrounds()}
  `;

  relations.innerHTML = [
    renderRelationAxis("内战主轴", normalizePercentGroup(balance.war ?? { SSS: 70, FOF: 24, 天人残余: 5, 锈蚀部队: 1 }), [
      { key: "SSS", label: "SSS", color: "#c84b4b" },
      { key: "FOF", label: "FOF", color: "#4b8fd8" },
      { key: "天人残余", label: "天人残余", color: "#f4f1df" },
      { key: "锈蚀部队", label: "锈蚀部队", color: "#8f3328" },
    ]),
    renderRelationAxis("战争经济", normalizePercentGroup(balance.economy ?? { 黑市商会: 50, 企业财团: 50 }), [
      { key: "黑市商会", label: "黑市商会", color: "#d4a64a" },
      { key: "企业财团", label: "企业财团", color: "#6f89a8" },
    ]),
    renderRelationAxis("基层秩序", normalizePercentGroup(balance.order ?? { 民生秩序: 90, 地方暴力: 10 }), [
      { key: "民生秩序", label: "民生秩序", color: "#72a06a" },
      { key: "地方暴力", label: "地方暴力", color: "#9c6b4a" },
    ]),
    renderRelationAxis("异源态度", normalizePercentGroup(balance.xenotech ?? { 纯净社区: 34, 科研机构: 33, 异源教会: 33 }), [
      { key: "纯净社区", label: "纯净社区", color: "#e7e4d5" },
      { key: "科研机构", label: "科研机构", color: "#66a7aa" },
      { key: "异源教会", label: "异源教会", color: "#9b6bd3" },
    ]),
  ].join("");
}

function renderEndingPanel(state) {
  if (!state.ending) return "";
  return `
    <section class="ending-panel ending-${state.gameStatus}">
      <span>${state.gameStatus === "lost" ? "失败结局" : "结局达成"}</span>
      <strong>${state.ending.title}</strong>
      <em>${state.ending.subtitle ?? ""}</em>
      <p>${state.ending.text ?? ""}</p>
    </section>
  `;
}

function renderStoryRouteStatus(routes) {
  const locked = routes.lockedRoute ? formatStoryRouteName(routes.lockedRoute) : "未锁定";
  return `
    <div class="route-status-grid">
      <article><span>当前路线</span><strong>${locked}</strong></article>
      <article><span>SSS进度</span><strong>${routes.progress?.SSS ?? 0}</strong></article>
      <article><span>FOF进度</span><strong>${routes.progress?.FOF ?? 0}</strong></article>
      <article><span>锈蚀进度</span><strong>${routes.progress?.rust ?? 0}</strong></article>
      <article><span>天人进度</span><strong>${routes.progress?.heaven ?? 0}</strong></article>
      <article><span>锈蚀关注</span><strong>${routes.attention?.rust ?? 0}</strong></article>
      <article><span>矩阵破坏度</span><strong>${routes.matrixDamage ?? 0}</strong></article>
      <article><span>天人协定</span><strong>${routes.heavenPact ? "已触发" : "未触发"}</strong></article>
    </div>
    <div class="story-route-stage-grid">
      ${storyRouteOrder.map((route) => renderStoryRouteStageCard(route, routes)).join("")}
    </div>
  `;
}

function renderStoryRouteStageCard(route, routes) {
  const config = getStoryRouteConfig(route);
  const progress = routes.progress?.[route] ?? 0;
  const next = config?.stageMissions.find((stage) => stage.stage === progress + 1);
  const complete = config && progress >= config.endingStage;
  const lockedOut = routes.lockedRoute && routes.lockedRoute !== route;
  return `
    <article class="story-route-stage-card story-route-${route}">
      <div>
        <strong>${config?.displayName ?? route}</strong>
        <span>${config?.theme ?? ""}</span>
      </div>
      <p>${config?.effects?.description ?? ""}</p>
      <div class="field-list">
        <div class="field"><span>当前阶段</span><strong>${progress}/${config?.endingStage ?? 5}</strong></div>
        <div class="field"><span>下一契约</span><strong>${complete ? "结局已达成" : lockedOut ? "路线已关闭" : next?.title ?? "待触发"}</strong></div>
      </div>
    </article>
  `;
}


function renderFactionBackgrounds() {
  const factions = [
    {
      name: "SSS",
      role: "秩序回收线",
      text: "旧秩序、中央军、元老院和矩阵基础设施的集合体。它能恢复供电、医院、工厂和安全体系，也会把审查、清洗和合法脏活一起带回来。",
    },
    {
      name: "FOF",
      role: "改革战争线",
      text: "反元老院、支持后翼遗产与联合审计的改革派。它能揭露腐败、保护证词和争取地方支持，也会在战争中制造宣传、诱饵和临时军政府。",
    },
    {
      name: "锈蚀部队",
      role: "矩阵熄灭线",
      text: "以抹杀异源技术为目标的焦土组织。它能削弱机动兵器和异源战争机器，也会破坏能源、通信、净水、医疗和生产网络。",
    },
    {
      name: "天人残余",
      role: "异源代理线",
      text: "曾经统治或压迫地球的外星势力残余。它能提供超越人类技术的支援，但公开接受其契约会让玩家永久站到人类共同记忆的敌人一侧。",
    },
    {
      name: "黑市商会 / 企业财团",
      role: "战争经济支线",
      text: "一边从混乱里榨出利润，一边害怕混乱毁掉交易本身。它们不直接决定结局，但能改变装备、资金、维护和特殊资源的获取方式。",
    },
    {
      name: "纯净社区 / 科研机构 / 异源教会",
      role: "异源态度支线",
      text: "围绕异源技术的拒绝、研究与崇拜形成的三角关系。它们会影响玩家如何理解天人遗产，以及如何处理异源装备和异常事件。",
    },
  ];
  return `
    <section class="faction-background-panel">
      <div class="situation-section-title">
        <strong>势力背景</strong>
        <span class="muted">每条路线都有收益，也有代价。</span>
      </div>
      <div class="faction-background-grid">
        ${factions.map((faction) => `
          <article class="faction-background-card">
            <strong>${faction.name}</strong>
            <span>${faction.role}</span>
            <p>${faction.text}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function formatStoryRouteName(route) {
  return { SSS: "SSS", FOF: "FOF", rust: "锈蚀部队", heaven: "天人残余" }[route] ?? "未知路线";
}

function renderRelationAxis(title, values, factions) {
  return `
    <article class="relation-axis-card">
      <div class="relation-axis-header">
        <strong>${title}</strong>
        <span class="muted">总计 100%</span>
      </div>
      <div class="relation-axis-bar">
        ${factions
          .map((faction) => {
            const value = values[faction.key] ?? 0;
            return `<div class="relation-axis-segment" style="--segment-color:${faction.color}; width:${value}%;" title="${faction.label} ${value}%"></div>`;
          })
          .join("")}
      </div>
      <div class="relation-axis-labels">
        ${factions
          .map((faction) => `<span><i style="background:${faction.color};"></i>${faction.label} <strong>${values[faction.key] ?? 0}%</strong></span>`)
          .join("")}
      </div>
    </article>
  `;
}

function normalizePercentGroup(group) {
  const entries = Object.entries(group ?? {});
  const total = entries.reduce((sum, [, value]) => sum + Math.max(0, Number(value) || 0), 0) || 1;
  let remaining = 100;
  return Object.fromEntries(
    entries.map(([key, value], index) => {
      const normalized = index === entries.length - 1 ? remaining : Math.round((Math.max(0, Number(value) || 0) / total) * 100);
      remaining -= normalized;
      return [key, Math.max(0, normalized)];
    })
  );
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
      const isStacked = isStackedFacilityCard(id);
      const canUpgrade = (isStacked || level < 7) && canUpgradeFacility(id);
      const disabled = state.gameStatus !== "active" || !canUpgrade ? "disabled" : "";
      const nextRank = getFacilityRankLabel(Math.min(level + 1, 7));
      const statusText = getFacilityStatusText(id, facility, level, isUnlocked, rank);
      const badgeText = isStacked ? `${level} 座` : isUnlocked ? rank : "未解锁";
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
          ${renderFacilityProgressText(id, level, cost, nextRank)}
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

function isStackedFacilityCard(id) {
  return id === "defenses" || id === "shelter";
}

function getShelterCapacity(level) {
  return level * economyConfig.facilities.shelterCapacityPerBuild;
}

function getFacilityStatusText(id, facility, level, isUnlocked, rank) {
  if (id === "defenses") {
    return isUnlocked ? `${level} 座 · 基地战斗力 +${level * economyConfig.facilities.defensePowerPerLevel}` : "未修建";
  }
  if (id === "shelter") {
    return isUnlocked ? `${level} 座 · 可收容 ${getShelterCapacity(level)} 名难民` : "未修建";
  }
  return isUnlocked ? `${rank}级 · 维护费 ${facility.upkeep * level}/天` : "未解锁";
}

function renderFacilityProgressText(id, level, cost, nextRank) {
  if (id === "defenses") {
    return `<p class="muted">继续修建：防御战斗力 +${economyConfig.facilities.defensePowerPerLevel} · 费用 ${cost} 金</p>`;
  }
  if (id === "shelter") {
    return `<p class="muted">继续修建：难民容量 +${economyConfig.facilities.shelterCapacityPerBuild} · 费用 ${cost} 金</p>`;
  }
  if (level < 7) return `<p class="muted">下一阶段：${nextRank}级 · 费用 ${cost} 金</p>`;
  return `<p class="muted">已达到最高等级。</p>`;
}

function renderFacilityAction(id, level, cost, disabled) {
  const state = getState();
  if (id === "defenses") return `<button class="primary-button" data-upgrade="${id}" ${disabled}>修建防御设施 · ${cost} 金</button>`;
  if (id === "shelter") return `<button class="primary-button" data-upgrade="${id}" ${disabled}>修建避难所 · ${cost} 金</button>`;
  if (level <= 0) return `<button class="primary-button" data-upgrade="${id}" ${disabled}>解锁 F级 · ${cost} 金</button>`;
  const upgradeButton = renderFacilityUpgradeButton(id, level, cost, disabled);
  if (id === "blackMarket") {
    const rank = getFacilityRankLabel(level);
    const mechaRank = getBlackMarketMechaPurchaseRank(rank, { allowRare: false });
    const actions = [
      ["weapon", "购买武器"],
      ["armor", "购买防具"],
      ...(mechaRank ? [["mecha", "购买机动兵器"]] : []),
    ];
    return actions
      .map(([kind, label]) => {
        const itemRank = kind === "mecha" ? mechaRank : rank;
        const itemCost = getBlackMarketItemCost(kind, rank);
        const isDisabled = state.gameStatus !== "active" ? "disabled" : "";
        return `<button class="${kind === "mecha" ? "primary-button" : "ghost-button"}" data-buy-black-market-item="${kind}" ${isDisabled}>${label} · ${itemRank}级 ${itemCost} 金</button>`;
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
  if (id === "shelter") return `<button class="ghost-button" data-upgrade="${id}" ${disabled}>继续修建 · ${cost} 金</button>`;
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
  const isStacked = isStackedFacilityCard(id);
  const canUpgrade = (isStacked || level < 7) && canUpgradeFacility(id);
  const nextRank = getFacilityRankLabel(Math.min(level + 1, 7));
  const specialText = {
    blackMarket: (() => {
      const mechaRank = getBlackMarketMechaPurchaseRank(rank, { allowRare: false });
      return mechaRank
        ? `只能买到当前黑市评级的常规武器与防具。机动兵器从 C级黑市解锁，当前常规货源为 ${mechaRank}级，极低概率出现更高级机体。`
        : `只能买到当前黑市评级的常规武器与防具。机动兵器需要 C级及以上黑市。`;
    })(),
    hospital: (() => {
      const plan = calculateHospitalTreatmentPlan(state);
      return `按单个佣兵身上的单个物理负面状态收费并尝试移除。当前可处理 ${plan.entries.length} 个标签，总费用 ${plan.cost} 金，成功率 ${plan.successChance}%，最高可处理 ${plan.maxPoints} 点伤势标签。`;
    })(),
    entertainmentCenter: (() => {
      const plan = calculateEntertainmentCenterTreatmentPlan(state);
      return `按单个佣兵身上的单个心理负面状态收费并尝试移除。当前可处理 ${plan.entries.length} 个标签，总费用 ${plan.cost} 金，成功率 ${plan.successChance}%，最高可处理 ${plan.maxPoints} 点压力标签。`;
    })(),
    defenses: `基地遭遇突袭时提供额外战斗力。当前已建 ${level} 座，防御战斗力 +${(state.facilities.defenses ?? 0) * economyConfig.facilities.defensePowerPerLevel}。`,
    shelter: `每座避难所可收容 ${economyConfig.facilities.shelterCapacityPerBuild} 名战争难民。当前已建 ${level} 座，可收容 ${getShelterCapacity(level)} 名难民。`,
    tavern: "提高招募池规模，便于寻找更多候选佣兵。",
    barracks: `提高可雇佣佣兵上限。当前上限 ${economyConfig.facilities.baseMercenaryLimit + (state.facilities.barracks ?? 0) * economyConfig.facilities.barracksMercenaryLimitPerLevel} 人，每升 1 级 +${economyConfig.facilities.barracksMercenaryLimitPerLevel}。`,
    intel: `每级降低调查契约情报费用 ${Math.round(economyConfig.facilities.intelInvestigationDiscountPerLevel * 100)}%，总折扣仍受调查折扣上限限制。`,
  }[id] ?? "基础设施效果待扩展。";

  document.querySelector("#facility-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">基础设施 / ${id.toUpperCase()}</div>
        <h2 class="dossier-title">${facility.name}</h2>
        <p class="muted">${getFacilityStatusText(id, facility, level, isUnlocked, rank)}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-facility aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>状态</h3>
        <div class="field-list">
          ${renderFacilityStatusFields(id, facility, level, isUnlocked, rank, nextCost, nextRank)}
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

function renderFacilityStatusFields(id, facility, level, isUnlocked, rank, nextCost, nextRank) {
  if (id === "defenses") {
    return `
      <div class="field"><span>已建数量</span><strong>${level} 座</strong></div>
      <div class="field"><span>防御战斗力</span><strong>+${level * economyConfig.facilities.defensePowerPerLevel}</strong></div>
      <div class="field"><span>维护费</span><strong>${facility.upkeep * level} 金/天</strong></div>
      <div class="field"><span>继续修建</span><strong>${nextCost} 金</strong></div>
      <div class="field"><span>单座加成</span><strong>+${economyConfig.facilities.defensePowerPerLevel}</strong></div>
    `;
  }
  if (id === "shelter") {
    return `
      <div class="field"><span>已建数量</span><strong>${level} 座</strong></div>
      <div class="field"><span>收容容量</span><strong>${getShelterCapacity(level)} 名</strong></div>
      <div class="field"><span>维护费</span><strong>${facility.upkeep * level} 金/天</strong></div>
      <div class="field"><span>继续修建</span><strong>${nextCost} 金</strong></div>
      <div class="field"><span>单座容量</span><strong>+${economyConfig.facilities.shelterCapacityPerBuild} 名</strong></div>
    `;
  }
  return `
    <div class="field"><span>当前状态</span><strong>${isUnlocked ? "已解锁" : "未解锁"}</strong></div>
    <div class="field"><span>评级</span><strong>${rank}</strong></div>
    <div class="field"><span>维护费</span><strong>${facility.upkeep * level} 金/天</strong></div>
    <div class="field"><span>${isUnlocked ? "升级费用" : "解锁费用"}</span><strong>${level >= 7 ? "已满级" : `${nextCost} 金`}</strong></div>
    <div class="field"><span>下一评级</span><strong>${level >= 7 ? "S级" : `${nextRank}级`}</strong></div>
    <div class="field"><span>升级条件</span><strong>${level >= 7 ? "已完成" : "支付费用"}</strong></div>
  `;
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
  const action = id === "defenses" ? "修建防御设施" : id === "shelter" ? "修建避难所" : `${facility?.name ?? "设施"}升级`;
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
  const labels = { weapon: "黑市购买武器", armor: "黑市购买防具", mecha: "黑市购买机动兵器" };
  const action = labels[kind] ?? "黑市采购";
  const cost = getCostFromText(button.textContent);
  if (!confirmGoldSpend(action, cost)) return false;
  const before = getState();
  const beforeCount = before.inventory.length;
  const beforeGold = before.gold;
  buyBlackMarketItem(kind);
  const after = getState();
  const afterCount = after.inventory.length;
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
