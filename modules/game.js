import { getState, updateState } from "../js/state.js";
import { clamp, createId } from "../js/utils.js";
import { getWealthProgress } from "./wealth.js";

export function getGameSummary() {
  const state = getState();
  return buildGameSummary(state);
}

export function buySupplies() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const cost = 36;
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.supplies += 8;
    draft.stealth = clamp(draft.stealth - 2, 0, 100);
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "base",
      title: "黑市补给",
      status: "done",
      detail: "购入 8 份补给。",
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金购入 8 份黑市补给，隐秘值下降 2。`);
  });
}

export function treatWounds() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const wounded = draft.roster.filter((character) => character.wound > 0 || character.stress >= 10);
    const cost = 28;
    if (wounded.length === 0) {
      draft.log.push(`第 ${draft.day} 天：没有需要地下医疗处理的伤员。`);
      return;
    }
    if (draft.gold < cost) return;
    draft.gold -= cost;
    wounded.forEach((character) => {
      character.wound = Math.max(0, character.wound - 1);
      character.stress = Math.max(0, character.stress - 6);
      character.hp = Math.min(character.maxHp, character.hp + 8);
    });
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "base",
      title: "地下医疗",
      status: "done",
      detail: `${wounded.length} 名佣兵恢复。`,
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金安排地下医疗，${wounded.length} 名佣兵恢复。`);
  });
}

export function reduceHeat() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const cost = 42;
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.stealth = clamp(draft.stealth + 12, 0, 100);
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "base",
      title: "清理痕迹",
      status: "done",
      detail: "隐秘值恢复 12。",
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金清理身份链路，隐秘值恢复 12。`);
  });
}

export function evaluateGameOverDraft(draft) {
  if (draft.gameStatus !== "active") return;

  const wealthProgress = getWealthProgress(draft);
  if (wealthProgress.complete) {
    draft.gameStatus = "won";
    draft.log.push(`第 ${draft.day} 天：收藏室全部填满。战争财完成私人化，短局胜利。`);
    return;
  }

  if (draft.stealth <= 0) {
    draft.gameStatus = "lost";
    draft.log.push(`第 ${draft.day} 天：隐秘值归零。身份链路暴露，事务所被迫撤离，短局失败。`);
    return;
  }

  if (draft.day > draft.objective.deadline) {
    draft.gameStatus = "lost";
    draft.log.push(`第 ${draft.day} 天：期限已过，收藏室仍未完工。投资人失去耐心，短局失败。`);
  }
}

function buildGameSummary(state) {
  const daysLeft = Math.max(0, state.objective.deadline - state.day + 1);
  const wealthProgress = getWealthProgress(state);
  const activeContracts = state.missions.filter((mission) => mission.status === "active").length;
  const availableRoster = state.roster.filter((character) => character.status === "待命").length;
  return {
    status: state.gameStatus,
    daysLeft,
    reputationLeft: Math.max(0, wealthProgress.total - wealthProgress.owned),
    wealthProgress,
    activeContracts,
    availableRoster,
    objectiveText: `${state.objective.deadline} 天内买完整个私人收藏室：${wealthProgress.owned}/${wealthProgress.total}`,
  };
}
