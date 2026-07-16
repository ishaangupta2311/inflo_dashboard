# Checkout Discounts and Payment Ledger

Released 2026-07-16.

Clients can now apply merchant-managed percentage discount codes before checkout. Administrators can create and deactivate codes from the dashboard and review PayPal transactions in a capture-backed payment ledger with gross, refunded, and net totals.

This release also hardens the complete payment path: public checkout input is validated at runtime, PayPal pricing is saved as an immutable snapshot, captured payments remain visible when order creation needs reconciliation, cumulative refunds are recorded from PayPal, and concurrent refund/finalization updates cannot silently restore refunded payments to paid.

Deployment requires the new Prisma migrations for discount codes, fixed-decimal currency amounts, capture/refund ledger fields, and discount-attempt throttling.
