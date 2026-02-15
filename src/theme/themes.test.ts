import { describe, expect, test } from "bun:test";
import { THEMES, THEME_NAMES, isThemeName } from "./themes";

describe("themes", () => {
  test("theme names are complete", () => {
    expect(THEME_NAMES).toEqual(["dark", "light-hc"]);
    expect(isThemeName("dark")).toBe(true);
    expect(isThemeName("light-hc")).toBe(true);
    expect(isThemeName("unknown")).toBe(false);
  });

  test("all theme tokens are non-empty", () => {
    for (const [name, palette] of Object.entries(THEMES)) {
      for (const [key, value] of Object.entries(palette)) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
      expect(name === "dark" || name === "light-hc").toBe(true);
    }
  });
});
