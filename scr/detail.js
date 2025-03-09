const axios = require('axios');
const low = require('lowdb');
const chalk = require('chalk');
const FileSync = require('lowdb/adapters/FileSync');
const prompts = require('prompts');
const fns = require('date-fns');
const helpers = require('./helpers');
const accountApi = require('./api/acoount');
const produk = require('./api/produk');
const { generateNoMatch } = require('./helpers');

const adapter = new FileSync('db.json');
const db = low(adapter);
let totalPrice = 0;
let spayOnly = false;

const getProduk = async (url) => {
  //db.set('general.referer', url).write();
  const urls = parsingUrl(url);
  const ifNoMatch = generateNoMatch(urls.itemId, urls.shopId);

  const config = {
    headers: {
      referer: 'https://lite.shopee.co.id/',
      Accept: '*/*',
      'X-Api-Source': 'rweb',
      'x-Shopee-Language': 'id',
      'accept-encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
	  'accept-language':'en-US,en;q=0.9,id;q=0.8',
      'Host': 'shopee.co.id',
      'User-Agent': 'Android app Shopee appver=21909 app_type=1',
      //'Connection': 'close',
	  'authority': 'shopee.co.id',
      'if-none-match-': ifNoMatch
    },
  };
  return axios.get(`https://shopee.co.id/api/v4/item/get?itemid=${urls.itemId}&shopid=${urls.shopId}`, config)
    .then((resp) => resp.data);

};

const parsingUrl = (url) => {
  const arrSplit = url.split('/');
  let data = {};
  if (arrSplit[3] === 'product') {
    data = {
      url,
      shopId: arrSplit[4],
      itemId: arrSplit[5],
    };
  } else {
    const split = arrSplit[3].split('.');
    data = {
      url,
      itemId: split[split.length - 1],
      shopId: split[split.length - 2],
    };
  }
  return data;
};

const _selectPromotion = async () => {
  const selectPromotionPrompts = [
    {
      type: 'select',
      name: 'promotion',
      message: 'Pilih Jenis Promosi',
      choices: [
        { title: 'Flash Sale', value: 'fs' },
        { title: 'Deep Discount', value: 'deep' },
      ],
    },
  ];
  return prompts(selectPromotionPrompts);
};

const productPrompts = [
  {
    type: 'text',
    name: 'url',
    message: 'Masukan url produk',
  },
];
(async () => {
  const response = await prompts(productPrompts);
  console.log(chalk.blue('Mengambil detail produk...'));
  const { url } = response;
  const detailProduk = await getProduk(url)
    .then(async (res) => {
      let type = 'fs';
      let fs;
      let promotionId;
      let price;
      let modelId;

      if (res.item.upcoming_flash_sale === null && res.item.deep_discount === null) {
        console.log(chalk.red('Promo flash sale / Deep discount tidak ditemukan'));
        return false;
      }
      if (res.item.upcoming_flash_sale !== null && res.item.deep_discount !== null) {
        console.log(chalk.blue('Ada Promo deep discount dan Flash sale.'));
        console.log(chalk.blue('Silahkan pilih salah satu'));
        const selectPromotion = await _selectPromotion();
        type = selectPromotion.promotion;
      } else if (res.item.deep_discount !== null) {
        type = 'deep';
      }

      if (type === 'fs') {
        console.log(chalk.blue('Produk Flash sale.'));
        fs = res.item.upcoming_flash_sale;

        promotionId = fs.promotionid;
        modelId = await _selectModel(res.item.models, null, fs.modelids);
        spayOnly = produk.cekSpayOnly(fs.promo_overlay_image);
      } else {
        console.log(chalk.blue('Produk deep discount.'));
        fs = res.item.deep_discount.promotion;

        promotionId = fs.promotion_id;
        modelId = await _selectModel(res.item.models, fs.start_time, []);
      }
      const inputPrice = await _changePriceProduk(1000);
      price = parseInt(`${inputPrice}00000`, 10);
      totalPrice += price;
      const startTime = parseInt(`${fs.start_time}000`, 10);

      db.set('product.itemId', res.item.itemid).write();
      db.set('product.shopId', res.item.shopid).write();
      db.set('product.image', res.item.image).write();
      db.set('product.name', res.item.name).write();
      db.set('product.promotionId', promotionId).write();
      db.set('product.startTime', startTime).write();
      db.set('product.price', price).write();
      db.set('product.modelId', modelId).write();

      console.log(chalk.yellow('nama Produk:', res.item.name));
      console.log(chalk.yellow('itemId:', res.item.itemid));
      console.log(chalk.yellow('shopId:', res.item.shopid));
      console.log(chalk.yellow('Promotion Id:', promotionId));
      console.log(chalk.yellow('Start Time:', fns.format(new Date(startTime), 'dd-MMM-yyyy HH:mm')));
      console.log(chalk.yellow('Price:', helpers.priceToHuman(price)));
      console.log(chalk.yellow('ModelId:', modelId));
      return true;
    });
  if (!detailProduk) return;
  await _inputVocCode();
  await getOngkir();
  await _checkPayment();
})();

const _changePriceProduk = async (price) => {
  const pricePrompts = [
    {
      type: 'number',
      name: 'price',
      message: 'Masukan Harga Produk Flash sale / Deep discount',
      initial: price,
    },
  ];
  const resp = await prompts(pricePrompts);
  return resp.price;
};

const _inputVocCode = async () => {
  const inputVocCodePrompts = [
    {
      type: 'select',
      name: 'change',
      message: 'Ingin Input Voucher ?',
      choices: [
        { title: 'Tidak', value: 0 },
        { title: 'Ya', value: 1 },
      ],
    },
  ];
  const response = await prompts(inputVocCodePrompts);
  if (response.change === 1) {
    const inputVocCodePromptss = [
      {
        type: 'number',
        name: 'vocerID',
        message: 'Masukan ID Voucher',
        initial: 0,
      },
    ];
    const inputVocCode = await prompts(inputVocCodePromptss);
    return db.set('ongkir.voucher', parseInt(inputVocCode.vocerID, 10)).write();
  }
};

const _selectModel = async (models, startTime = null, modelids = []) => {
  const _optionModels = [];
  if (models.length > 1) {
    if (startTime !== null) {
      // deep discount
      for (const model of models) {
        const refreshTime = model.extinfo.seller_promotion_refresh_time;
        const start1 = startTime - 5;
        const start2 = startTime + 5;
        if (refreshTime >= start1 && refreshTime <= start2) {
          _optionModels.push({
            title: model.name,
            value: model.modelid,
          });
        }
      }
    } else {
      // flash sale
      for (const model of models) {
        // console.log(model.modelid)
        if (modelids.includes(parseInt(model.modelid, 10))) {
          _optionModels.push({
            title: model.name,
            value: model.modelid,
          });
        }
      }
    }

    if (_optionModels.length > 0) {
      const modelsPrompts = [
        {
          type: 'select',
          name: 'model',
          message: 'Pilih Variant',
          choices: _optionModels,
        },
      ];
      const resp = await prompts(modelsPrompts);
      return resp.model;
    }
    console.log(chalk.red('Variant Tidak ditemukan'));
    return models[0].modelid;
  }
  // tidak ada variant
  return models[0].modelid;
};

const getOngkir = async () => {
  const url = `https://shopee.co.id/api/v0/shop/${db.get('product.shopId').value()}/item/${db.get('product.itemId').value()}/shipping_info_to_address/?city=${db.get('ongkir.from').value()}`;
  await axios.get(url)
    .then(async (resp) => {
      const { data } = resp;
      const _optionKurir = [];
      for (let i = 0; i < data.shipping_infos.length; i++) {
        const shipp = data.shipping_infos[i];
        const price = shipp.original_cost > 0 || shipp.channel.channelid === 89999 || shipp.channel.channelid === 8004 ? helpers.priceToHuman(shipp.original_cost) : 'Layanan Tidak Tersedia';
        _optionKurir.push({
          title: `${shipp.channel.display_name} (${price})`,
          value: i,
          disabled: shipp.original_cost <= 0 && shipp.channel.channelid !== 89999 && shipp.channel.channelid !== 8004,
          channelid: shipp.channel.channelid,
          shippingPrice: shipp.original_cost,
          logisticName: shipp.channel.display_name,
        });
      }

      const kurirPrompts = [
        {
          type: 'select',
          name: 'kurir',
          message: 'Pilih Kurir',
          choices: _optionKurir,
        },
      ];
      const newkurir = await prompts(kurirPrompts);
      const kurir = _optionKurir[newkurir.kurir];
      const changeOngkir = await _changeOngkir(kurir);
      totalPrice += changeOngkir.shippingPrice;

      db.set('ongkir.logisticID', changeOngkir.channelid).write();
      db.set('ongkir.shippingPrice', changeOngkir.shippingPrice).write();
      db.set('ongkir.logisticName', changeOngkir.logisticName).write();

      console.log(chalk.yellow('logisticID :', changeOngkir.channelid));
      console.log(chalk.yellow('shippingPrice :', changeOngkir.shippingPrice));
      console.log(chalk.yellow('logisticName :', changeOngkir.logisticName));
    }).catch((err) => {
      console.log('err getOngkir', err);
    });
};

const _changeOngkir = async (data) => {
  const changeOngkirPrompts = [
    {
      type: 'select',
      name: 'change',
      message: 'Ingin Ganti Ongkos Kirim ?',
      choices: [
        { title: 'Tidak', value: 0 },
        { title: 'Ya', value: 1 },
      ],
    },
  ];
  const response = await prompts(changeOngkirPrompts);
  if (response.change === 1) {
    const inputOngkirPrompts = [
      {
        type: 'number',
        name: 'price',
        message: 'Masukan Harga Ongkos Kirim Yang Baru',
        initial: helpers.priceToInt(data.shippingPrice),
      },
    ];
    const newOngkir = await prompts(inputOngkirPrompts);
    data.shippingPrice = parseInt(`${newOngkir.price}00000`, 10);
  }

  return data;
};

const _checkPayment = () => {
  const paymentId = db.get('payment.id').value();
  if (paymentId === 8001400) {
    accountApi.getSpay().then((r) => {
      const { balance } = r.data.wallet;
      console.log(chalk.blue(`Saldo Shopee Pay : ${helpers.priceToHuman(balance)}`));
      if (balance < totalPrice) {
        console.log(chalk.red(`Shopee Pay Anda kurang ${helpers.priceToHuman(balance - totalPrice)}`));
      } else {
        console.log(chalk.green('Shopee Pay Cukup'));
      }
    });
  } else {
    console.log(chalk.green(`Pembayaran mengunakan ${db.get('payment.name').value()}`));
    if (totalPrice < 1000000000 && paymentId === 8005200) {
      console.log(chalk.red('Total pembelian kurang dari 10k, Tidak bisa mengunakan BCA'));
    } else if (spayOnly) {
      console.log(chalk.red('Produk ini hanya bisa dibeli dengan Shopee Pay'));
    }
  }
};
