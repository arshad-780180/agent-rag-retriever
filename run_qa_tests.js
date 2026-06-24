const http = require('http');

const BUGS = [
  {
    name: 'Infinite Recursion Bug',
    rawLog: `RangeError: Maximum call stack size exceeded
    at loginUser (c:\\dev\\DevOps-Autonomous-Incident-Triage-Pipeline-v2\\qa_dummy_bugs\\auth_bug.js:4:16)
    at loginUser (c:\\dev\\DevOps-Autonomous-Incident-Triage-Pipeline-v2\\qa_dummy_bugs\\auth_bug.js:4:16)
    at loginUser (c:\\dev\\DevOps-Autonomous-Incident-Triage-Pipeline-v2\\qa_dummy_bugs\\auth_bug.js:4:16)`
  },
  {
    name: 'List Index Out of Bounds',
    rawLog: `IndexError: list index out of range
  File "c:\\dev\\DevOps-Autonomous-Incident-Triage-Pipeline-v2\\qa_dummy_bugs\\data_processor.py", line 4, in process_data
    last_item = data_list[len(data_list)] # Off by one error!`
  },
  {
    name: 'TypeError undefined property',
    rawLog: `TypeError: Cannot read properties of undefined (reading 'name')
    at printUserName (c:\\dev\\DevOps-Autonomous-Incident-Triage-Pipeline-v2\\qa_dummy_bugs\\api_handler.ts:10:25)`
  }
];

function triggerIncident(bug) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      rawLog: bug.rawLog,
      source: 'qa-test-suite'
    });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/agents/trigger-incident',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Successfully triggered incident for: ${bug.name}`);
          resolve(data);
        } else {
          console.error(`❌ Failed to trigger incident for: ${bug.name}. Status: ${res.statusCode}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error for ${bug.name}: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting QA Testing Suite...\n');
  for (const bug of BUGS) {
    console.log(`Testing: ${bug.name}`);
    try {
      await triggerIncident(bug);
      // Wait a few seconds between incidents so they don't overlap completely
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.error(e);
    }
  }
  console.log('\n🏁 QA Testing Suite finished submitting bugs.');
}

runTests();
