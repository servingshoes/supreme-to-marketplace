const colors = require('./colors.json');

const t = {};

colors.forEach((c) => {
  t[c.name] = c.hex;
})

console.log(JSON.stringify(t, null,2))
