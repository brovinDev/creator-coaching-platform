import { COMPANY } from "@/lib/company";
import { rupeesInWords } from "@/lib/number-words";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
const money = (n: number) => (Math.round(n * 100) / 100).toString();
const dateText = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });

const STYLE = `
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;background:#f3f4f6}
  .page{max-width:900px;margin:24px auto;background:#fff;padding:32px;border:1px solid #d1d5db}
  .bar{max-width:900px;margin:16px auto 0;text-align:right}
  .bar button{padding:8px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-size:14px}
  h1{text-align:center;font-size:24px;margin:0 0 20px}
  table{border-collapse:collapse;width:100%}
  td,th{border:1px solid #374151;padding:8px 10px;font-size:14px;text-align:left;vertical-align:top}
  th{background:#f5f5f5}
  .r{text-align:right}
  .head{background:#2f3441;color:#fff;text-align:center;font-size:14px;padding:10px}
  .plain td,.plain th{border:0;padding:3px 0}
  .muted{color:#4b5563;font-size:12px;margin-top:16px}
  @media print{body{background:#fff}.bar{display:none}.page{border:0;margin:0}}
`;

function shell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div><div class="page">${body}</div></body></html>`;
}

export interface PlanInvoice {
  invoiceNo: string;
  date: Date;
  billTo: { name: string; email: string };
  planName: string;
  interval: string;
  base: number;
  gst: number;
  total: number;
}

/** A tax invoice for a plan the creator bought (GST split into CGST and SGST). */
export function planInvoiceHtml(inv: PlanInvoice) {
  const half = inv.gst / 2;
  return shell(
    `Invoice ${inv.invoiceNo}`,
    `
    <div style="text-align:center">
      <div style="font-size:22px;font-weight:bold">${esc(COMPANY.name)}</div>
      <div style="font-size:13px;color:#4b5563">${esc(COMPANY.legalName)}</div>
      <div style="font-size:12px;color:#4b5563">${esc(COMPANY.address)}</div>
      <div style="font-size:12px;color:#4b5563">GST No: ${esc(COMPANY.gstin)} | PAN: ${esc(COMPANY.pan)}</div>
    </div>
    <div class="head" style="margin-top:16px">TAX INVOICE</div>
    <table>
      <tr>
        <td rowspan="2" style="width:50%"><b>Bill To:</b><br>${esc(inv.billTo.name)}<br>${esc(inv.billTo.email)}</td>
        <td><b>Invoice No</b><br>${esc(inv.invoiceNo)}</td>
        <td><b>Invoice Date</b><br>${esc(dateText(inv.date))}</td>
      </tr>
      <tr><td colspan="2"><b>Whether tax payable on reverse charge:</b> No</td></tr>
    </table>
    <table style="margin-top:-1px">
      <tr><th>Sl No.</th><th>Description</th><th>SAC Code</th><th class="r">Gross Amount (INR)</th><th>GST Rate</th><th class="r">Net Amount (INR)</th></tr>
      <tr><td>1</td><td>${esc(inv.planName)} plan (${esc(inv.interval)})</td><td>${esc(COMPANY.sac)}</td><td class="r">${money(inv.base)}</td><td>18%</td><td class="r">${money(inv.base)}</td></tr>
      <tr><td colspan="3"><b>CGST</b> (9%)</td><td></td><td></td><td class="r">${money(half)}</td></tr>
      <tr><td colspan="3"><b>SGST</b> (9%)</td><td></td><td></td><td class="r">${money(half)}</td></tr>
      <tr><td colspan="3"><b>Grand Total</b><br>${esc(rupeesInWords(inv.total))}</td><td></td><td></td><td class="r"><b>${money(inv.total)}</b></td></tr>
    </table>
    <p class="muted">For ${esc(COMPANY.legalName)} - Authorised signatory.<br>This is a computer-generated invoice and does not require a physical signature.</p>`
  );
}

export interface CommissionInvoice {
  invoiceNo: string;
  date: Date;
  billTo: { name: string; email: string };
  month: string;
  rate: number;
  planName: string;
  /** Commission charged on sales, and the part given back for refunds, before GST. */
  commission: number;
  refunded: number;
  salesCount: number;
  salesTotal: number;
}

/** The monthly tax invoice for the commission charged on sales (IGST on the net amount). */
export function commissionInvoiceHtml(inv: CommissionInvoice) {
  const net = inv.commission - inv.refunded;
  const igstOf = (v: number) => (v * 18) / 100;
  const igst = igstOf(net);
  return shell(
    `Tax invoice ${inv.invoiceNo}`,
    `
    <h1>Tax Invoice</h1>
    <table class="plain"><tr>
      <td style="width:55%"><b style="font-size:18px">${esc(COMPANY.legalName)}</b><br>${esc(COMPANY.address)}<br>
        GSTIN: <b>${esc(COMPANY.gstin)}</b><br>State: <b>${esc(COMPANY.state)}</b><br>E-mail: ${esc(COMPANY.email)}</td>
      <td><table>
        <tr><th class="r">Invoice No.</th><td>${esc(inv.invoiceNo)}</td></tr>
        <tr><th class="r">Dated</th><td>${esc(dateText(inv.date))}</td></tr>
        <tr><th class="r">Company PAN</th><td>${esc(COMPANY.pan)}</td></tr>
      </table></td></tr></table>
    <p style="margin-top:24px"><b style="font-size:18px">Bill To</b></p>
    <p><b style="font-size:16px">${esc(inv.billTo.name)}</b><br>${esc(inv.billTo.email)}</p>
    <p class="muted" style="margin-top:0">${esc(inv.month)} - ${esc(inv.planName)} plan, ${inv.rate}% commission on ${inv.salesCount} paid sale(s) totalling INR ${money(inv.salesTotal)}</p>
    <table>
      <tr><th>Sl No.</th><th>Particulars</th><th>HSN/SAC</th><th>Rate</th><th class="r">Taxable Value (INR)</th><th class="r">IGST (INR)</th></tr>
      <tr><td>1</td><td>Commission/PG Charges</td><td>${esc(COMPANY.sac)}</td><td>18 %</td><td class="r">${money(inv.commission)}</td><td class="r">${money(igstOf(inv.commission))}</td></tr>
      <tr><td>-</td><td>Less: Refunds</td><td>${esc(COMPANY.sac)}</td><td>18 %</td><td class="r">(${money(inv.refunded)})</td><td class="r">(${money(igstOf(inv.refunded))})</td></tr>
      <tr><td></td><td colspan="3" class="r"><i>Net Taxable Value</i></td><td class="r">${money(net)}</td><td class="r">${money(igst)}</td></tr>
    </table>
    <table class="plain" style="margin-top:16px">
      <tr><td class="r" style="width:55%">Total Invoice Amount (INR)</td><td class="r">${money(net + igst)}</td></tr>
      <tr><td class="r">Amount Chargeable (in words)</td><td>${esc(rupeesInWords(net + igst))}</td></tr>
      <tr><td class="r"><b>Tax Amount (in words)</b></td><td><b>${esc(rupeesInWords(igst))}</b></td></tr>
    </table>
    <p class="muted">Whether tax payable on reverse charge: No<br>This is a computer-generated invoice. For ${esc(COMPANY.legalName)}</p>`
  );
}
