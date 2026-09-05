import { Request, Response } from 'express';
import { createLongitudinalEvent } from '../airtable/longitudinalEvents';

export async function ingestEvent(req: Request, res: Response) {
  try {
    const { masterId, event } = req.body;

    if (!masterId || !event) {
      return res.status(400).json({ error: 'masterId and event are required' });
    }

    const result = await createLongitudinalEvent(masterId, event);

    return res.status(200).json({
      success: true,
      airtable: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve events"
    });
  }
}
