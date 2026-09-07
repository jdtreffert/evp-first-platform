import { Request, Response } from 'express';
import { createLongitudinalEvent } from '../airtable/longitudinalEvents';

type Attachment = { url: string };

interface EventPayload {
  EventType: string;
  EventDate: string;
  EventSummary: string;
  EventDetails: string | null;
  SourceDocumentURL: string | null;
  EventAttachments: Attachment[];
  MasterId: string[];
  CreatedAt: string;
  }


export async function ingestEvent(req: Request, res: Response) {
  try {
    const { masterId, event } = req.body;

    if (!masterId || !event) {
      return res.status(400).json({ error: 'masterId and event are required' });
    }

    const attachments: Attachment[] = Array.isArray(event.EventAttachments)
      ? event.EventAttachments.map((u: string) => ({ url: u }))
      : [];


    const eventPayload: EventPayload = {
      EventType: event.EventType,
      EventDate: event.EventDate,
      EventSummary: event.EventSummary,
      EventDetails: event.EventDetails ?? null,
      SourceDocumentURL: event.SourceDocumentURL ?? null,
      EventAttachments: attachments,
      MasterId: [masterId],
      CreatedAt: new Date().toISOString()
    };

    const result = await createLongitudinalEvent(masterId, eventPayload);

    return res.status(200).json({
      success: true,
      airtable: result
    });

  } catch (err) {
    console.error('Event ingestion error:', err);
    return res.status(500).json({ error: 'Failed to ingest event' });
  }
}
