import { describe, expect, it } from "vitest";
import { mapClientPointToCanvasPoint, mapPointerEventToCanvasPoint } from "../canvasPointer";

describe("canvasPointer mapping", () => {
  it("maps client coordinates into canvas space", () => {
    const point = mapClientPointToCanvasPoint({
      clientX: 150,
      clientY: 70,
      rectLeft: 100,
      rectTop: 20,
      rectWidth: 200,
      rectHeight: 100,
      canvasWidth: 1000,
      canvasHeight: 500,
    });
    expect(point).toEqual({ x: 250, y: 250 });
  });

  it("clamps mapped coordinates to canvas bounds", () => {
    const point = mapClientPointToCanvasPoint({
      clientX: -500,
      clientY: 9999,
      rectLeft: 0,
      rectTop: 0,
      rectWidth: 200,
      rectHeight: 100,
      canvasWidth: 800,
      canvasHeight: 400,
    });
    expect(point).toEqual({ x: 0, y: 400 });
  });

  it("handles zero-sized rects safely", () => {
    const point = mapClientPointToCanvasPoint({
      clientX: 20,
      clientY: 40,
      rectLeft: 10,
      rectTop: 20,
      rectWidth: 0,
      rectHeight: 0,
      canvasWidth: 600,
      canvasHeight: 300,
    });
    expect(point).toEqual({ x: 600, y: 300 });
  });

  it("maps from pointer-like event target wrapper", () => {
    const point = mapPointerEventToCanvasPoint({
      clientX: 35,
      clientY: 45,
      currentTarget: {
        width: 500,
        height: 250,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 50 }),
      },
    });
    expect(point).toEqual({ x: 125, y: 125 });
  });
});
