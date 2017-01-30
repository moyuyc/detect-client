/**
 * Created by moyu on 2017/1/30.
 */

var http = require('http')
var url = require('url')
var fs = require('fs')

var logfile = __dirname + "/request.log";
// var writeStream = fs.createWriteStream(logfile, { flags: 'a+' })

var skipUrl = ["/favicon.ico"]

var server = http.createServer((req, res) => {
    if( skipUrl.includes(req.url) ) {
        res.end();
        return;
    }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'})
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var matchArr = null;
    if ( matchArr = ip.match(/(?:[\d]*\.){3}[\d]*/) ) {
        ip = matchArr[0];
    }

    console.log('Request', req.url, ip);
    if (req.url === '/secret') {
        fs.createReadStream(logfile).pipe(res);
        return;
    }


    var strArr = [`DateTime: ${new Date().toLocaleString()}`, `IP: ${ip}`]
    ip2Addr(ip).then(data => {
        if (!data.success) {
            strArr.push(`Message: ${data.msg}`);
        } else {
            strArr.push('Message: <br>' + data.values.map(x => `Address: ${x.address}; Lat: ${x.lat}; Lng: ${x.lng}`).join('<br>'));
        }
        var str = strArr.join('<br>') + '<hr>';

        // writeStream.write(str+'\r\n\r\n')
        insertFileHeader(logfile, str+'\r\n\r\n');
        res.end(str)
    }).catch(console.error);
}).listen(9988, () => console.log('Server Run on Port: %d.', server.address().port))


function insertFileHeader(file, text) {
    var oldData = fs.readFileSync(file);
    var fd = fs.openSync(file, 'w+');
    fs.writeSync(fd, text, 0);
    fs.appendFileSync(file, oldData);
    fs.closeSync(fd)
}

function ip2Addr(ip) {
    return new Promise((resolve, reject) => {
        var request = require('https').request(
            Object.assign(
                url.parse("https://www.opengps.cn/Data/IP/IPLocHiAcc.ashx"),
                { method: 'POST', headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}}
            ),
            (res) => {
                var data = ""
                res.on('data', chunk => data += chunk.toString())
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data))
                    } else {
                        reject(data)
                    }
                })
            }
        ).end(require('querystring').stringify({ip: ip}));
    })
}