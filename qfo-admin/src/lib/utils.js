export function formatAUDFromCents(amountCents) {
    if (amountCents == null) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency", currency: "AUD"
    }).format(amountCents / 100);
  }
  