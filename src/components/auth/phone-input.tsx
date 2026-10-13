"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface Country {
  iso: string;
  name: string;
  dial: string;
}

export const COUNTRIES: Country[] = [
  { iso: "in", name: "India", dial: "+91" },
  { iso: "us", name: "United States", dial: "+1" },
  { iso: "gb", name: "United Kingdom", dial: "+44" },
  { iso: "ae", name: "United Arab Emirates", dial: "+971" },
  { iso: "sg", name: "Singapore", dial: "+65" },
  { iso: "au", name: "Australia", dial: "+61" },
  { iso: "ca", name: "Canada", dial: "+1" },
  { iso: "sa", name: "Saudi Arabia", dial: "+966" },
  { iso: "qa", name: "Qatar", dial: "+974" },
  { iso: "kw", name: "Kuwait", dial: "+965" },
  { iso: "om", name: "Oman", dial: "+968" },
  { iso: "bh", name: "Bahrain", dial: "+973" },
  { iso: "my", name: "Malaysia", dial: "+60" },
  { iso: "id", name: "Indonesia", dial: "+62" },
  { iso: "ph", name: "Philippines", dial: "+63" },
  { iso: "th", name: "Thailand", dial: "+66" },
  { iso: "jp", name: "Japan", dial: "+81" },
  { iso: "kr", name: "South Korea", dial: "+82" },
  { iso: "cn", name: "China", dial: "+86" },
  { iso: "np", name: "Nepal", dial: "+977" },
  { iso: "bd", name: "Bangladesh", dial: "+880" },
  { iso: "lk", name: "Sri Lanka", dial: "+94" },
  { iso: "pk", name: "Pakistan", dial: "+92" },
  { iso: "de", name: "Germany", dial: "+49" },
  { iso: "fr", name: "France", dial: "+33" },
  { iso: "es", name: "Spain", dial: "+34" },
  { iso: "it", name: "Italy", dial: "+39" },
  { iso: "nl", name: "Netherlands", dial: "+31" },
  { iso: "ie", name: "Ireland", dial: "+353" },
  { iso: "nz", name: "New Zealand", dial: "+64" },
  { iso: "za", name: "South Africa", dial: "+27" },
  { iso: "ng", name: "Nigeria", dial: "+234" },
  { iso: "ke", name: "Kenya", dial: "+254" },
  { iso: "br", name: "Brazil", dial: "+55" },
  { iso: "mx", name: "Mexico", dial: "+52" },
];

/** A small flag picture; if it cannot load, nothing is shown and the dial code still says which country. */
function Flag({ iso }: { iso: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/24x18/${iso}.png`}
      width={24}
      height={18}
      alt=""
      onError={() => setBroken(true)}
      className="rounded-[2px]"
    />
  );
}

/** Country code picker joined to a phone number box, like the sign-up screen. */
export function PhoneInput({
  country,
  onCountry,
  value,
  onChange,
}: {
  country: Country;
  onCountry: (c: Country) => void;
  value: string;
  onChange: (digits: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-[62px] rounded-md border border-gray-300 bg-white focus-within:border-gray-500">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Country code"
        className="flex w-[125px] shrink-0 cursor-pointer items-center gap-2 rounded-l-md border-r border-gray-300 px-4 text-lg text-black"
      >
        <Flag iso={country.iso} />
        <span>{country.dial}</span>
        <ChevronDown className="ml-auto h-4 w-4 text-gray-800" />
      </button>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))}
        placeholder="Enter phone number"
        autoComplete="tel-national"
        className="min-w-0 flex-1 rounded-r-md px-4 text-xl text-black placeholder:text-gray-600 focus:outline-none"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full z-20 mt-1 max-h-64 w-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {COUNTRIES.map((c) => (
              <li key={`${c.iso}-${c.dial}`}>
                <button
                  type="button"
                  onClick={() => {
                    onCountry(c);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-base hover:bg-gray-50 ${c.iso === country.iso ? "bg-gray-100" : ""}`}
                >
                  <Flag iso={c.iso} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-gray-500">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
