import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComboPurchaseOutcome,
  buildPurchasePricingModel,
} from "../purchase-ui.js";

const formatCurrency = (value) => `VND ${value}`;

test("buildPurchasePricingModel shows threshold, default price, and overrides", () => {
  const model = buildPurchasePricingModel(
    {
      novelId: 42,
      settings: {
        defaultChapterPrice: 15000,
        freeChapterCount: 2,
        comboDiscountPct: 25,
      },
      combo: {
        lockedChapterCount: 2,
        originalTotalPrice: 35000,
        discountedTotalPrice: 26250,
      },
      chapters: [
        {
          id: 1,
          chapterNumber: 1,
          title: "Prologue",
          isLocked: false,
          effectivePrice: 0,
          priceSource: "novel_default",
        },
        {
          id: 2,
          chapterNumber: 2,
          title: "Chapter 2",
          isLocked: false,
          effectivePrice: 0,
          priceSource: "novel_default",
        },
        {
          id: 3,
          chapterNumber: 3,
          title: "Chapter 3",
          isLocked: true,
          effectivePrice: 25000,
          priceSource: "chapter_override",
        },
        {
          id: 4,
          chapterNumber: 4,
          title: "Chapter 4",
          isLocked: true,
          effectivePrice: 10000,
          priceSource: "novel_default",
        },
      ],
    },
    formatCurrency,
  );

  assert.equal(model.defaultChapterPriceLabel, "VND 15000");
  assert.equal(model.freeChapterCountLabel, "2 free chapters");
  assert.equal(model.comboDiscountLabel, "25%");
  assert.equal(model.originalTotalLabel, "VND 35000");
  assert.equal(model.discountedTotalLabel, "VND 26250");
  assert.equal(model.lockedChapterCount, 2);
  assert.equal(model.hasZeroPayable, false);
  assert.deepEqual(model.chapterRows.map((row) => row.accessLabel), [
    "Free",
    "Free",
    "Locked",
    "Locked",
  ]);
  assert.deepEqual(model.chapterRows.map((row) => row.sourceLabel), [
    "Novel default",
    "Novel default",
    "Per-chapter override",
    "Novel default",
  ]);
  assert.deepEqual(model.chapterRows.map((row) => row.effectivePriceLabel), [
    "VND 0",
    "VND 0",
    "VND 25000",
    "VND 10000",
  ]);
});

test("buildPurchasePricingModel surfaces zero-payable combo totals", () => {
  const model = buildPurchasePricingModel(
    {
      novelId: 7,
      settings: {
        defaultChapterPrice: 12000,
        freeChapterCount: 1,
        comboDiscountPct: 100,
      },
      combo: {
        lockedChapterCount: 1,
        originalTotalPrice: 12000,
        discountedTotalPrice: 0,
      },
      chapters: [
        {
          id: 11,
          chapterNumber: 1,
          title: "Free chapter",
          isLocked: false,
          effectivePrice: 0,
          priceSource: "novel_default",
        },
        {
          id: 12,
          chapterNumber: 2,
          title: "Locked chapter",
          isLocked: true,
          effectivePrice: 12000,
          priceSource: "novel_default",
        },
      ],
    },
    formatCurrency,
  );

  assert.equal(model.hasZeroPayable, true);
  assert.equal(model.discountedTotalLabel, "VND 0");
  assert.equal(model.freeChapterCountLabel, "1 free chapter");
});

test("buildComboPurchaseOutcome drives refreshes after successful unlocks", () => {
  const paid = buildComboPurchaseOutcome(
    {
      status: "purchased",
      novelId: 42,
      purchasedChapterCount: 3,
      chargedAmount: 26250,
      discountPct: 25,
      transactionId: 999,
      depositedBalance: 120000,
    },
    formatCurrency,
  );

  assert.equal(paid.message, "Combo purchase successful. Charged VND 26250 and unlocked 3 chapter(s).");
  assert.equal(paid.refreshWallet, true);
  assert.equal(paid.refreshPricing, true);
});

test("buildComboPurchaseOutcome handles zero-payable and insufficient-balance edge states", () => {
  const zeroPayable = buildComboPurchaseOutcome(
    {
      status: "purchased",
      novelId: 42,
      purchasedChapterCount: 4,
      chargedAmount: 0,
      discountPct: 100,
      transactionId: 1001,
      depositedBalance: 50000,
    },
    formatCurrency,
  );

  assert.equal(
    zeroPayable.message,
    "Combo completed with zero payable amount. Chapters unlocked without a charge.",
  );
  assert.equal(zeroPayable.refreshWallet, true);
  assert.equal(zeroPayable.refreshPricing, true);

  const insufficient = buildComboPurchaseOutcome(
    {
      status: "insufficient_balance",
      novelId: 42,
      purchasedChapterCount: 0,
      chargedAmount: 0,
    },
    formatCurrency,
  );

  assert.equal(
    insufficient.message,
    "Insufficient deposited balance for this combo total. Top up wallet and try again.",
  );
  assert.equal(insufficient.refreshWallet, false);
  assert.equal(insufficient.refreshPricing, false);
});
