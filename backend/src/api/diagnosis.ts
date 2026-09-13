import { createDiagnosisRecord, getDiagnosisRecords } from '../airtable/diagnosis';

export async function addDiagnosis(req, res) {
  try {
    const { uid, masterRecordId, payload } = req.body;

    const result = await createDiagnosisRecord(uid, masterRecordId, payload);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating diagnosis:", error);
    res.status(500).json({ error: "Failed to create diagnosis" });
  }
}

export async function listDiagnoses(req, res) {
  try {
    const { masterRecordId } = req.params;

    const records = await getDiagnosisRecords(masterRecordId);
    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching diagnoses:", error);
    res.status(500).json({ error: "Failed to fetch diagnoses" });
  }
}
