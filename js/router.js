export function initRouter({ onChange } = {}) {
  const buttons = document.querySelectorAll("[data-tab-target]:not([hidden])");
  const pages = document.querySelectorAll("[data-tab-page]:not([hidden])");

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

  const activeVisibleTab = document.querySelector("[data-tab-target].active:not([hidden])")?.dataset.tabTarget;
  switchTab(activeVisibleTab ?? "overview");
  return { switchTab };
}

