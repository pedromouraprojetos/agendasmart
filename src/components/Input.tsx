export default function Input({
  label,
  type = "text",
  placeholder,
  name,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
      />
    </label>
  );
}
