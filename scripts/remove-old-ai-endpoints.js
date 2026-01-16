// Remove old AI endpoint files after merging to api/ai.js
// This script deletes the old /api/ai/ directory and its files.
import fs from 'fs';
import path from 'path';

const aiDir = path.join(process.cwd(), 'api', 'ai');

if (fs.existsSync(aiDir)) {
  fs.rmSync(aiDir, { recursive: true, force: true });
  console.log('Old /api/ai/ directory and its files have been deleted.');
} else {
  console.log('No /api/ai/ directory found.');
}
