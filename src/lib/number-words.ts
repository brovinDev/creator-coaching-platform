const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
  n %= 100;
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}

/** "INR One Thousand Five Hundred Only" (Indian grouping: thousand, lakh, crore). */
export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const groups: [number, string][] = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ];
  let rest = rupees;
  const parts: string[] = [];
  for (const [size, name] of groups) {
    const n = Math.floor(rest / size);
    if (n > 0) parts.push(`${below1000(n)} ${name}`);
    rest %= size;
  }
  if (rest > 0) parts.push(below1000(rest));
  let words = parts.join(" ") || "Zero";
  if (paise > 0) words += ` and ${below1000(paise)} Paise`;
  return `INR ${words} Only`;
}
