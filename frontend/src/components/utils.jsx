// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
function parseArray(e, t = []) {
  if (Array.isArray(e)) return e;
  if (typeof e == `string`)
    try {
      let n = JSON.parse(e);
      return Array.isArray(n) ? n : t;
    } catch (e) {
      return t;
    }
  return t;
}
function settingString(e, t = ``) {
  return typeof e == `string` ? e : typeof e == `number` || typeof e == `boolean` ? String(e) : t;
}
export { settingString as n, parseArray as t };
