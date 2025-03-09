const low = require('lowdb')
const axios = require('axios');

const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

const setStatus = (resp) => {
    const status = db.get('notif.status').value()
    if (status === 'GAGAL' || status === ''){
        resetStatus()
        let newStatus = 'GAGAL';
        if (typeof resp.error !== 'undefined'){
            db.set('notif.error_code',resp.error).write()
            db.set('notif.error_msg',resp.error_msg).write()
        }else{
            newStatus = 'BERHASIL';
        }
        db.set('notif.status', newStatus).write()
    }
}

const resetStatus = () => {
    db.set('notif.status','').write()
    db.set('notif.error_code','').write()
    db.set('notif.error_msg','').write()
}
// "token": "1761722024:AAF_Ob1ndLyxubmdptR_EaRkhdF4wEEmlys"

const sendMessage = () => {
    const token = db.get('notif.token').value();
    if (typeof token !== 'undefined'){
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const status = db.get('notif.status').value()
        let msgStatus = '✅ BERHASIL ✅';
        if (status === 'GAGAL'){
            msgStatus = '❌ GAGAL ❌';
        }

        const config = {
            method: 'post',
            url: url,
            data : {
                "chat_id": db.get('notif.chat_id').value(),
                "text": `
            Status : ${msgStatus}
Error Code : ${db.get('notif.error_code').value()}
Error Msg : ${db.get('notif.error_msg').value()}
            
Akun : ${db.get('general.akun').value()}
Produk : ${db.get('product.name').value()}
Alamat : ${db.get('ongkir.addr').value()}
            `,
            }
        };

        axios(config).then(resp => {
            // console.log('response notif ', resp.data);
        }).catch(err => {
            console.log('response 1 err', err);
        })
    }

}


module.exports = {setStatus, sendMessage, resetStatus};