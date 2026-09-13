import { createLongitudinalEvent, getLongitudinalEvents } from '../airtable/longitudinalEvents';

export async function addEvent(req, res) {
  try {
    const { uid, masterRecordId, payload } = req.body;

    const result = await createLongitudinalEvent(uid, masterRecordId, payload);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
}

export async function listEvents(req, res) {
  try {
    const { masterRecordId } = req.params;
    const events = await getLongitudinalEvents(masterRecordId);
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
}
