const fs = require("fs")
const path = require("path")
const os = require('os');
const axios = require("axios");

let config = null;
fs.readFile(path.join(__dirname, 'config.json'), 'utf8', (err, data) => {
    config = JSON.parse(data);
    startInterval();
})

let queryCount = 1;
let updateCount = 1;

function startInterval() {

    setDDNS();
    let interval = parseInt(config.interval);
    let timer = setInterval(() => {
        setDDNS();
    }, interval);
}

let preIpv6 = '';

function setDDNS() {
    let ipv6 = getIpv6();
    if (!ipv6) return;
    log('第', queryCount++, '次查询ipv6');
    if (ipv6 == preIpv6) {
        log('当前ipv6地址没有发生改变');
        return;
    }
    log('发现新的ipv6地址:', ipv6);
    log('第', updateCount++, '次修改ipv6');

    let ddnsConfigs = config.ddns;
    for (let ddnsConfig of ddnsConfigs) {
        let name = ddnsConfig.name;

        let api = ddnsConfig.api;
        let ipFieldName = ddnsConfig.ipFieldName;
        let params = ddnsConfig.params;
        params[ipFieldName] = ipv6;
        let paramKeys = Object.keys(params);

        let method = ddnsConfig.method;

        axios.request({
            method: method,
            url: api,
            params: params
        }).then(resp => {
            let respData = resp.data;
            if (resp.status == 200) {
                preIpv6 = ipv6;
                log('更新', name, '的ipv6地址', ipv6, '状态：success')
            } else {
                log('更新', name, '的ipv6地址', ipv6, '状态：filed')
            }
            log('response:', respData)
        }).catch(err => {
            log('更新', name, '的ipv6地址', ipv6, '状态：filed')
            log(err)
        })
    }
}

function getIpv6() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            //log(alias)
            if (alias.family === 'IPv6' && alias.address !== '::1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return null;
}


function log(...data) {
    console.log(new Date(), ...data);
}
