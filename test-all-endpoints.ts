import fetch from 'node-fetch';
async function main() {
  const endpoints = ['users', 'groups', 'accounts', 'incomes', 'categories', 'settings'];
  for (const ep of endpoints) {
    const res = await fetch('http://localhost:3000/api/' + ep);
    if (!res.ok) {
        console.log('Error fetching ' + ep + ': ' + res.status + ' ' + res.statusText);
    } else {
        const data = await res.json();
        console.log('Fetched ' + ep + ': ' + data.length + ' items');
    }
  }
}
main();
