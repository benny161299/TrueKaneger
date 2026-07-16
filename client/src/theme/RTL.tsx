import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import type React from "react";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

interface RTLProps {
  children: React.ReactNode;
}

export function RTL({ children }: RTLProps) {
  return <CacheProvider value={cacheRtl}>{children}</CacheProvider>;
}
