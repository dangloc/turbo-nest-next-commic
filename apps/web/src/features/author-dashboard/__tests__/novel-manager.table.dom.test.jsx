import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function makePage(items, page, pageSize, total) {
  return {
    ok: true,
    data: {
      items,
      total,
      page,
      pageSize,
    },
  };
}

describe("NovelManager table browsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listNovelsMock.mockImplementation((query = {}) => {
      if (query.q === "beta") {
        return Promise.resolve(
          makePage(
            [
              { id: 2, title: "Beta", postContent: "beta body", uploaderId: 1 },
            ],
            1,
            10,
            1,
          ),
        );
      }

      if (query.page === 2) {
        return Promise.resolve(
          makePage(
            [
              { id: 4, title: "Delta", postContent: "delta body", uploaderId: 2 },
            ],
            2,
            query.pageSize ?? 10,
            4,
          ),
        );
      }

      if (query.scope === "mine" && query.sort === "title") {
        return Promise.resolve(
          makePage(
            [
              { id: 1, title: "Alpha", postContent: "alpha body", uploaderId: 1 },
            ],
            1,
            query.pageSize ?? 10,
            1,
          ),
        );
      }

      return Promise.resolve(
        makePage(
          [
            { id: 3, title: "Gamma", postContent: "gamma body", uploaderId: 2 },
            { id: 2, title: "Beta", postContent: "beta body", uploaderId: 1 },
            { id: 1, title: "Alpha", postContent: "alpha body", uploaderId: 1 },
          ],
          1,
          1,
          4,
        ),
      );
    });
    createNovelMock.mockResolvedValue({
      ok: true,
      data: { id: 5, title: "Epsilon", postContent: "epsilon body", uploaderId: 1 },
    });
    updateNovelMock.mockResolvedValue({
      ok: true,
      data: { id: 2, title: "Beta updated", postContent: "updated", uploaderId: 1 },
    });
    deleteNovelMock.mockResolvedValue({ ok: true, data: { id: 2, title: "Beta", postContent: "beta body", uploaderId: 1 } });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a table and wires search and filter controls into list queries", async () => {
    const selectMock = vi.fn();
    render(<NovelManager selectedNovelId={null} currentUserId={1} onSelectNovel={selectMock} />);

    await screen.findByText("Gamma");

    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(listNovelsMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10, scope: "all", sort: "newest" }),
      undefined,
      expect.any(AbortSignal),
    );

    fireEvent.change(screen.getByLabelText("Search novels"), { target: { value: "beta" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(listNovelsMock).toHaveBeenCalledWith(
        expect.objectContaining({ q: "beta", page: 1, scope: "all" }),
        undefined,
        expect.any(AbortSignal),
      );
    });

    await screen.findByText("Beta");

    fireEvent.change(screen.getByLabelText("Owner filter"), { target: { value: "mine" } });
    await waitFor(() => {
      expect(listNovelsMock).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "mine", page: 1 }),
        undefined,
        expect.any(AbortSignal),
      );
    });

    fireEvent.change(screen.getByLabelText("Sort novels"), { target: { value: "title" } });
    await waitFor(() => {
      expect(listNovelsMock).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "mine", sort: "title", page: 1 }),
        undefined,
        expect.any(AbortSignal),
      );
    });
  });

  it("paginates rows and keeps the table state stable", async () => {
    render(<NovelManager selectedNovelId={null} currentUserId={1} onSelectNovel={vi.fn()} />);

    await screen.findByText("Gamma");
    await screen.findByText("Page 1 of 4");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(listNovelsMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 1 }),
        undefined,
        expect.any(AbortSignal),
      );
    });

    await screen.findByText("Page 2 of 4");
  });
});
