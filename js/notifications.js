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
  showToast(`资金不足。当前 ${currentGold} 金，还差 ${Math.max(0, cost - currentGold)} 金。`);
}
