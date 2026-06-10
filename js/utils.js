export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createId() {
  return crypto.randomUUID();
}

