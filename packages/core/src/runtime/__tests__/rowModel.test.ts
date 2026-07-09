import { describe, expect, it } from "vitest";
import {
  addUserRow,
  createRowsState,
  ensureRows,
  isBlankItemDefault,
  isCompleteItemDefault,
  removeRowsById,
  removeRowsByOrigin,
  stampKnownRows,
  updateRowValue,
} from "../rowModel";

interface Entry {
  key: string;
  value: string;
}

const entries: Entry[] = [
  { key: "env", value: "production" },
  { key: "region", value: "eu" },
];

describe("createRowsState", () => {
  it("wraps items in rows with unique ids and the given origin", () => {
    const state = createRowsState(entries, "api");
    expect(state.rows).toHaveLength(2);
    expect(state.rows[0]?.value).toEqual(entries[0]);
    expect(state.rows.every((r) => r.origin === "api")).toBe(true);
    expect(new Set(state.rows.map((r) => r.id)).size).toBe(2);
  });
});

describe("addUserRow", () => {
  it("appends a user-origin row", () => {
    const state = addUserRow(createRowsState(entries, "api"), {
      key: "",
      value: "",
    });
    expect(state.rows).toHaveLength(3);
    expect(state.rows[2]?.origin).toBe("user");
  });
});

describe("updateRowValue", () => {
  it("replaces the row object, preserving id, origin, and meta", () => {
    const state = createRowsState(entries, "api");
    const target = state.rows[0];
    if (target === undefined) throw new Error("fixture");

    const updated = updateRowValue(state, target.id, {
      key: "env",
      value: "staging",
    });
    const row = updated.rows[0];
    expect(row?.value).toEqual({ key: "env", value: "staging" });
    expect(row?.id).toBe(target.id);
    expect(row?.origin).toBe("api");
    expect(row).not.toBe(target);
    // untouched rows keep their identity
    expect(updated.rows[1]).toBe(state.rows[1]);
  });

  it("is a same-reference no-op for an identical value", () => {
    const state = createRowsState(entries, "api");
    const target = state.rows[0];
    if (target === undefined) throw new Error("fixture");
    expect(updateRowValue(state, target.id, target.value)).toBe(state);
  });
});

describe("ensureRows", () => {
  const ownerSpec = {
    match: { key: "owner" },
    value: { key: "owner", value: "alice" },
    meta: { pinned: true },
  };

  it("creates a seeded row when nothing matches", () => {
    const state = ensureRows(createRowsState(entries, "api"), [ownerSpec]);
    const seeded = state.rows[2];
    expect(seeded?.value).toEqual({ key: "owner", value: "alice" });
    expect(seeded?.origin).toBe("seeded");
    expect(seeded?.meta.pinned).toBe(true);
  });

  it("is idempotent — a satisfied spec is a same-reference no-op", () => {
    const once = ensureRows(createRowsState(entries, "api"), [ownerSpec]);
    expect(ensureRows(once, [ownerSpec])).toBe(once);
  });

  it("adopts a matching row: meta stamped, value and origin preserved", () => {
    const withOwner = createRowsState(
      [...entries, { key: "owner", value: "bob" }],
      "user",
    );
    const state = ensureRows(withOwner, [ownerSpec]);
    const adopted = state.rows[2];
    expect(state.rows).toHaveLength(3);
    expect(adopted?.value).toEqual({ key: "owner", value: "bob" });
    expect(adopted?.origin).toBe("user");
    expect(adopted?.meta.pinned).toBe(true);
  });

  it("keeps the lease when the bound row's value stops matching", () => {
    const withOwner = createRowsState([{ key: "owner", value: "bob" }], "user");
    let state = ensureRows(withOwner, [ownerSpec]);
    const adoptedId = state.rows[0]?.id;
    if (adoptedId === undefined) throw new Error("fixture");

    // user renames the key — the row no longer matches the spec
    state = updateRowValue(state, adoptedId, { key: "renamed", value: "bob" });
    const again = ensureRows(state, [ownerSpec]);
    expect(again).toBe(state); // no duplicate seeded row
  });

  it("matches by full value when no match is given", () => {
    const spec = { value: { key: "env", value: "production" } };
    const state = ensureRows(createRowsState(entries, "api"), [spec]);
    expect(state.rows).toHaveLength(2); // adopted, nothing created
  });
});

describe("removeRowsByOrigin — seeded release", () => {
  const ownerSpec = {
    match: { key: "owner" },
    value: { key: "owner", value: "alice" },
    meta: { pinned: true },
  };

  it("removes created-seeded rows", () => {
    const state = ensureRows(createRowsState(entries, "api"), [ownerSpec]);
    const released = removeRowsByOrigin(state, "seeded");
    expect(released.rows).toHaveLength(2);
    expect(released.rows.every((r) => r.origin === "api")).toBe(true);
  });

  it("un-stamps adopted rows but keeps them, edits intact", () => {
    const withOwner = createRowsState([{ key: "owner", value: "bob" }], "user");
    let state = ensureRows(withOwner, [ownerSpec]);
    const id = state.rows[0]?.id;
    if (id === undefined) throw new Error("fixture");
    state = updateRowValue(state, id, { key: "owner", value: "edited" });

    const released = removeRowsByOrigin(state, "seeded");
    const row = released.rows[0];
    expect(released.rows).toHaveLength(1);
    expect(row?.value).toEqual({ key: "owner", value: "edited" });
    expect(row?.meta.pinned).toBeUndefined();
  });

  it("frees the lease — a later ensure can seed again", () => {
    const state = ensureRows(createRowsState(entries, "api"), [ownerSpec]);
    const released = removeRowsByOrigin(state, "seeded");
    const reseeded = ensureRows(released, [ownerSpec]);
    expect(reseeded.rows).toHaveLength(3);
    expect(reseeded.rows[2]?.origin).toBe("seeded");
  });

  it("is a same-reference no-op when nothing is seeded", () => {
    const state = createRowsState(entries, "api");
    expect(removeRowsByOrigin(state, "seeded")).toBe(state);
  });

  it("other origins are plain filters", () => {
    const state = addUserRow(createRowsState(entries, "api"), {
      key: "",
      value: "",
    });
    const withoutUser = removeRowsByOrigin(state, "user");
    expect(withoutUser.rows).toHaveLength(2);
  });
});

describe("stampKnownRows", () => {
  it("stamps meta on the first matching row, creates nothing", () => {
    const state = stampKnownRows(createRowsState(entries, "api"), [
      { match: { key: "env" }, meta: { pinned: true } },
      { match: { key: "missing" }, meta: { pinned: true } },
    ]);
    expect(state.rows).toHaveLength(2);
    expect(state.rows[0]?.meta.pinned).toBe(true);
    expect(state.rows[1]?.meta.pinned).toBeUndefined();
  });

  it("is permanent — releasing seeded rows does not strip it", () => {
    let state = stampKnownRows(createRowsState(entries, "api"), [
      { match: { key: "env" }, meta: { pinned: true } },
    ]);
    state = removeRowsByOrigin(state, "seeded");
    expect(state.rows[0]?.meta.pinned).toBe(true);
  });

  it("is a same-reference no-op when nothing matches", () => {
    const state = createRowsState(entries, "api");
    expect(
      stampKnownRows(state, [{ match: { key: "missing" }, meta: {} }]),
    ).toBe(state);
  });
});

describe("removeRowsById", () => {
  it("removes exactly the given rows", () => {
    const state = createRowsState(entries, "api");
    const firstId = state.rows[0]?.id;
    if (firstId === undefined) throw new Error("fixture");
    const removed = removeRowsById(state, [firstId]);
    expect(removed.rows.map((r) => r.value)).toEqual([entries[1]]);
  });

  it("is a same-reference no-op for unknown ids", () => {
    const state = createRowsState(entries, "api");
    expect(removeRowsById(state, ["missing"])).toBe(state);
  });
});

describe("blank/complete defaults", () => {
  it("string items: blank when empty after trimming", () => {
    expect(isBlankItemDefault("")).toBe(true);
    expect(isBlankItemDefault("  ")).toBe(true);
    expect(isBlankItemDefault("x")).toBe(false);
  });

  it("object items: judged by their string cells", () => {
    expect(isBlankItemDefault({ key: "", value: " " })).toBe(true);
    expect(isBlankItemDefault({ key: "env", value: "" })).toBe(false);
    expect(isCompleteItemDefault({ key: "env", value: "eu" })).toBe(true);
    expect(isCompleteItemDefault({ key: "env", value: "" })).toBe(false);
  });

  it("complete requires every string cell filled; blank requires none", () => {
    expect(isCompleteItemDefault("x")).toBe(true);
    expect(isCompleteItemDefault("")).toBe(false);
  });
});
