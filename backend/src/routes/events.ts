import express from 'express';
import { addEvent, listEvents } from '../api/events';

const router = express.Router();

router.post('/', addEvent);
router.get('/:masterRecordId', listEvents);

export default router;

