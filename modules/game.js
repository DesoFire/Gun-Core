import { getState } from "../js/state.js";
import { getStoryRouteConfig } from "../data/storyRoutes.js";
import { getWealthProgress } from "./wealth.js";

export function getGameSummary() {
  const state = getState();
  return buildGameSummary(state);
}

export function evaluateGameOverDraft(draft) {
  if (draft.gameStatus !== "active") return;

  const wealthProgress = getWealthProgress(draft);
  const routeEnding = getCompletedStoryRouteEnding(draft);
  if (routeEnding) {
    draft.gameStatus = "won";
    draft.ending = routeEnding;
    draft.log.push(`第 ${draft.day} 天：主线结局「${routeEnding.title}」达成。${routeEnding.subtitle}`);
    return;
  }

  if (wealthProgress.complete) {
    draft.gameStatus = "won";
    draft.ending = {
      id: "wealth-private-collection",
      route: "wealth",
      title: "私人收藏室",
      subtitle: "战争财完成私人化",
      text: "收藏室全部填满。战争仍在继续，但至少有一部分已经被你成功搬进了私人资产负债表。",
    };
    draft.log.push(`第 ${draft.day} 天：收藏室全部填满。战争财完成私人化，游戏胜利。`);
    return;
  }

  if (draft.stealth <= 0) {
    draft.gameStatus = "lost";
    draft.ending = {
      id: "secrecy-collapse",
      route: "failure",
      title: "身份暴露",
      subtitle: "隐秘值归零",
      text: "身份链路暴露，事务所被迫撤离。GMS 仍然能打开，只是所有按钮都已经没有收件人。",
    };
    draft.log.push(`第 ${draft.day} 天：隐秘值归零。身份链路暴露，事务所被迫撤离，游戏失败。`);
    return;
  }
}

function getCompletedStoryRouteEnding(draft) {
  const progress = draft.storyRoutes?.progress ?? {};
  const lockedRoute = draft.storyRoutes?.lockedRoute ?? null;
  if (!lockedRoute) return null;
  const config = getStoryRouteConfig(lockedRoute);
  if (!config) return null;
  if ((progress[lockedRoute] ?? 0) < config.endingStage) return null;
  return {
    ...config.ending,
    route: lockedRoute,
  };
}

function buildGameSummary(state) {
  const wealthProgress = getWealthProgress(state);
  const activeMissions = state.missions.filter((mission) => mission.status === "active").length;
  const availableRoster = state.roster.filter((character) => character.status === "待命").length;
  return {
    status: state.gameStatus,
    ending: state.ending ?? null,
    reputationLeft: Math.max(0, wealthProgress.total - wealthProgress.owned),
    wealthProgress,
    activeMissions,
    availableRoster,
    objectiveText: `买完整个私人收藏室：${wealthProgress.owned}/${wealthProgress.total}`,
  };
}
