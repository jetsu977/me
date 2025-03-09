const crypto = require('crypto');

const priceToHuman = (price) => {
  const newPrice = price.toString().substring(0, price.toString().length - 5);
  return `Rp ${newPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const priceToInt = (price) => price.toString().substring(0, price.toString().length - 5);

const generateNoMatch = (itemId, shopId) => {
  const param = `itemid=${itemId}&shopid=${shopId}`;
  const hashMd5 = crypto.createHash('md5');
  const pass = hashMd5.update(param).digest('hex');
  const textHash = `55b03${pass}55b03`;
  const hashMd52 = crypto.createHash('md5');
  return `55b03-${hashMd52.update(textHash).digest('hex')}`;
};

module.exports = {
  priceToHuman,
  priceToInt,
  generateNoMatch,
};
