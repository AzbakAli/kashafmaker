import bcrypt from "bcryptjs";

async function main() {
  const password = "admin123";
  const hash = "$2b$12$xjjoncFbFPgCJLC.G4vEpezZK08bWNmA24cYzjhT7e7aoPOjX9Cwi";

  const isValid = await bcrypt.compare(password, hash);
  console.log("Password test:", isValid ? "VALID" : "INVALID");

  // Try with the old hash
  const oldHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5e6W7w5xw5j.i";
  const isOldValid = await bcrypt.compare(password, oldHash);
  console.log("Old hash test:", isOldValid ? "VALID" : "INVALID");
}

main().catch(console.error);
