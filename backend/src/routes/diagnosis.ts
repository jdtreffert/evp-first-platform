import express from 'express';
import { addDiagnosis, listDiagnoses } from '../api/diagnosis';

const router = express.Router();

// Create a diagnosis record
router.post('/', addDiagnosis);

// Fetch all diagnoses for a given Master record
router.get('/:masterRecordId', listDiagnoses);

export default router;
