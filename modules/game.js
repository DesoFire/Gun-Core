import { getState } from "../js/state.js";
import { getWealthProgress } from "./wealth.js";

export function getGameSummary() {
  const state = getState();
  return buildGameSummary(state);
}

export function evaluateGameOverDraft(draft) {
  if (draft.gameStatus !== "active") return;

  const wealthProgress = getWealthProgress(draft);
  if (wealthProgress.complete) {
    draft.gameStatus = "won";
    draft.log.push(`第 ${draft.day} 天：收藏室全部填满。战争财完成私人化，游戏胜利。`);
    return;
  }

  if (draft.stealth <= 0) {
    draft.gameStatus = "lost";
    draft.log.push(`第 ${draft.day} 天：隐秘值归零。身份链路暴露，事务所被迫撤离，游戏失败。`);
    return;
  }
}

function buildGameSummary(state) {
  const wealthProgress = getWealthProgress(state);
  const activeMissions = state.missions.filter((mission) => mission.status === "active").length;
  const availableRoster = state.roster.filter((character) => character.status === "待命").length;
  return {
    status: state.gameStatus,
    reputationLeft: Math.max(0, wealthProgress.total - wealthProgress.owned),
    wealthProgress,
    activeMissions,
    availableRoster,
    objectiveText: `买完整个私人收藏室：${wealthProgress.owned}/${wealthProgress.total}`,
  };
}
