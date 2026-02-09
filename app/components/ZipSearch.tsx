"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ZipSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialZip = useMemo(() => searchParams.get("zip") ?? "", [searchParams]);
  const [zip, setZip] = useState(initialZip);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = zip.trim();

    // allow empty -> reset to default location
    if (!cleaned) {
      router.push("/");
      return;
    }

    // very light validation (US 5-digit)
    if (!/^\d{5}$/.test(cleaned)) return;

    router.push(`/?zip=${encodeURIComponent(cleaned)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="ZIP"
        inputMode="numeric"
        className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/20"
      />
      <button
        type="submit"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Go
      </button>
    </form>
  );
}