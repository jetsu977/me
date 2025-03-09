const prompts = require('prompts');
const chalk = require('chalk');
const fs = require('fs');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

let adapter;
let db;

const checkConfig = () => {
  const paymentId = db.get('payment.id').value();
  const paymentName = db.get('payment.name').value();

  console.log(chalk.blue(`paymentId : ${paymentId} (${paymentName})`));
  console.log(chalk.blue(`delayOrder :  ${db.get('general.delayOrder').value()}`));
  console.log(chalk.blue(`ping : ${db.get('general.ping').value()}`));
  console.log(chalk.blue(`Telegram token : ${db.get('notif.token').value()}`));
  console.log(chalk.blue(`Telegram Chat Id : ${db.get('notif.chat_id').value()}`));
};

const cekDb = async () => {
  adapter = new FileSync('db.json');
  db = low(adapter);
  return typeof db.get('product').value() === 'undefined';
};

const copyDb = async () => new Promise((resolve, reject) => fs.copyFile('db.json.example', 'db.json', (err) => {
  if (err) {
    reject(true);
  }
  console.log('Berhasil Copy database');

  adapter = new FileSync('db.json');
  db = low(adapter);

  resolve(true);
}));

const changeConfigPrompts = [
  {
    type: 'select',
    name: 'change',
    message: 'Ingin Ganti Config ?',
    choices: [
      { title: 'Tidak', value: 0 },
      { title: 'Ya', value: 1 },
    ],
  },
];
(async () => {
  const checkDb = await cekDb();
  if (checkDb) {
    await copyDb();
  }

  await checkConfig();
  const resp = await prompts(changeConfigPrompts);
  if (resp.change === 1) {
    _changeConfig();
  }
})();

const _changeConfig = () => {
  const selectConfig = [
    {
      type: 'select',
      name: 'config',
      message: 'Pilih Setting',
      choices: [
        { title: 'General', value: 3 },
        { title: 'Telegram Notification', value: 1 },
        { title: 'Payment', value: 2 },
      ],
    },
  ];

  (async () => {
    const resp = await prompts(selectConfig);
    if (resp.config === 1) {
      _telegram();
    } else if (resp.config === 2) {
      _payment();
    } else {
      _general();
    }
  })();
};

const _telegram = () => {
  const telePrompts = [
    {
      type: 'text',
      name: 'token',
      message: 'Masukan Token Bot Telegram',
    },
    {
      type: 'text',
      name: 'chat_id',
      message: 'Masukan Chat Id Bot Telegram',
    },
  ];

  (async () => {
    const resp = await prompts(telePrompts);
    db.set('notif.token', resp.token).write();
    db.set('notif.chat_id', resp.chat_id).write();
  })();
};

const _payment = () => {
  const dataPayment = [
    {
      id: 8001400,
      paymentFee: 0,
      optionInfo: '',
      name: 'Shopee Pay',
    },
    {
      id: 8005200,
      paymentFee: 100000000,
      optionInfo: '89052001',
      name: 'Va Bca',
    },
    {
      id: 8005200,
      paymentFee: 100000000,
      optionInfo: '89052002',
      name: 'Va Mandiri',
    },
    {
      id: 8005200,
      paymentFee: 0,
      optionInfo: '89052007',
      name: 'Va Seabank',
    },    

  ];

  const payPrompts = [
    {
      type: 'select',
      name: 'paymentId',
      message: 'Pilih Pembayaran',
      choices: [
        { title: 'Shopee Pay', value: 0 },
        { title: 'Va Bca', value: 1 },
        { title: 'Va Mandiri', value: 2 },
        { title: 'Va Seabank', value: 3 },
      ],
    },
  ];

  (async () => {
    const resp = await prompts(payPrompts);
    const selectPay = dataPayment[resp.paymentId];

    db.set('payment.id', selectPay.id).write();
    db.set('payment.paymentFee', selectPay.paymentFee).write();
    db.set('payment.optionInfo', selectPay.optionInfo).write();
    db.set('payment.name', selectPay.name).write();
  })();
};

const _general = () => {
  const telePrompts = [
    {
      type: 'number',
      name: 'delayOrder',
      message: 'Masukan delay Order',
      initial: db.get('general.delayOrder').value(),
    },
    {
      type: 'number',
      name: 'ping',
      message: 'Masukan Ping / Latency dari bot ke shopee',
      initial: db.get('general.ping').value(),
    },
    {
      type: 'number',
      name: 'totalPlace',
      message: 'Masukan Total Place order',
      initial: db.get('general.totalPlace').value(),
    },
    {
      type: 'text',
      name: 'cookie',
      message: 'Masukan Cookie',
      initial: db.get('general.cookie').value(),
    },
//     {
//       type: 'text',
//       name: 'csrfToken',
//       message: 'Masukan Csrftoken',
//       initial: db.get('general.csrftoken').value(),
//     },
  ];

  (async () => {
    const resp = await prompts(telePrompts);
    db.set('general.delayOrder', resp.delayOrder).write();
    db.set('general.ping', resp.ping).write();
    db.set('general.cookie', resp.cookie).write();
//    db.set('general.csrftoken', resp.csrfToken).write();
    db.set('general.totalPlace', resp.totalPlace).write();
  })();
};
