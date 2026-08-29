# Product Specification Document — Vivva Admin

## 1. Problem the Product Solves

Small vintage/resale sellers (operating via Instagram, pop-ups, and marketplaces) currently track inventory, pricing, and sales manually in spreadsheets or notebooks. This makes it difficult to know what's actually profitable, what's overstocked, and slows down bookkeeping and tax preparation.

## 2. Who the Users Are

Owners of small resale/retail businesses who manage physical inventory and need lightweight back-office tools without the overhead of enterprise POS systems. Each user manages their own isolated business and inventory data within the platform.

## 3. Who the Customer Is

The customer is the same as the user: small business owners who sign up and use the tool directly to manage their own business (self-serve, multi-tenant model — each business owner is an independent account, fully isolated from every other business on the platform).

## 4. Business Goals of the Product

- Give owners real visibility into what's selling versus what's sitting unsold (sell-through rate)
- Make margin and profitability visible per product category, not just estimated
- Reduce manual admin time spent on receipts and bookkeeping preparation
- Support multiple independent businesses on a single platform

## 5. Software Capabilities Needed to Enable the Business Goals

- User authentication with per-user data isolation (Supabase Auth + Row Level Security)
- Inventory management (create, read, update, delete items — cost, price, category, status: in-stock/sold), scoped to the logged-in user's business
- Statistics engine calculating sell-through rate and margin, aggregated by product category
- Receipt generation for a completed sale, viewable and printable
- Accountant-ready report export (CSV) summarizing sales, costs, and margins over a selected date range

## 6. Core Processes the Product Enables Users to Perform

1. Sign up and log in
2. Add an inventory item (cost, price, category)
3. Mark an item as sold, which atomically generates a receipt
4. View a dashboard showing sell-through rate and margin by category
5. Export an accountant-ready CSV report for a selected date range

## Note on scope vs. the original plan

Two capabilities considered during planning were deliberately not built, since they weren't necessary to meet the business goals above and adding them would have meant more surface area to secure and test without a clear payoff:

- **Receipts are viewable/printable web pages** (via the browser's native print), not generated PDF files — this satisfies "receipt generation" without adding a PDF library and its dependencies.
- **The dashboard shows numbers in tables**, not charts — a charting library was considered optional from the start and wasn't needed to make sell-through/margin data legible.
