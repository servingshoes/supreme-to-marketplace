const Promise = require('bluebird');
const massive = require('massive');
const axios = require('axios');
const _ = require('lodash');
const sanitizeHtml = require('sanitize-html');
const data = require('./' + process.argv[2]);
const categories = require('./categories.json');
const colors = require('./colormappings.json');


// const dbstring = 'postgresql://restocks@localhost/restockEvents';
const dbstring = 'postgresql://pool_user@54.202.93.22:6432/restockEvents';
const adminKey =
  '';
const sanitizeOptions = { allowedTags: [], allowedAttributes: [] };

let db = null;

const http = axios.create({
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Admin-Authorization': adminKey,
  },
  baseURL: 'https://app.restocks.io',
  // baseURL: 'http://localhost:3000',
});

const uploadImage = async url => {
  const image = await http.post('/marketplace/image', { url });
  return image.data.image.id;
};

const indexProduct = id => http.put('/marketplace/admin/auth/product/' + id);
const testAdmin = () => http.get('/marketplace/admin/auth/brands');

const processVariant = async (productId, variant) => {
  const images = await Promise.map(variant.imageUrls, uploadImage);
  return db.mkt_variants.save({
    product_id: productId,
    name: variant.name,
    images,
    weight: variant.weight,
    color: variant.color,
  });
};

const processProduct = async product => {
  const mapping = await db.mkt_product_web_mappings.findOne({
    unique_reference: product.ino,
  });
  const productId = _.get(mapping, 'product_id', undefined);
  const dbProduct = {
    name: product.name,
    description: product.description,
    retail_amount_cents: product.retail_amount_cents,
    category: product.category,
    brand: product.brand,
    released_at: product.released_at,
    retail_currency: 'usd',
  };
  if (_.isString(productId)) {
    dbProduct.id = productId;
    return;
  }
  const savedProduct = await db.mkt_products.save(dbProduct);
  if (!_.isString(productId)) {
    const savedMapping = await db.mkt_product_web_mappings.save({
      url: product.url,
      unique_reference: product.ino,
      product_id: savedProduct.id,
    });
  }

  const variants = await Promise.map(product.variants, variant =>
    processVariant(savedProduct.id, variant)
  );
  await indexProduct(savedProduct.id);
  console.log(savedProduct.name);
  return true;
};

const importData = async () => {
  console.time('Connect db');
  db = await massive(dbstring);
  console.timeEnd('Connect db');
  try {
    const c = await testAdmin();
  } catch(e) {
    console.error('Invalid API Key');
    process.exit(2);
  }
  const products = data.map(product => {
    let sizes = null;
    const category = categories[product.category_name];

    // They don't put small T-Shirts on their site
    if (
      categories[product.category_name] !==
      '410ddf81-4d75-44e1-92c0-ab91751ebca1'
    ) {
      sizes = product.styles[0].sizes.map(size => size.name);
    }

    const variants = product.styles.map((style, index) => {
      const imageUrls = [`http:${style.bigger_zoomed_url}`];
      style.additional.forEach(i => {
        imageUrls.push(`http:${i.bigger_zoomed_url}`);
      });
      return {
        name: style.name,
        imageUrls,
        color: colors[style.name],
        weight: index + 1,
      };
    });

    const response = {
      name: product.name,
      description: sanitizeHtml(product.description, sanitizeOptions),
      sizes,
      category,
      brand: '1754786a-230c-4937-8c79-0a4cb6f6e4cf',
      released_at: '2017-08-24 07:00:00+00',
      ino: product.ino,
      url: `http://www.supremenewyork.com/shop/${product.id}`,
      variants,
    };
    if (product.styles[0].currency === 'USD') {
      response.retail_amount_cents = product.price;
    }
    return response;
  });
  await Promise.map(products, processProduct, { concurrency: 3 });
  console.log('All done');
  process.exit(0);
};

importData();
