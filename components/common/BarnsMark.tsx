export function BrandMark() {
  return (
    <div className="flex items-center gap-2 mb-10">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="1" y="1" width="22" height="22" rx="6" stroke="#2563eb" strokeWidth="2" />
        <path
          d="M7 7L17 17M17 7L7 17"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold text-gray-900">
        Servicio Técnico - FerProMaq
      </span>
    </div>
  );
}