import { getState } from "../js/state.js";

export function getMechs() {
  return getState().mechs;
}

