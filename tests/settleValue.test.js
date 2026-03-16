const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = appJs.match(/function settleValue\(channel\) \{[\s\S]*?\n\}/);

if (!match) {
  throw new Error('Could not find settleValue() in app.js');
}

const context = {
  settings: {
    clientValue: 948,
    introPct: 33,
    opsPct: 33,
    ebitdaPct: 34,
  },
  state: {
    gross: 0,
    introValue: 0,
    opsValue: 0,
    ebitdaValue: 0,
  },
};

vm.createContext(context);
vm.runInContext(`${match[0]}; this.settleValue = settleValue;`, context);

context.settleValue('intro');

assert.strictEqual(context.state.gross, 948, 'gross should increase by the full client value');
assert.strictEqual(
  Number(context.state.introValue.toFixed(2)),
  312.84,
  'intro should receive its configured share'
);
assert.strictEqual(
  Number(context.state.opsValue.toFixed(2)),
  312.84,
  'ops should receive its configured share'
);
assert.strictEqual(
  Number(context.state.ebitdaValue.toFixed(2)),
  322.32,
  'ebitda should receive its configured share'
);
assert.strictEqual(
  Number((context.state.introValue + context.state.opsValue + context.state.ebitdaValue).toFixed(2)),
  context.state.gross,
  'split buckets should sum to gross revenue'
);

console.log('settleValue regression test passed');
