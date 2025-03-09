const ping = require('ping');

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

const host = 'shopee.co.id';
const req = () => {
    ping.promise.probe(host)
        .then(function (res) {
            db.set('general.ping', parseInt(res.time)).write()
        });
}
module.exports = {req};