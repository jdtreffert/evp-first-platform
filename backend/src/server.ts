import dotenv from 'dotenv';
dotenv.config();
console.log("Loaded API key:", process.env.AIRTABLE_API_KEY);

import express from 'express';
const cors = require('cors');

import {
  findOrCreateAccountAndMaster,
  updateAccountRecord,
  updateMasterRecord,
  updateOnboardingStatus
} from './routes/airtable';


import eventsRouter from './routes/events';
import onboardingRouter from './routes/onboarding';


const app = express();


// FIXED ORDER — CORS first
app.use(cors());

// JSON parsing once
app.use(express.json());

//NOW mount routes
app.use('/api', eventsRouter);
app.use("/api/onboarding", onboardingRouter);

app.get('/', (req, res) => {
  res.send('EVP First backend running');
});



app.post('/create-account', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    const result = await findOrCreateAccountAndMaster(email, firstName, lastName);

    res.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/update-account', async (req, res) => {
  try {
    const { accountId, updates } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Missing accountId"
      });
    }

    const updated = await updateAccountRecord(accountId, updates);

    res.json({
      success: true,
      accountId,
      updatedFields: updates
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/update-master', async (req, res) => {
  try {
    const { masterId, updates } = req.body;

    if (!masterId) {
      return res.status(400).json({
        success: false,
        error: "Missing masterId"
      });
    }
  console.log("FIELDS SENT TO AIRTABLE:", updates);
    const updated = await updateMasterRecord(masterId, updates);

    res.json({
      success: true,
      masterId,
      updatedFields: updates
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/update-onboarding', async (req, res) => {
  try {
    const { accountId, newStatus } = req.body;

    if (!accountId || !newStatus) {
      return res.status(400).json({
        success: false,
        error: "Missing accountId or newStatus"
      });
    }

    const updated = await updateOnboardingStatus(accountId, newStatus);

    res.json({
      success: true,
      accountId,
      newStatus
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/airtable/patient-form", async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    // 1. Create Account + Master + UID
    const result = await findOrCreateAccountAndMaster(email, firstName, lastName);

    // 2. Write form fields into Account
    await updateAccountRecord(result.accountId, {
      FirstName: firstName,
      LastName: lastName,
      Email: email
    });

    res.json({
      success: true,
      accountId: result.accountId,
      masterId: result.masterId,
      uid: result.uid
    });
} catch (error: any) {
  console.error("Form submission error:", error);
  res.status(500).json({ success: false, error: error.message });
}

  
});


app.listen(3000, () => {
  console.log('Server running on port 3000');
});
