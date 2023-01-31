const fs = require("fs")
const path = require("path")
const os = require('os');
const axios = require("axios");

//读取的配置文件config.json
let config = null;

//上次更新的ipv6地址
let preIpv6 = '';

//读取配置文件config.json
fs.readFile(path.join(__dirname, 'config.json'), 'utf8', (err, data) => {
    config = JSON.parse(data);

    //读取上次更新的ipv6地址
    fs.readFile(path.join(__dirname, 'ipv.6'), 'utf8', (err, data) => {
        data = data.trim();
        preIpv6 = data;

        //开始
        startInterval();
    })
})


//查询ip地址的次数
let queryCount = 1;

//更新域名解析的次数
let updateCount = 1;

//开始循环
function startInterval() {

    setDDNS();

    let interval = parseInt(config.interval);
    let timer = setInterval(() => {
        setDDNS();
    }, interval);

}


function setDDNS() {
    //获取ipv6地址
    let ipv6 = getIpv6();
    if (!ipv6) return;

    log('第', queryCount++, '次查询ipv6');
    if (ipv6 == preIpv6) {
        log('当前ipv6地址没有发生改变');
        return;
    }
    log('发现新的ipv6地址:', ipv6);
    log('第', updateCount++, '次修改ipv6');

    //循环遍历配置文件里的所有域名解析配置
    let ddnsConfigs = config.ddns;
    for (let ddnsConfig of ddnsConfigs) {
        let name = ddnsConfig.name;

        let api = ddnsConfig.api;
        let ipFieldName = ddnsConfig.ipFieldName;
        let params = ddnsConfig.params;
        params[ipFieldName] = ipv6;
        let paramKeys = Object.keys(params);

        let method = ddnsConfig.method;

        //调用接口更新域名解析
        axios.request({
            method: method,
            url: api,
            params: params
        }).then(resp => {
            let respData = resp.data;
            if (resp.status == 200) {
                preIpv6 = ipv6;
                fs.writeFile(path.join(__dirname, 'ipv.6'), ipv6, (err)=>{});
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

//获取本机ipv6地址
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

//打印日志
function log(...data) {
    console.log(new Date(), ...data);
}
