/**
 * Generates a bcrypt hash for the reviewer password and prints it so it can
 * be pasted into REVIEWER_PASSWORD_HASH in .env. There is no reviewer table --
 * the single reviewer credential pair lives entirely in environment config.
 *
 * Usage: node src/db/seedReviewer.js <password>
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node src/db/seedReviewer.js <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log("\nAdd this to backend/.env:\n");
console.log(`REVIEWER_PASSWORD_HASH=${hash}\n`);
