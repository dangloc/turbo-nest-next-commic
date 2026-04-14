import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NovelManager } from "../components/novel-manager";

const listNovelsMock = vi.fn();
const createNovelMock = vi.fn();
const updateNovelMock = vi.fn();
const deleteNovelMock = vi.fn();

vi.mock("../api", () => ({
  listNovels: (...args) => listNovelsMock(...args),
  createNovel: (...args) => createNovelMock(...args),
  updateNovel: (...args) => updateNovelMock(...args),
  deleteNovel: (...args) => deleteNovelMock(...args),
}));

const NOVELS = [
  { id: 2, title: "Beta", postContent: "beta body", uploaderId: 1 },
  { id: 1, title: "Alpha", postContent: "alpha body", uploaderId: 1 },
];

describe("NovelManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listNovelsMock.mockResolvedValue({
      ok: true,
      data: {
        items: NOVELS,
        total: NOVELS.length,
        page: 1,
        pageSize: 10,
      },
    });
    createNovelMock.mockResolvedValue({
      ok: true,
      data: { id: 3, title: "Gamma", postContent: "gamma body", uploaderId: 1 },
    });
    updateNovelMock.mockResolvedValue({
      ok: true,
      data: { id: 2, title: "Beta updated", postContent: "updated", uploaderId: 1 },
    });
    deleteNovelMock.mockResolvedValue({ ok: true, data: NOVELS[0] });
  });

  afterEach(() => {
    cleanup();
  });

  it("creates a novel and keeps selected context", async () => {
    const selectMock = vi.fn();
    render(<NovelManager selectedNovelId={null} currentUserId={1} onSelectNovel={selectMock} />);

    await screen.findByText("Novel Management");

    fireEvent.change(screen.getByLabelText("Novel title"), { target: { value: "Gamma" } });
    fireEvent.change(screen.getByLabelText("Novel content"), { target: { value: "gamma body" } });
    fireEvent.click(screen.getByRole("button", { name: "Create novel" }));

    await waitFor(() => {
      expect(createNovelMock).toHaveBeenCalledWith({
        title: "Gamma",
        postContent: "gamma body",
      });
      expect(selectMock).not.toHaveBeenCalledWith(null);
    });
  });

  it("requires delete confirmation before API call", async () => {
    render(<NovelManager selectedNovelId={null} currentUserId={1} onSelectNovel={vi.fn()} />);

    await screen.findByText("Beta");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(deleteNovelMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteNovelMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const dialogTitle = screen.getByText("Delete this novel?");
    const dialog = dialogTitle.parentElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteNovelMock).toHaveBeenCalled();
    });
  });
});
