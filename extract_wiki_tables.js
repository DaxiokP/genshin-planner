import fs from 'fs';

const content = fs.readFileSync('/Users/daxiok/.gemini/antigravity-ide/brain/fe1ee9f1-0684-4527-afac-d1f6a339aa1c/.system_generated/steps/133/content.md', 'utf8');

// Let's find table sections or lines with "1" through "90"
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);

// Let's print out lines that contain typical weapon experience numbers like 9064450 or 6042650
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('9,064,450') || line.includes('6,042,650') || line.includes('3,988,200')) {
    console.log(`Line ${i}: ${line}`);
    // Print 5 lines around
    for (let j = Math.max(0, i - 10); j <= Math.min(lines.length - 1, i + 10); j++) {
      console.log(`  [${j}]: ${lines[j]}`);
    }
  }
}
