const randomstring = require("randomstring");
const prompts = require('prompts');
const axios = require("axios");
const chalk = require("chalk");
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
// const CryptoJS = require("crypto-js");
const crypto = require("crypto");



const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();
const csrfToken = randomstring.generate()
let user = ''

const defaultHeaders = {
    "accept": "application/json",
    "content-type": "application/json",
    "if-none-match-": "*",
    "referer": "https://shopee.co.id/buyer/login",
    "user-agent": db.get('general.ua').value(),
    "x-csrftoken": csrfToken,
}

let loginType = ''

const loginPrompts = [
    {
        type: 'text',
        name: 'username',
        message: 'Masukan email/no hp'
    },
    {
        type: 'text',
        name: 'password',
        message: 'Masukan password',
    }
];

const Login = async (username, pwd) => {
    await axios.post('https://shopee.co.id/buyer/login',[], {
        jar: cookieJar,
        withCredentials: true
        })
        .then(res =>{
            console.log(res.data)
        }).catch(e => {
            cookieJar.setCookie(`csrftoken=${csrfToken}`, 'https://shopee.co.id')
        });
    const hashMd5 = crypto.createHash('md5');
    const hashSha256 = crypto.createHash('sha256');

    let pass = hashMd5.update(pwd).digest('hex');
    pass = hashSha256.update(pass).digest('hex')

    const cekUsername = username.split("@")
    if (cekUsername.length > 1){
        loginType = {'email': username}
    }else{
        if (username.charAt(0) === '0'){
            username = username.replace(0, 62)
        }
        loginType = {'phone': username}
    }
    user = username

    const body = {...{
        "password": pass,
        "support_whats_app": true,
        "support_ivs": true
    }, ...loginType}

    return axios.post('https://shopee.co.id/api/v2/authentication/login', body, {
        headers: defaultHeaders,
        jar: cookieJar,
        withCredentials: true
    }).then(resp => {
        // console.log(resp)
        return resp.data
    }).catch(err => {
        console.log('response login error', err);
    })
}

(async () => {
    const response = await prompts(loginPrompts);
    console.log(chalk.blue('Sedang Login...'))
    // Login(response.username, response.password)
    const login = await Login(response.username, response.password).then(res => {
        if (res.error === 2){
            console.log(chalk.red('Username / password salah'))
            return false;
        }else if (res.error === 3){
            console.log(chalk.red('Permintaan kode verifikasi telah melebihi batas, coba lagi nanti'))
            return false;
        }
        return true;
    })
    if (!login) return;
    selectOtp()
})();


const reqOtp = async (channel) => {
    const body = {
        "channel": channel,
        "force_channel": true,
        "operation": 5,
        "support_whats_app": true
    }
    return await axios.post('https://shopee.co.id/api/v2/authentication/resend_otp', body, {
        headers: defaultHeaders,
        jar: cookieJar,
        withCredentials: true
    }).then(r => {
        return r.data
    }).catch(e => {
        console.log(e)
    })
}

const selectOtp = () => {
    const selectOtp = [
        {
            type: 'select',
            name: 'type_otp',
            message: ' Pilih metode verifikasi',
            choices: [
                { title: 'WhatsApp', value: 3 },
                { title: 'SMS', value: 1},
                { title: 'Telepon', value: 2 }
            ],
        }
    ];

    (async () => {
        const response = await prompts(selectOtp);
        const respOtp = await reqOtp(response.type_otp)
            .then(r => {
                if (r.error === 0 ){
                    console.log(chalk.blue(`Otp Berhasil dikirim, Silahkan masukan kode Otp anda`))
                    return true
                }else {
                    console.log(chalk.red(`Gagal kirim kode OTP`))
                }
                return false
            }).catch(e => {
                console.log(e)
                return false
            });
        if (!respOtp) return;
        validateOtp()
        // console.log(respOtp)
    })();
}

const verifyOtp = async (otp) => {
    const body = {...{
        "otp": otp,
        "support_ivs": true
    }, ...loginType}
    return await axios.post('https://shopee.co.id/api/v2/authentication/vcode_login', body, {
        headers: defaultHeaders,
        jar: cookieJar,
        withCredentials: true
    }).then(r => {
        return r.data
    }).catch(e => {
        console.log(e)
    })
}

const validateOtp = () => {
    const validateOtpPrompts = [
        {
            type: 'text',
            name: 'otp',
            message: 'Masukan kode OTP'
        }
    ];

    (async () => {
        const response = await prompts(validateOtpPrompts);
        const respOtp = await verifyOtp(response.otp)
            .then(r => {
                if (r.error === null ){
                    console.log(chalk.blue(`Verifikasi berhasil`))
                    saveCookie()
                }else{
                    console.log(chalk.blue(`Verifikasi gagal, kode otp tidak valid`))
                    validateOtp()
                }
            }).catch(e => {
                return false
            });
    })();
}

const saveCookie = () => {
    const jar = cookieJar.toJSON()
    const cookies = jar.cookies
    let cookiesMap = ''
    for (var i = 0; i < cookies.length; i++) {
        cookiesMap += cookies[i].key + '=' + cookies[i].value+';';
    }
    db.set('general.cookie', cookiesMap).write()
    db.set('general.csrftoken', csrfToken).write()
    db.set('general.akun', user).write()
    return cookiesMap
}