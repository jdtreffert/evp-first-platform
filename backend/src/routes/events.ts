import { Router, Request, Response } from 'express';
import { getLongitudinalEvents } from '../airtable/longitudinalEvents';

const router = Router();

router.get('/patients/:masterId/events', async (req: Request, res: Response) => {
  try {
    const masterId = String(req.params.masterId);
    console.log("Looking up events for masterId:", masterId);

    if (!masterId) {
      return res.status(400).json({ error: 'masterId is required' });
    }

    const events = await getLongitudinalEvents(masterId);

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve events"
    });
  }
});

router.post("/onboarding/:patientId/events", async (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId;
    const { diagnosis, treatment, response, qol, imaging, turbt } = req.body;

    const events = await mapOnboardingToEvents({
      patientId,
      diagnosis,
      treatment,
      response,
      qol,
      imaging,
      turbt
    });

    res.status(200).json({ events });
  } catch (err) {
    console.error("Error creating onboarding events:", err);
    res.status(500).json({ error: "Failed to create onboarding events" });
  }
});




export default router;
