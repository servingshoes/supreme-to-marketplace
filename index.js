const Promise = require('bluebird');
const axios = require('axios');
const fs = require('fs');

const http = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1',
    'X-Requested-With': 'XMLHttpRequest',
    Host: 'www.supremenewyork.com',
  },
  responseType: 'json',
  baseURL: 'http://www.supremenewyork.com',
});

let filename = 'products.json';

const fetchProduct = async product => {
  const request = await http({ url: `/shop/${product.id}.json` });
  return Object.assign(product, request.data);
};

const fetchIndex = async () => {
  const index = await http({ url: '/mobile_stock.json' });
  const region =
    typeof index.data.products_and_categories['Accessories'][0].price_euro ===
    'number'
      ? 'eu'
      : 'us';
  filename = index.data.release_week + '_' + region + '.json';
  console.log(
    `Taking a snapshot of the ${index.data
      .release_week} ${region.toUpperCase()} Supreme drop.`
  );
  const categories = Object.keys(index.data.products_and_categories);
  let products = [];

  categories.forEach(category => {
    products = products.concat(index.data.products_and_categories[category]);
  });

  const productDetails = await Promise.map(products, fetchProduct, {
    concurrency: 3,
  });
  console.log(`Downloaded ${productDetails.length} products.`);
  fs.writeFileSync(
    './data/' + filename,
    JSON.stringify(productDetails, null, 2)
  );
};

fetchIndex();
