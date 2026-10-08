import { themeVars } from "@/lib/branding-colors";

/** Applies a creator's theme colour to everything inside. Works in server and client trees. */
export function ThemeScope({
  color,
  className,
  children,
}: {
  color?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={themeVars(color)}>
      {children}
    </div>
  );
}
