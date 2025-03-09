const axios = require('axios');
const low = require('lowdb');
const delay = require('delay');
const cron = require('cron');
const http = require('http');
const https = require('https');

const FileSync = require('lowdb/adapters/FileSync');
const bodyOrder = require('./bodyOrder');
const notification = require('./src/notification');
const coGet = require('./src/coget/coGet');
const { timeCalibaration } = require('./src/api/acoount');
const { placeMobile, placeWeb, placeLite } = require('./src/api/order');

const adapter = new FileSync('db.json');
const db = low(adapter);
const body = bodyOrder.body();
const params = process.argv.slice(2);

const startTime = db.get('product.startTime').value();
const ping = parseInt(db.get('general.ping').value(), 10);
const totalPlace = parseInt(db.get('general.totalPlace').value(), 10);

notification.resetStatus();
const config = {
  method: 'post',
  url: 'https://shopee.co.id/api/v2/checkout/place_order',
  headers: {
  Cookie: db.get('general.cookie').value(),
  Accept: 'application/json',
  'x-csrftoken': db.get('general.csrftoken').value(),
  'x-api-source': 'rn',
  'x-requested-with': 'XMLHttpRequest',
  'x-shopee-language': 'id',
  Host: 'mall.shopee.co.id',
  referer: 'https://mall.shopee.co.id/bridge_cmd?cmd=reactPath%3Ftab%3Dbuy%26path%3Dshopee%2FOPC_HOME%26cartType%3D1%26clientId%3D5%26promotionData%3D%255Bobject%2520Object%255D%26shopOrders%3D%255Bobject%2520Object%255D',
  'if-none-match-': db.get('general.if-none-match').value(),
  time: Date.now(),
  'x-cv-id': '106',
  'User-Agent': 'Android app Shopee appver=21909 app_type=1',
  'Content-Type': 'application/json',
  },
  data: body,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
};

const logData = [];

const placeOrder = async (type) => {
  let totalPlaceOrder = 2;
  if (type === 'place' || type === 'co1k') {
    totalPlaceOrder = totalPlace;
  }
  for (let i = 0; i < totalPlaceOrder; i++) {
    await delay(parseInt(db.get('general.delayOrder').value(), 10));

    const status = db.get('notif.status').value();
    if (status === 'GAGAL' || status === '') {
      logData.push([`Start ${type} order ${i}`, Date.now()]);
      axios(config).then((resp) => {
        console.log(`response ${type} ${i}`, resp.data);
        logData.push([`End ${type} order ${i}`, Date.now()]);
        notification.setStatus(resp.data);
      }).catch((err) => {
        console.log(`response ${i} err`, err);
      });
    }
  }

  const status = db.get('notif.status').value();
  if (type === 'co1k' && (status === 'GAGAL' || status === '')) {
    await delay(parseInt(db.get('general.delayOrder').value(), 10));
    await coGet.order();
  }
};

const sendNotif = () => {
  let timeNotif = startTime;
  if (Date.now() >= parseInt(startTime, 10)) {
    timeNotif = Date.now();
  }
  const notifTime = new Date(timeNotif + 5000);
  cron.job(
    notifTime,
    () => {
      notification.sendMessage();
      console.table(logData);
    },
    null,
    true,
  );
};

const loopTime = async () => {
  const callibarate = await timeCalibaration();
  const totalDelay = parseInt(startTime - ping - callibarate.data.t1, 10);
  //const totalTest = parseInt(startTime - 3000 - callibarate.data.t1, 10);
  //await delay(parseInt(totalTest, 10));
  //placeWeb();
  //placeWeb();

  await delay(parseInt(totalDelay, 10));

  logData.push(['run placeOrder local', Date.now()]);
  logData.push(['run placeOrder calibrate', callibarate.data.t1]);

  placeMobile();
  await delay(parseInt(db.get('general.delayOrder').value(), 10));
  placeMobile();
  await delay(parseInt(db.get('general.delayOrder').value(), 10));
  placeMobile();
  await delay(parseInt(db.get('general.delayOrder').value(), 10));
  placeMobile();
};

if (typeof params[0] !== 'undefined') {
  if (params[0] === 'coget') {
    if (Date.now() >= parseInt(startTime, 10)) {
      (async () => {
        await coGet.order();
        await sendNotif();
      })();
    } else {
      const dateRunOrder = new Date(startTime - ping);
      cron.job(
        dateRunOrder,
        async () => {
          await coGet.order();
        },
        null,
        true,
      );
      sendNotif();
    }
  } else if (params[0] === 'co1k') {
    if (Date.now() >= parseInt(startTime, 10)) {
      (async () => {
        await placeOrder('co1k');
        await sendNotif();
      })();
    } else {
      const dateRunOrder = new Date(startTime - ping);
      cron.job(
        dateRunOrder,
        async () => {
          await placeOrder('co1k');
        },
        null,
        true,
      );
      sendNotif();
    }
  } else {
    placeOrder('test');
  }
} else if (Date.now() >= parseInt(startTime, 10)) {
  placeOrder('place');
} else {
  loopTime();
  sendNotif();
}
