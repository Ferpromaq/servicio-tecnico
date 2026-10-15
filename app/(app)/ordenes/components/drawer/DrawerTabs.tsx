"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DRAWER_TABS } from "../../lib/constants";
import type { DrawerTab } from "../../lib/types";

export default function DrawerTabs({ activeTab }: { activeTab: DrawerTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {DRAWER_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());

            params.set("tab", t.key);

            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
          }}
          className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === t.key
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
