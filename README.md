# AedLocatorFHE

**AedLocatorFHE** is an anonymous, privacy-preserving public defibrillator (AED) locator platform. It allows the public to report AED locations and statuses securely, using **fully homomorphic encryption (FHE)** to aggregate and verify data without exposing individual reports. The system creates a reliable, encrypted emergency response network that encourages community participation while protecting privacy.

---

## Project Background

Access to automated external defibrillators (AEDs) is critical in emergency situations. However, collecting accurate location and status information poses challenges:

- **Privacy concerns**: Users may hesitate to report AED locations if personal data is exposed.  
- **Data reliability**: Reports from multiple sources must be verified and aggregated without manipulation.  
- **Public engagement**: Encouraging widespread contribution requires trust that sensitive information is protected.  

**AedLocatorFHE** addresses these problems by encrypting all AED reports and using FHE for secure aggregation, ensuring anonymity while building a trustworthy emergency map.

---

## Motivation

Community-driven AED mapping improves emergency preparedness:

- **Life-saving potential**: Quick access to AEDs can reduce mortality in cardiac emergencies.  
- **Public trust**: Protecting the anonymity of contributors increases participation.  
- **Data integrity**: Aggregated statistics provide reliable AED coverage without exposing individual reports.  
- **Scalability**: The system can grow across regions while maintaining privacy and trust.

FHE enables computations on encrypted reports, allowing the platform to verify and aggregate AED data without revealing contributor information.

---

## Features

### Core Functionality

- **Anonymous AED Reporting**: Users submit encrypted location and status data for public AEDs.  
- **FHE-Based Aggregation**: Reports are securely aggregated to generate a reliable, anonymized AED map.  
- **Public Emergency Map**: Provides real-time AED locations and statuses without revealing contributors.  
- **Data Verification**: Encrypted validation of reports ensures accuracy without compromising privacy.  
- **Encourage Participation**: Users can contribute safely without fear of identification.

### Privacy & Security

- **Client-Side Encryption**: All AED data is encrypted before leaving the user’s device.  
- **Fully Anonymous Submissions**: No personal identifiers are required to report AEDs.  
- **Encrypted Aggregation**: Statistics and maps are generated on ciphertexts, preserving confidentiality.  
- **Tamper-Resistant Records**: Once submitted, reports cannot be modified or linked to users.  
- **End-to-End Privacy**: From submission to visualization, all data remains encrypted.

---

## Architecture

### System Components

1. **Client Reporting App**  
   - Encrypts AED location and status data.  
   - Submits encrypted reports to the platform.  

2. **FHE Aggregation Engine**  
   - Performs computations on encrypted reports.  
   - Generates anonymized statistics and maps securely.  

3. **Data Verification Module**  
   - Ensures validity of encrypted submissions.  
   - Detects duplicates and inconsistent reports without decryption.  

4. **Public Map Interface**  
   - Displays AED locations and availability to users.  
   - Uses aggregated data only, protecting individual submissions.  

5. **Backend Storage**  
   - Stores encrypted reports securely.  
   - Supports auditability and tamper resistance.

---

## FHE in AedLocatorFHE

Fully Homomorphic Encryption is essential because it allows:

- **Secure aggregation**: Combine multiple reports without exposing individual contributions.  
- **Encrypted validation**: Verify the authenticity and consistency of reports without decryption.  
- **Privacy protection**: Users remain anonymous while still enabling reliable emergency mapping.  
- **Trust and transparency**: All computations on data are verifiable without revealing sensitive inputs.

FHE transforms community emergency reporting, enabling large-scale participation without compromising personal privacy.

---

## Technical Highlights

- **Encrypted Submissions**: Each report is converted into ciphertext locally before sending.  
- **Secure Aggregation**: Summarization and verification occur entirely on encrypted data.  
- **Tamper-Proof Map Generation**: Maps are generated from verified encrypted reports.  
- **Real-Time Updates**: New encrypted reports are aggregated continuously to reflect current AED availability.  
- **Scalable Design**: Supports thousands of anonymous submissions efficiently.

---

## Example Workflow

1. User locates an AED and submits its location/status via the client app.  
2. The data is encrypted on the device using FHE.  
3. Encrypted reports are sent to the aggregation engine.  
4. FHE computations validate and combine data into a public emergency map.  
5. Map updates in real time, displaying AEDs without revealing individual contributors.  
6. Users can view AED locations safely, knowing the system preserves anonymity.

---

## Benefits

| Conventional AED Reporting | AedLocatorFHE |
|----------------------------|---------------|
| Contributor identity exposed | Fully anonymous submissions |
| Risk of tampered data | Tamper-resistant encrypted aggregation |
| Limited public trust | Encourages participation via privacy-preserving mechanisms |
| Manual verification needed | Automated, encrypted validation of reports |
| Data not auditable | Verifiable computations on encrypted data |

---

## Security Features

- **Encrypted Reporting**: Protects contributor privacy.  
- **Immutable Storage**: Reports cannot be altered once submitted.  
- **Secure Aggregation**: FHE ensures data is combined without exposure.  
- **Anonymity by Design**: No personal data collected or stored.  
- **Auditability**: All aggregation computations can be verified without revealing contributors.

---

## Future Enhancements

- Implement mobile-friendly client apps with offline reporting capabilities.  
- Extend FHE aggregation to include AED accessibility features (e.g., battery status).  
- Introduce regional emergency analytics and coverage heatmaps.  
- Integrate with first responder notification systems securely.  
- Support multi-region and multi-community deployments with federated privacy.  

---

## Conclusion

**AedLocatorFHE** empowers communities to create a **trusted, anonymous AED network**. Through **homomorphic encryption**, the platform ensures that public health data is collected, verified, and shared without compromising the privacy of contributors, ultimately saving lives while respecting anonymity.
