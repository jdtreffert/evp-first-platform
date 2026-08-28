import { useState } from "react";
import { InputField } from "./components/InputField";
import axios from "axios";

function App() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    notes: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-bg dark:bg-darkBg min-h-screen font-sans p-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        <h1 className="text-textHeading dark:text-darkTextHeading text-3xl font-heading font-bold">
          Patient Entry
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="First Name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />

          <InputField
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />

          <InputField
            label="Date of Birth"
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />

          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
  <label className="text-textHeading dark:text-darkTextHeading font-medium">
    Notes
  </label>

  <textarea
    value={form.notes}
    onChange={(e) => setForm({ ...form, notes: e.target.value })}
    className="
      bg-bg dark:bg-darkBg
      border border-border dark:border-darkBorder
      text-text dark:text-darkText
      rounded px-3 py-2 w-full h-32
      focus:outline-none focus:ring-2 focus:ring-accent
    "
  />

  <button
    onClick={async () => {
      setSuccessMessage("");
      setErrorMessage("");

      try {
        const response = await axios.post(
          "http://localhost:3000/api/airtable/patient-form",
          form
        );
        setSuccessMessage("Patient record saved successfully.");
        console.log("Airtable response:", response.data);
      } catch (err) {
        setErrorMessage("There was a problem saving the record.");
        console.error("Submit error:", err);
      }
    }}
    className="
      mt-6
      px-4 py-2 
      bg-accentBg text-textHeading 
      dark:bg-darkAccentBg dark:text-darkTextHeading
      rounded shadow-brand dark:shadow-darkBrand
    "
  >
    Submit
  </button>

  {successMessage && (
    <div className="mt-4 px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
      {successMessage}
    </div>
  )}

  {errorMessage && (
    <div className="mt-4 px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
      {errorMessage}
    </div>
  )}
</div>


      </div>
    </div>
  );
}

export default App;
