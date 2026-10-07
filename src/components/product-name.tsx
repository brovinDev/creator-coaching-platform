"use client";

import { createContext, useContext } from "react";

const DEFAULT = "service";

const ProductNameContext = createContext(DEFAULT);

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Makes the creator's product name ("service" by default) available to every label below. */
export function ProductNameProvider({ name, children }: { name?: string; children: React.ReactNode }) {
  return <ProductNameContext.Provider value={name?.trim() || DEFAULT}>{children}</ProductNameContext.Provider>;
}

/** { one: "service", many: "services", One: "Service", Many: "Services" } for the creator's product name. */
export function useProductName() {
  const one = useContext(ProductNameContext);
  const many = `${one}s`;
  return { one, many, One: capitalise(one), Many: capitalise(many) };
}
