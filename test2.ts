import fetch from 'node-fetch';
async function main() {
  const res = await fetch('http://localhost:3000/api/accounts');
  const data = await res.json();
  const acc = data.find((a: any) => a.name === 'Celular Jessica' && a.currentInstallment === 17);
  console.log('Account found:', acc);
}
main();
