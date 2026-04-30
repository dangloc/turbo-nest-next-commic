export function buildPurchasePricingModel(pricing, formatCurrency) {
  const chapterRows = pricing.chapters.map((chapter) => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    accessLabel: chapter.isLocked ? "Locked" : "Free",
    effectivePriceLabel: formatCurrency(chapter.effectivePrice),
    sourceLabel:
      chapter.priceSource === "chapter_override"
        ? "Per-chapter override"
        : "Novel default",
    isLocked: chapter.isLocked,
    effectivePrice: chapter.effectivePrice,
  }));

  return {
    novelId: pricing.novelId,
    defaultChapterPriceLabel: formatCurrency(pricing.settings.defaultChapterPrice),
    freeChapterCountLabel: `${pricing.settings.freeChapterCount} free chapter${
      pricing.settings.freeChapterCount === 1 ? "" : "s"
    }`,
    comboDiscountLabel: `${pricing.settings.comboDiscountPct}%`,
    originalTotalLabel: formatCurrency(pricing.combo.originalTotalPrice),
    discountedTotalLabel: formatCurrency(pricing.combo.discountedTotalPrice),
    lockedChapterCount: pricing.combo.lockedChapterCount,
    chapterRows,
    hasZeroPayable: pricing.combo.discountedTotalPrice <= 0,
  };
}

export function buildComboPurchaseOutcome(result, formatCurrency) {
  if (result.status === "insufficient_balance") {
    return {
      message:
        "Insufficient deposited balance for this combo total. Top up wallet and try again.",
      refreshWallet: false,
      refreshPricing: false,
    };
  }

  if (result.status === "no_locked_chapters") {
    return {
      message: "This novel has no locked chapters. No charge was applied.",
      refreshWallet: false,
      refreshPricing: false,
    };
  }

  if (result.status === "already_owned") {
    return {
      message: "All locked chapters are already unlocked for your account.",
      refreshWallet: false,
      refreshPricing: false,
    };
  }

  if (result.chargedAmount <= 0) {
    return {
      message:
        "Combo completed with zero payable amount. Chapters unlocked without a charge.",
      refreshWallet: true,
      refreshPricing: true,
    };
  }

  return {
    message: `Combo purchase successful. Charged ${formatCurrency(
      result.chargedAmount,
    )} and unlocked ${result.purchasedChapterCount} chapter(s).`,
    refreshWallet: true,
    refreshPricing: true,
  };
}
