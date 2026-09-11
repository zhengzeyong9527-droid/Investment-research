import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PetWidget } from "@/components/workbench/pet-widget";

const PET_POSITION_STORAGE_KEY = "investoday.pet.position.v1";

describe("PetWidget", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
    setViewport(1024, 768);
  });

  it("shows the normal pet by default", async () => {
    render(<PetWidget busy={false} marketWeak={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("pet-widget").style.left).not.toBe("");
    });

    expect(screen.getByRole("img", { name: "投研宠物：正常状态" }).getAttribute("src")).toBe("/pet/yellow-pet-look-at-me-320.gif");
  });

  it("keeps thinking as the highest priority state", async () => {
    render(<PetWidget busy marketWeak />);

    const widget = screen.getByTestId("pet-widget");
    expect(screen.getByRole("img", { name: "投研宠物：正在分析" }).getAttribute("src")).toBe("/pet/yellow-pet-thinking-spinner-220.gif");

    fireEvent.mouseEnter(widget);

    expect(screen.getByRole("img", { name: "投研宠物：正在分析" }).getAttribute("src")).toBe("/pet/yellow-pet-thinking-spinner-220.gif");
  });

  it("shows the market weak image when the market is weak", () => {
    render(<PetWidget busy={false} marketWeak />);

    expect(screen.getByRole("img", { name: "投研宠物：大盘偏弱" }).getAttribute("src")).toBe("/pet/yellow-pet-market-weak-220.jpg");
  });

  it("switches to the smile gif on hover when not busy", () => {
    render(<PetWidget busy={false} marketWeak={false} />);

    const widget = screen.getByTestId("pet-widget");
    fireEvent.mouseEnter(widget);

    expect(screen.getByRole("img", { name: "投研宠物：开心大笑" }).getAttribute("src")).toBe("/pet/yellow-pet-hover-smile-loop-220.gif");
  });

  it("persists a dragged position and restores it on the next render", async () => {
    setViewport(800, 600);
    render(<PetWidget busy={false} marketWeak={false} />);

    const widget = screen.getByTestId("pet-widget");
    vi.spyOn(widget, "getBoundingClientRect").mockReturnValue(domRect({ left: 24, top: 24, width: 150, height: 270 }));

    firePointer(widget, "pointerdown", { button: 0, clientX: 40, clientY: 60, pointerId: 1 });
    firePointer(widget, "pointermove", { button: 0, clientX: 220, clientY: 260, pointerId: 1 });
    firePointer(widget, "pointerup", { button: 0, clientX: 220, clientY: 260, pointerId: 1 });

    const stored = JSON.parse(window.localStorage.getItem(PET_POSITION_STORAGE_KEY) ?? "{}") as { left?: number; top?: number };
    expect(stored).toEqual({ left: 204, top: 224 });

    cleanup();
    render(<PetWidget busy={false} marketWeak={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("pet-widget").style.left).toBe("204px");
      expect(screen.getByTestId("pet-widget").style.top).toBe("224px");
    });
  });

  it("clamps a restored position inside the viewport", async () => {
    setViewport(500, 400);
    window.localStorage.setItem(PET_POSITION_STORAGE_KEY, JSON.stringify({ left: 9999, top: 9999 }));

    render(<PetWidget busy={false} marketWeak={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("pet-widget").style.left).toBe("338px");
      expect(screen.getByTestId("pet-widget").style.top).toBe("118px");
    });
  });
});

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function domRect(input: { left: number; top: number; width: number; height: number }) {
  return {
    x: input.left,
    y: input.top,
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    right: input.left + input.width,
    bottom: input.top + input.height,
    toJSON: () => ({}),
  } as DOMRect;
}

function firePointer(element: Element, type: string, init: { button: number; clientX: number; clientY: number; pointerId: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: init.button },
    clientX: { value: init.clientX },
    clientY: { value: init.clientY },
    pointerId: { value: init.pointerId },
  });
  fireEvent(element, event);
}
