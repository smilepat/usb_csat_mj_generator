const http = require('http');

// Test items: LC01-LC17, RC18-RC45
const items = [];
for (let i = 1; i <= 17; i++) items.push(i);
for (let i = 18; i <= 45; i++) items.push(i);

function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 180000
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Parse error: ' + body.substring(0, 100)));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testItem(itemNo) {
  try {
    // Step 1: Create item request
    const createResult = await httpRequest('POST', '/api/items/requests', {
      item_no: itemNo,
      use_default_prompt: true
    });

    if (!createResult.success) {
      return { itemNo, success: false, error: createResult.error?.message || JSON.stringify(createResult.error) };
    }

    const requestId = createResult.data.requestId || createResult.data.id;

    // Step 2: Generate item
    const genResult = await httpRequest('POST', '/api/items/generate/' + requestId, {});

    if (!genResult.success) {
      return { itemNo, success: false, error: genResult.error?.message || JSON.stringify(genResult.error) };
    }

    // Check validation result
    const validationResult = genResult.data?.validationResult || genResult.data?.status;
    const isValidationPass = validationResult === 'PASS' || validationResult === 'OK';

    const fj = genResult.data?.finalJson || {};
    const keys = Object.keys(fj);
    return {
      itemNo,
      success: isValidationPass,
      hasQuestion: !!fj.question,
      hasPassage: !!(fj.lc_script || fj.passage || fj.gapped_passage || fj.transcript || fj.stimulus),
      hasOptions: !!(fj.options && fj.options.length > 0),
      hasAnswer: !!(fj.correct_answer || fj.answer),
      keys: keys.join(','),
      validationResult: validationResult,
      validationLog: genResult.data?.validationLog || ''
    };
  } catch (e) {
    return { itemNo, success: false, error: e.message };
  }
}

async function runTests() {
  console.log('=== 문항 생성 테스트 시작 ===\n');
  console.log('No\t| 결과\t| Q\t| P\t| O\t| A\t| 필드');
  console.log('-'.repeat(80));

  const results = [];
  for (const itemNo of items) {
    const prefix = itemNo <= 17 ? 'LC' : 'RC';
    const displayNo = prefix + String(itemNo).padStart(2, '0');

    process.stdout.write(displayNo + '\t| ');

    const result = await testItem(itemNo);
    results.push(result);

    if (result.success) {
      const q = result.hasQuestion ? '✓' : '✗';
      const p = result.hasPassage ? '✓' : '✗';
      const o = result.hasOptions ? '✓' : '✗';
      const a = result.hasAnswer ? '✓' : '✗';
      console.log('성공\t| ' + q + '\t| ' + p + '\t| ' + o + '\t| ' + a + '\t| ' + result.keys.substring(0, 40));
    } else {
      const errMsg = result.error || result.validationLog || result.validationResult || 'Unknown';
      console.log('실패\t| ' + String(errMsg).substring(0, 50));
    }
  }

  console.log('\n=== 요약 ===');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log('성공: ' + successCount + ' / ' + items.length);
  console.log('실패: ' + failCount);

  if (failCount > 0) {
    console.log('\n실패한 문항:');
    results.filter(r => !r.success).forEach(r => {
      const prefix = r.itemNo <= 17 ? 'LC' : 'RC';
      console.log('- ' + prefix + String(r.itemNo).padStart(2, '0') + ': ' + r.error);
    });
  }
}

runTests();
