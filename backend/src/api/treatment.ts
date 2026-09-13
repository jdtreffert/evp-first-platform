import { createTreatmentRecord, getTreatmentRecords } from '../airtable/treatment';

export async function addTreatment(req, res) {
  try {
    const { uid, masterRecordId, payload } = req.body;

    const result = await createTreatmentRecord(uid, masterRecordId, payload);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating treatment:", error);
    res.status(500).json({ error: "Failed to create treatment" });
  }
}

export async function listTreatments(req, res) {
  try {
    const { masterRecordId } = req.params;

    const records = await getTreatmentRecords(masterRecordId);
    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching treatments:", error);
    res.status(500).json({ error: "Failed to fetch treatments" });
  }
}
