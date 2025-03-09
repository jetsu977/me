const axios = require('axios');
const chalk = require('chalk');
const prompts = require('prompts');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const helpers = require('./helpers');
const { getSpay, checkBan } = require('./api/acoount');
const configApi = require('./api/config');

const adapter = new FileSync('db.json');
const db = low(adapter);

const getProfile = () => axios.get('https://shopee.co.id/api/v2/user/account_info', {
  headers: configApi._defaultHeaders,
}).then((r) => {
  console.log(chalk.blue(`Username: ${r.data.data.username} `));
  console.log(chalk.blue(`No Hp: ${r.data.data.phone}`));
  console.log(chalk.blue(`Alamat Pengiriman: ${db.get('ongkir.addr').value()}`));

  db.set('general.akun', r.data.data.phone).write();
  // console.log(r.data)
}).catch((e) => {
  console.log(e.data);
});

const getAddress = () => axios.get('https://shopee.co.id/api/v1/addresses/', {
  headers: configApi._defaultHeaders,
}).then((r) => {
  selectAddr(r.data);
}).catch((e) => {
  console.log(e.data);
});

const selectAddr = async (data) => {
  const _optionAddrs = [];
  for (let i = 0; i < data.addresses.length; i++) {
    const addr = data.addresses[i];
    _optionAddrs.push({
      title: `${addr.name} - ${addr.address}`,
      value: i,
      id: addr.id,
      name: addr.name,
      address: addr.address,
      city: addr.city,
      district: addr.district,
      state: addr.state,
    });
  }
  const addrPrompts = [
    {
      type: 'select',
      name: 'addr',
      message: 'Pilih Alamat',
      choices: _optionAddrs,
    },
  ];
  const response = await prompts(addrPrompts);
  const selectedAddr = _optionAddrs[response.addr];
  const addrFrom = `${selectedAddr.city.replace(/ /g, '%20')}&district=${selectedAddr.district.replace(/ /g, '%20')}&state=${selectedAddr.state.replace(/ /g, '%20')}`;
  db.set('general.addressId', selectedAddr.id).write();
  db.set('ongkir.from', addrFrom).write();
  db.set('ongkir.addr', `${selectedAddr.name} - ${selectedAddr.address}`).write();
  console.log(chalk.blue('Berhasil set alamat'));
};

(async () => {
  await getProfile();
  await getSpay().then((r) => {
    console.log(chalk.blue(`Saldo Shopee Pay: ${helpers.priceToHuman(r.data.wallet.balance)} `));
  });
  const isBan = await checkBan();
  if (isBan) {
    console.log(chalk.red('Status: Banned ASUUUU BAJINGAN'));
  }
  const changeAddrPrompts = [
    {
      type: 'select',
      name: 'change',
      message: 'Ingin Ganti alamat pengiriman ?',
      choices: [
        { title: 'Tidak', value: 0 },
        { title: 'Ya', value: 1 },
      ],
    },
  ];
  const response = await prompts(changeAddrPrompts);
  if (response.change === 1) {
    await getAddress();
  }
})();
