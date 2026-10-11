# Schema tables

Generated from the code by `npm run schema:tables`; do not edit by hand. These tables hold the parts of
the schema that are not in the field catalog: which fields each event type uses, and which events a new
event can be related to. Several values in one cell are separated by semicolons.

## EventTypeFields

| Event_Type | Fields |
| --- | --- |
| Diagnosis | Diagnosis_Histology; Diagnosis_Grade; Diagnosis_Variant_Histology; Diagnosis_Initial_Presentation; T; N; M; Stage |
| TURBT | TURBT_Completeness; TURBT_Surgeon_Notes; TURBT_Specimen_Notes |
| Pathology | Pathology_Histology; Pathology_Grade; Pathology_Variant_Histology; Pathology_Depth; Pathology_Margins; Pathology_LVI; Pathology_Notes |
| Cytology | Cytology_Result; Cytology_Category; Cytology_Specimen; Cytology_Notes |
| Imaging | Imaging_Modality; Imaging_Contrast; Imaging_Region; Imaging_Result; Imaging_ComparisonToPrior; Imaging_Notes |
| Imaging_Response | Imaging_Response_Category; Imaging_Response_Critera; Imaging_Response_Target_Lesion_Change |
| Cystoscopy | Cystoscopy_Reason; Cystoscopy_Findings; Cystoscopy_Visibility; Cystoscopy_Notes |
| Cystoscopy_Biopsy | Cystoscopy_Biopsy_Taken; Cystoscopy_Biopsy_Result; Cystoscopy_Biopsy_Site; Cystoscopy_Biopsy_Notes |
| Somatic | Somatic_Vendor; Somatic_Test_Type; Somatic_Key_Findings; Somatic_PD_L1_CPS; Somatic_ERBB2_Expression; Somatic_Notes |
| Germline | Germline_Vendor; Germline_Findings; Germline_Pathogenicity; Germline_Notes |
| ctDNA | ctDNA_Vendor; ctDNA_Assay_Type; ctDNA_Value; ctDNA_Units; ctDNA_Trend |
| utDNA | utDNA_Vendor; utDNA_Assay_Type; utDNA_Value; utDNA_Units; utDNA_Trend; utDNA_Notes |
| Treatment_Start | Treatment_Name; Treatment_Intent; Treatment_Regimen_Details |
| Treatment_Delivery | Treatment_Name; Treatment_Cycle; Treatment_Route; Treatment_Dose; Treatment_Dose_Units; Treatment_Delivery_Status; Treatment_Delivery_Notes |
| Treatment_Change | Treatment_Name; Treatment_Change_Type; Treatment_Change_Reason; Treatment_Regimen_Details; Treatment_Change_New_Regimen; Treatment_Change_Toxicity_Grade |
| Treatment_Response | Treatment_Name; Treatment_Response_Category; Treatment_Response_Modality; Treatment_Response_Notes |
| Recurrence | Recurrence_Location; Recurrence_Spread_Category; Recurrence_Modality; Recurrence_Confirmation; Recurrence_Notes |
| Progression | Progression_Location; Progression_Stage_Spread; Progression_Modality; Progression_Stage_Change; Progression_Notes |
| QoL | QoL_Physical; Qol_Emotional; QoL_Urinary; QoL_Pain; QoL_Fatigue; Qol_Notes |
| Symptom | Symptom_Type; Symptom_Description; Symptom_Severity; Symptom_Duration; Symptom_Duration_Units |
| Procedure | Procedure_Type; Procedure_Result; Procedure_Notes |
| Decision | Decision_Type; Decision_Consensus; Decision_Physician_Recommendation; Decision_Patient_Preference; Decision_Notes |
| Note | Event_Summary; Event_Details |
| Lab | Lab_Flags; Lab_Values; Lab_Significance_Reasons; Lab_Notes |

## CommonFields

| Group | Fields | Offered_On |
| --- | --- | --- |
| Common | Event_Date; Event_Source | Every event type |
| Document | Document_Attachment; Document_Type; Document_Redaction_Status | Every event type (optional) |
| Measurement | Event_Measure_Type; Numeric_Value; Numeric_Units | Every event type (optional) |
| Related event | Event_Related_UID; Event_Relationship | Event types listed in RelatedEventRules (optional) |

## RelatedEventRules

| Event_Type | Candidate_Event_Types | Date_Rule | Default_Relationship |
| --- | --- | --- | --- |
| Imaging | Symptom; Pathology; Decision; Recurrence; Progression; Treatment_Response | Within 90 days either side | Related_To |
| Cystoscopy | Symptom; Imaging | Within 90 days either side | Related_To |
| TURBT | Cystoscopy | Within 30 days either side | Related_To |
| Pathology | TURBT; Cystoscopy_Biopsy | Within 30 days either side | Derived_From |
| Diagnosis | Cystoscopy; Cystoscopy_Biopsy; Pathology; Imaging | Within 90 days either side | Derived_From |
| Decision | Diagnosis | Within 90 days either side | Related_To |
| Treatment_Start | Decision; Diagnosis | Within 90 days either side | Related_To |
| Treatment_Delivery | Treatment_Start | On or before the event date | Related_To |
| ctDNA | Diagnosis; Treatment_Start; Treatment_Delivery; Treatment_Response; Recurrence; Progression | On or before the event date | Related_To |
| Procedure | Procedure; TURBT; Symptom; Imaging; Diagnosis; Treatment_Start; Treatment_Change | On or before the event date | Related_To |
