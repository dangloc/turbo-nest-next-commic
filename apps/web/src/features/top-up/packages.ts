// Locked deposit amounts (VND). Per CONTEXT.md decision: exchange rate is 1:1 with Kim Tệ.
export const TOPUP_PACKAGES: ReadonlyArray<number> = [
  50000, 100000, 200000, 350000, 500000, 800000, 1500000, 2500000,
];

export const DEFAULT_PACKAGE_AMOUNT = 100000;

const VND_FORMATTER = new Intl.NumberFormat("vi-VN");

export function formatVnd(amount: number): string {
  return VND_FORMATTER.format(amount);
}
