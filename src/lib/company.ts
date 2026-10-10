/**
 * The business that issues plan and commission invoices. These are placeholders until the real
 * registration details are available: replace them (or read them from settings) before invoices are
 * used for tax.
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Open Slate",
  legalName: "Open Slate Private Limited",
  address: "Address line, City, State, India",
  gstin: "GSTIN-PLACEHOLDER",
  pan: "PAN-PLACEHOLDER",
  state: "State",
  email: "billing@example.com",
  sac: "998315",
};
