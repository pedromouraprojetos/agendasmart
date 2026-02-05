export default function Button({
  children,
  type = "button",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-gray-200"
    >
      {children}
    </button>
  );
}
