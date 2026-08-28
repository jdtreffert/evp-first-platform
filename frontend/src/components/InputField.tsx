export function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-textHeading dark:text-darkTextHeading font-medium">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="
          bg-bg dark:bg-darkBg
          border border-border dark:border-darkBorder
          text-text dark:text-darkText
          rounded px-3 py-2
          focus:outline-none focus:ring-2 focus:ring-accent
        "
      />
    </div>
  );
}
