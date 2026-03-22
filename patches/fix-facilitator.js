// Postinstall patch: fix ethers v6 readContract in WDK x402 facilitator adapter
// ethers v6 requires .staticCall() for non-view functions when using a provider-only Contract
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(__dirname, '../node_modules/@semanticio/wdk-wallet-evm-x402-facilitator/src/wallet-account-evm-x402-facilitator.js');

try {
  let content = readFileSync(filePath, 'utf8');
  const old = 'return contract[functionName](...args)';
  const fixed = 'return contract[functionName].staticCall(...args)';
  if (content.includes(old)) {
    content = content.replace(old, fixed);
    writeFileSync(filePath, content);
    console.log('Patched WDK x402 facilitator: readContract now uses staticCall');
  } else if (content.includes(fixed)) {
    console.log('WDK x402 facilitator already patched');
  } else {
    console.warn('Could not find readContract pattern to patch');
  }
} catch (e) {
  console.warn('Patch skipped:', e.message);
}
