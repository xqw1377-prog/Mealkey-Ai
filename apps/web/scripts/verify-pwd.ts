import bcrypt from 'bcryptjs';

const hash = '$2a$12$WKvOrDlRQjGKFlhbyy5E8OsnhnWIlIiVvJIAzWnHC.iaZmZSaop.6';
const passwords = ['star6066', 'Star6066', 'STAR6066', 'star123456', 'Mealkey2026!', 'Star6066!'];

async function main() {
  for (const pwd of passwords) {
    const valid = await bcrypt.compare(pwd, hash);
    console.log(`"${pwd}" => ${valid}`);
  }
}
main();
