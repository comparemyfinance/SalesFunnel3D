const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = appJs.match(/function restingLimit\(channel\) \{[\s\S]*?\n\}/);

if (!match) {
  throw new Error('Could not find restingLimit() in app.js');
}

const context = {
  settings: {
    enquiriesPerDay: 0,
  },
  state: {
    entered: 0,
  },
  restingCapacity: {
    ntu: 56,
    intro: 42,
    ops: 52,
    ebitda: 64,
  },
};

vm.createContext(context);
vm.runInContext(`${match[0]}; this.restingLimit = restingLimit;`, context);

assert.strictEqual(
  context.restingLimit('ntu'),
  0,
  'restingLimit should be 0 when enquiriesPerDay is 0'
);

context.settings.enquiriesPerDay = -100;
context.state.entered = 1000;
assert.strictEqual(
  context.restingLimit('ops'),
  0,
  'restingLimit should not become NaN or negative for non-positive enquiriesPerDay'
);

console.log('restingLimit regression test passed');
