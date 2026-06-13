export function renderMercenaryAvatar(character, options = {}) {
  const size = options.size ?? "medium";
  const avatar = character.avatar ?? {};
  const initial = avatar.initial ?? getNameInitial(character.name);
  const style = [
    `--avatar-bg:${avatar.bg ?? "#2f4658"}`,
    `--avatar-fg:${avatar.fg ?? "#f4efe4"}`,
    `--avatar-ring:${avatar.ring ?? "#8bb7c9"}`,
  ].join(";");

  return `
    <span class="merc-avatar merc-avatar-${size}" style="${style}" title="${character.name}" aria-label="${character.name}">
      <span>${initial}</span>
    </span>
  `;
}

function getNameInitial(name = "?") {
  const compact = String(name).trim().replace(/\s+/g, "");
  return compact.slice(0, 1) || "?";
}
