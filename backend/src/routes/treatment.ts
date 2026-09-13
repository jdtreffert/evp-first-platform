import express from 'express';
import { addTreatment, listTreatments } from '../api/treatment';

const router = express.Router();

// Create a treatment record
router.post('/', addTreatment);

// Fetch all treatments for a given Master record
router.get('/:masterRecordId', listTreatments);

export default router;
