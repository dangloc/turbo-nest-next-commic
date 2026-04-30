import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChapterManager } from "../components/chapter-manager";

const listChaptersByNovelMock = vi.fn();
const createChapterMock = vi.fn();
const updateChapterMock = vi.fn();
const deleteChapterMock = vi.fn();

vi.mock("../api", () => ({
  listChaptersByNovel: (...args) => listChaptersByNovelMock(...args),
  createChapter: (...args) => createChapterMock(...args),
  updateChapter: (...args) => updateChapterMock(...args),
  deleteChapter: (...args) => deleteChapterMock(...args),
}));

const selectedNovel = { id: 9, title: "Author Novel", postContent: "...", uploaderId: 1 };

describe("ChapterManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listChaptersByNovelMock.mockResolvedValue({
      ok: true,
      data: [
        { id: 30, novelId: 9, title: "Three", postContent: "C3", chapterNumber: 3, priceOverride: null },
        { id: 10, novelId: 9, title: "One", postContent: "C1", chapterNumber: 1, priceOverride: null },
      ],
    });
    createChapterMock.mockResolvedValue({
      ok: true,
      data: { id: 31, novelId: 9, title: "Two", postContent: "C2", chapterNumber: 2, priceOverride: null },
    });
    updateChapterMock.mockResolvedValue({ ok: true, data: {} });
    deleteChapterMock.mockResolvedValue({ ok: true, data: {} });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders chapter list in chapterNumber ascending order", async () => {
    render(<ChapterManager selectedNovel={selectedNovel} />);

    await screen.findByText("Chapter Management");

    const cards = await screen.findAllByRole("heading", { level: 3 });
    expect(cards[0]?.textContent).toContain("Chapter 1");
    expect(cards[1]?.textContent).toContain("Chapter 3");
  });

  it("creates chapter with chapterNumber field", async () => {
    render(<ChapterManager selectedNovel={selectedNovel} />);

    await screen.findByText("Chapter Management");

    fireEvent.change(screen.getByLabelText("Chapter title"), { target: { value: "New chapter" } });
    fireEvent.change(screen.getByLabelText("Chapter content"), { target: { value: "Body" } });
    fireEvent.change(screen.getByLabelText("Chapter number"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Create chapter" }));

    await waitFor(() => {
      expect(createChapterMock).toHaveBeenCalledWith(9, {
        title: "New chapter",
        postContent: "Body",
        chapterNumber: 2,
        priceOverride: undefined,
      });
    });
  });
});
