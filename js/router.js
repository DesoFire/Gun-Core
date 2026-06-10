export function initRouter({ onChange } = {}) {
  const buttons = document.querySelectorAll("[data-tab-target]");
  const pages = document.querySelectorAll("[data-tab-page]");

  function switchTab(tabName) {
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tabTarget === tabName);
    });
    pages.forEach((page) => {
      page.classList.toggle("active", page.dataset.tabPage === tabName);
    });
    onChange?.(tabName);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });

  switchTab(document.querySelector("[data-tab-target].active")?.dataset.tabTarget ?? "personnel");
  return { switchTab };
}

