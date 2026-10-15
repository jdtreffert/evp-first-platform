import type { FormEvent } from "react";

/** Lets a clinical or administrator account choose which patient record to view. Patients never see it. */
export default function PatientScopeForm({
  value,
  onChange,
  onSubmit,
  buttonLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  buttonLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded border border-gray-700 bg-gray-800 p-4">
      <label className="min-w-56 flex-1 text-sm">
        Patient record ID
        <input
          required
          className="mt-1 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter a patient master ID"
        />
      </label>
      <button type="submit" className="rounded bg-slate-600 px-4 py-2 font-medium hover:bg-slate-500">{buttonLabel}</button>
    </form>
  );
}
