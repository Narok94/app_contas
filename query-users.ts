import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
main();
