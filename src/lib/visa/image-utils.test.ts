import { describe, expect, it } from "vitest";
import { decodePngRgba, encodePng, rotateRgba } from "./image-utils";

describe("png helpers", () => {
  it("round-trips RGBA through encode and decode", () => {
    const rgba = new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]);
    const png = encodePng(2, 1, rgba);
    const decoded = decodePngRgba(png);
    expect(decoded).not.toBeNull();
    expect(decoded?.width).toBe(2);
    expect(decoded?.height).toBe(1);
    expect(Array.from(decoded!.rgba)).toEqual(Array.from(rgba));
  });

  it("rotates 180 degrees without guessing pixel values", () => {
    const rgba = new Uint8Array([1, 0, 0, 255, 0, 2, 0, 255]);
    const rotated = rotateRgba(2, 1, rgba, 180);
    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(1);
    expect(Array.from(rotated.rgba.slice(0, 4))).toEqual([0, 2, 0, 255]);
    expect(Array.from(rotated.rgba.slice(4))).toEqual([1, 0, 0, 255]);
  });
});
