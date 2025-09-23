#!/usr/bin/env tsx
/**
 * Test script for document ingestion API
 * Run with: npx tsx scripts/test-document-ingestion.ts
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Helper to get auth token (you'll need to login first)
async function getAuthToken(): Promise<string | null> {
  // In a real scenario, you'd either:
  // 1. Perform a login request to get a token
  // 2. Read from a saved session file
  // For testing, you might want to hardcode after logging in via UI
  
  console.log('⚠️  Please ensure you are logged in via the UI first');
  console.log('   The auth cookie will be used from your browser session');
  
  // For automated testing, you could login programmatically:
  /*
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@kmrl.com',
      password: 'your-password'
    })
  });
  
  const cookies = loginRes.headers.get('set-cookie');
  // Extract token from cookies...
  */
  
  return null; // Will use browser session for now
}

// Test cases for different document types
const testCases = [
  {
    name: 'HTML Document with Images',
    payload: {
      documents: [
        {
          type: 'html' as const,
          content: `
            <h1>KMRL Safety Circular - Fire Drill Procedures</h1>
            <p><strong>Date:</strong> December 22, 2024</p>
            <p><strong>To:</strong> All Station Controllers and Operations Staff</p>
            
            <h2>1. Purpose</h2>
            <p>This circular outlines the mandatory fire drill procedures to be conducted quarterly at all KMRL stations and depots.</p>
            
            <h2>2. Drill Schedule</h2>
            <ul>
              <li>Q1 2025: January 15, 10:00 AM</li>
              <li>Q2 2025: April 15, 10:00 AM</li>
              <li>Q3 2025: July 15, 10:00 AM</li>
              <li>Q4 2025: October 15, 10:00 AM</li>
            </ul>
            
            <h2>3. Evacuation Procedures</h2>
            <p>Upon hearing the fire alarm:</p>
            <ol>
              <li>Station controllers must immediately announce evacuation over PA system</li>
              <li>Guide passengers to nearest emergency exits</li>
              <li>Ensure all areas including restrooms are checked</li>
              <li>Report to designated assembly point</li>
            </ol>
            
            <h2>4. Post-Drill Requirements</h2>
            <p>Submit drill completion report within 24 hours to Safety Department.</p>
            
            <p><strong>Compliance Deadline:</strong> All stations must complete first drill by January 31, 2025</p>
            
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="Emergency Exit Map" />
          `,
          filename: 'safety-circular-fire-drill.html'
        }
      ],
      department: 'Safety',
      documentType: 'safety_circular',
      tags: ['fire-drill', 'safety', 'compliance', 'Q1-2025']
    }
  },
  {
    name: 'Multi-page Technical Document',
    payload: {
      documents: [
        {
          type: 'text' as const,
          content: `
KMRL TECHNICAL SPECIFICATION DOCUMENT
Document ID: TS-2024-12-001
Date: December 22, 2024

PAGE 1
======
SECTION 1: ROLLING STOCK MAINTENANCE REQUIREMENTS

1.1 Overview
This document specifies the maintenance requirements for KMRL's Alstom Metropolis train fleet. 
All maintenance activities must comply with EN 13306 and EN 50126 standards.

1.2 Daily Inspection Checklist
- Brake system functionality test
- Door operation verification  
- HVAC system check
- Passenger information display test
- Emergency communication system check

PAGE 2
======
1.3 Weekly Maintenance Tasks
The following tasks must be performed every 7 days or 5000 km, whichever comes first:
- Bogie inspection for cracks or damage
- Wheel profile measurement
- Pantograph carbon strip thickness check
- Battery voltage verification
- Compressor oil level check

1.4 Critical Safety Parameters
WARNING: Any measurement outside these ranges requires immediate train withdrawal:
- Wheel diameter: 840mm (new) - 770mm (condemning limit)
- Brake pad thickness: Minimum 10mm
- Pantograph contact force: 70N ± 10N

PAGE 3
======
SECTION 2: DEPOT EQUIPMENT REQUIREMENTS

2.1 New Equipment Installation
As part of depot expansion, the following equipment must be procured by Q2 2025:
- Underfloor wheel lathe (1 unit)
- Bogie drop facility (2 bays)
- Ultrasonic testing equipment for axles
- Automatic train wash plant

2.2 Vendor Specifications
All equipment must meet:
- ISO 9001:2015 certification
- CE marking compliance
- Local electrical standards (IS 732)

2.3 Budget Allocation
Total approved budget: INR 45 Crores
Procurement timeline: 6 months from approval

PAGE 4
======
SECTION 3: COMPLIANCE AND REPORTING

3.1 Regulatory Requirements
All maintenance activities must be reported to:
- Commissioner of Metro Rail Safety (CMRS) - Monthly
- Ministry of Housing and Urban Affairs - Quarterly
- KMRL Board - Monthly

3.2 Key Performance Indicators
- Fleet availability: Target >95%
- Mean time between failures: >50,000 km
- On-time performance: >99.5%

3.3 Audit Schedule
- Internal audit: Monthly
- CMRS inspection: Bi-annually
- ISO audit: Annually

END OF DOCUMENT
          `,
          filename: 'technical-specification-rolling-stock.txt'
        }
      ],
      department: 'Engineering',
      documentType: 'technical_specification',
      tags: ['maintenance', 'rolling-stock', 'compliance', 'depot-equipment']
    }
  },
  {
    name: 'Procurement Document',
    payload: {
      documents: [
        {
          type: 'text' as const,
          content: `
PURCHASE ORDER
PO Number: KMRL/PROC/2024/1578
Date: December 20, 2024

Vendor: ABC Railway Systems Pvt Ltd
Address: Industrial Area, Kochi - 682024

ITEMS ORDERED:
1. Brake Pads (Part #BP-4521) - Quantity: 500 units @ INR 2,500 per unit
2. Air Filters (Part #AF-8934) - Quantity: 200 units @ INR 1,200 per unit  
3. LED Display Modules - Quantity: 50 units @ INR 15,000 per unit

Total Order Value: INR 22,40,000 (Including 18% GST)

DELIVERY TERMS:
- Delivery Location: KMRL Depot, Muttom
- Delivery Date: By January 31, 2025
- Late delivery penalty: 1% per week

PAYMENT TERMS:
- 30% advance upon order confirmation
- 70% upon delivery and inspection

SPECIAL CONDITIONS:
- All items must have minimum 2-year warranty
- Vendor must provide training for maintenance staff
- Spare parts availability guarantee for 10 years

IMPORTANT: Engineering department must verify compatibility with existing systems before installation.

Approved by:
Chief Procurement Officer
KMRL
          `,
          filename: 'purchase-order-spare-parts.txt'
        }
      ],
      department: 'Procurement',
      documentType: 'purchase_order',
      tags: ['spare-parts', 'vendor', 'Q1-2025-delivery']
    }
  },
  {
    name: 'Multiple Related Documents',
    payload: {
      documents: [
        {
          type: 'text' as const,
          content: 'HR CIRCULAR: New safety training mandatory for all depot staff. Complete by Jan 15, 2025.',
          filename: 'hr-circular-001.txt'
        },
        {
          type: 'text' as const,
          content: 'SAFETY ALERT: Recent incident requires immediate retraining on emergency procedures.',
          filename: 'safety-alert-001.txt'
        },
        {
          type: 'html' as const,
          content: '<h1>Training Schedule</h1><p>Batch 1: Jan 5<br>Batch 2: Jan 10<br>Batch 3: Jan 15</p>',
          filename: 'training-schedule.html'
        }
      ],
      department: 'HR',
      documentType: 'training_directive',
      tags: ['training', 'safety', 'urgent']
    }
  }
];

// Main test function
async function testDocumentIngestion() {
  console.log('🚀 Starting Document Ingestion Tests\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch(`${API_URL}/api/documents/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real scenario, add auth header
          // 'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(testCase.payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Failed: ${error.error || 'Unknown error'}`);
        if (error.details) console.error(`   Details: ${error.details}`);
        results.push({ test: testCase.name, status: 'FAILED', error: error.error });
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ Success!`);
      
      if (result.documentId) {
        console.log(`   Document ID: ${result.documentId}`);
        console.log(`   Nodes created: ${result.nodeCount}`);
        console.log(`   Type: ${result.documentType || 'Not specified'}`);
        console.log(`   Summary: ${result.summary?.substring(0, 100)}...`);
      } else if (result.documentsProcessed) {
        console.log(`   Documents processed: ${result.documentsProcessed}`);
        console.log(`   Document IDs: ${result.documentIds.join(', ')}`);
        result.summaries?.forEach((doc: any, i: number) => {
          console.log(`   [${i + 1}] ${doc.title}: ${doc.nodeCount} nodes`);
        });
      }
      
      results.push({ test: testCase.name, status: 'SUCCESS', result });
      
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({ test: testCase.name, status: 'ERROR', error: String(error) });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status !== 'SUCCESS').length;
  
  results.forEach(r => {
    const icon = r.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.status}`);
  });
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${results.length} | Success: ${successful} | Failed: ${failed}`);
  
  // Test retrieval
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING DOCUMENT RETRIEVAL');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/api/documents/ingest?limit=5`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`\n✅ Retrieved ${data.total} documents:`);
      data.documents?.forEach((doc: any) => {
        console.log(`   - ${doc.title} (${doc.nodeCount} nodes)`);
        console.log(`     Type: ${doc.documentType || 'Unknown'} | Dept: ${doc.department || 'None'}`);
      });
    } else {
      console.error('❌ Failed to retrieve documents');
    }
  } catch (error) {
    console.error(`❌ Retrieval error: ${error}`);
  }
}

// Run the tests
if (require.main === module) {
  testDocumentIngestion()
    .then(() => {
      console.log('\n✨ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testDocumentIngestion };