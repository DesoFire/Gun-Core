export function showToast(message, tone = "warning") {
  let container = document.querySelector("#toast-stack");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-stack";
    container.className = "toast-stack";
    document.body.append(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  container.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

export function showInsufficientFunds(currentGold, cost) {
  const missing = Math.max(0, cost - currentGold);
  showToast(`资金不足。当前 ${currentGold} 金，还差 ${missing} 金。`, "bad");
}

export function confirmResourceSpend(action, cost, resource = "金") {
  return window.confirm(`${action}\n需要花费 ${cost} ${resource}。是否确认？`);
}

export function showSpendSuccess(action, cost, remainingGold) {
  const remainingText = Number.isFinite(remainingGold) ? `，剩余 ${remainingGold} 金` : "";
  showToast(`${action}成功，花费 ${cost} 金${remainingText}。`, "good");
}

export function showSpendFailure(action, reason = "条件不满足或资源不足。") {
  showToast(`${action}失败：${reason}`, "bad");
}
