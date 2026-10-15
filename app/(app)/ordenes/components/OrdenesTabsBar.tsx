import { TABS } from "../lib/constants";
import type { TabKey } from "../lib/types";

export default function OrdenesTabsBar({
  tab,
  onTabChange,
  searchInput,
  onSearchInputChange,
  onSearch,
}: {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
            tab === t.key
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
      <div className="border-b border-gray-200 p-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Buscar por N° de orden..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>
    </div>
  );
}
