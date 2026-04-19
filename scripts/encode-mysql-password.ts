/**
 * If your Aiven password has @ : # / ? & % etc., it must be URL-encoded inside DATABASE_URL.
 *
 * Usage (password as arg — avoid in shared shells; prefer env):
 *   AVN_PASSWORD='your plain password' npx tsx scripts/encode-mysql-password.ts
 *
 * Or:
 *   npx tsx scripts/encode-mysql-password.ts 'your plain password'
 *
 * Paste the printed segment between "avnadmin:" and "@" in DATABASE_URL.
 */
const fromEnv = process.env.AVN_PASSWORD?.trim();
const fromArg = process.argv.slice(2).join(" ").trim();
const plain = fromEnv || fromArg;

if (!plain) {
  console.error("Set AVN_PASSWORD or pass the password as arguments.");
  process.exit(1);
}

console.log(encodeURIComponent(plain));
