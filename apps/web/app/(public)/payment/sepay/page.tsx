"use client";

import { useMemo, useState } from "react";
import { initSePayCheckout } from "../../../../src/features/finance/api";

export default function SePayCheckoutPage() {
  const [invoice, setInvoice] = useState(() => `INV-${Date.now()}`);
  const [amount, setAmount] = useState(10000);
  const [description, setDescription] = useState("Payment for order");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutFields, setCheckoutFields] = useState<Record<string, string | number> | null>(null);

  const canSubmit = useMemo(() => invoice.trim().length > 0 && amount >= 1000, [invoice, amount]);

  async function prepareCheckout() {
    if (!canSubmit) {
      setError("Invoice and amount are required (minimum 1000 VND).");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await initSePayCheckout({
      orderInvoiceNumber: invoice.trim(),
      orderAmount: amount,
      orderDescription: `${description.trim()} ${invoice.trim()}`,
      paymentMethod: "BANK_TRANSFER",
      currency: "VND",
      successUrl: `${window.location.origin}/payment/success`,
      errorUrl: `${window.location.origin}/payment/error`,
      cancelUrl: `${window.location.origin}/payment/cancel`,
    });

    if (!result.ok) {
      setError(result.error.message || "Cannot initialize SePay checkout.");
      setSubmitting(false);
      return;
    }

    setCheckoutUrl(result.data.checkoutUrl);
    setCheckoutFields(result.data.checkoutFormFields);
    setSubmitting(false);
  }

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1>SePay Checkout</h1>
      <p>Generate payment form fields via API then submit to SePay.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16, marginBottom: 16 }}>
        <label>
          Invoice
          <input value={invoice} onChange={(event) => setInvoice(event.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Amount (VND)
          <input
            type="number"
            value={amount}
            min={1000}
            onChange={(event) => setAmount(Number(event.target.value || 0))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <button type="button" disabled={submitting} onClick={prepareCheckout}>
        {submitting ? "Preparing..." : "Prepare SePay form"}
      </button>

      {error ? <p style={{ color: "crimson", marginTop: 12 }}>{error}</p> : null}

      {checkoutUrl && checkoutFields ? (
        <form action={checkoutUrl} method="POST" style={{ marginTop: 20 }}>
          {Object.keys(checkoutFields).map((field) => (
            <input key={field} type="hidden" name={field} value={String(checkoutFields[field])} />
          ))}
          <button type="submit">Pay Now</button>
        </form>
      ) : null}
    </main>
  );
}
