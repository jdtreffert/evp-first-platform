import express from "express";

// Correct Airtable imports
import { base, accountTableName } from "../airtable/client";
import { createMasterRecord } from "../airtable/master";
import { createAccountRecord } from "../airtable/account";
import { updateOnboardingStatus } from "./airtable"; // your existing status machine
import { findOrCreateAccountAndMaster } from "./airtable";

const router = express.Router();

router.post("/complete", async (req, res) => {
  try {
    const { diagnosis, user } = req.body;

    if (!user?.email) {
      return res.status(400).json({ error: "Missing user email" });
    }

    // 1. Ensure account + master exist
    const { uid, accountId, masterId } =
      await findOrCreateAccountAndMaster(user.email, user.firstName, user.lastName);

    // 2. Write diagnosis to Airtable
    await base("Diagnosis").create({
      UID: uid,
      Master: [masterId],
      ClinicalStage: diagnosis.clinicalStage || "",
      TStage: diagnosis.tStage || "",
      NStage: diagnosis.nStage || "",
      MStage: diagnosis.mStage || "",
      Histology: diagnosis.histology || "",
      VariantHistology: (diagnosis.variantHistology || []).join(", "),
      Symptoms: diagnosis.symptoms || "",
      InitialImaging: (diagnosis.initialImaging || []).join(", "),
      InitialCystoscopyNotes: diagnosis.initialCystoscopyNotes || "",
      DiagnosisDate: diagnosis.diagnosisDate || ""
    });

    // 3. Update onboarding status
    await updateOnboardingStatus(accountId, "completed");

    res.json({
      success: true,
      uid,
      accountId,
      masterId
    });
  } catch (err) {
    console.error("Error completing onboarding", err);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

export default router;
