import fetch from 'node-fetch';
async function main() {
  const res = await fetch('http://localhost:3000/api/accounts');
  const data = await res.json();
  console.log('Fetched accounts:', data.length);
}
main();
