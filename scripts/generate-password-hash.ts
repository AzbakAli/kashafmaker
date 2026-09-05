import bcrypt from "bcryptjs";

async function main() {
  const password = "admin123";
  const hash = await bcrypt.hash(password, 12);
  console.log("Password hash for 'admin123':");
  console.log(hash);
}

main().catch(console.error);
