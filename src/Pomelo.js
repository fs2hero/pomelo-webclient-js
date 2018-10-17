const EventEmitter = require('events');
// const Message = require('./Message');
// const Protocol = require('./Protocal');
// const Package = require('./Package');

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

const JS_WS_CLIENT_TYPE = 'js-websocket';
const JS_WS_CLIENT_VERSION = '0.0.1';

const RES_OK = 200;
const RES_FAIL = 500;
const RES_OLD_CLIENT = 501;

function defaultDecode(data) {
    if(!data){
        return {};
    }
    
    const msg =  JSON.parse(data);
    return msg;
}

function defaultEncode(reqId, route, msg) {
    if(msg){
        msg = JSON.stringify(msg);
    }
    return msg;
}

function defaultUrlGenerator(host, port,isHttps) {
    let protocol = 'http://';
    if(isHttps){
        protocol = 'https://'
    }

    let url = protocol + host;
    if (port) {
        url += ':' + port + '/';
    }
    return url;
}

module.exports = class Pomelo extends EventEmitter {
    constructor(args) {
        super(args);
        const { xmlHttpRequestCreator, xmlHttpRequestCreatorWeb, urlGenerator = defaultUrlGenerator } = args;
        this.xmlHttpRequestCreator = xmlHttpRequestCreator;
        this.xmlHttpRequestCreatorWeb = xmlHttpRequestCreatorWeb;
        this.urlGenerator = urlGenerator;

        this.callbacks = {};
        this.reqId = 0;
        this.token = '';
    }

    init(params, cb) {
        this.initCallback = cb;

        this.params = params;
        const { host, port, user, handshakeCallback, encode = defaultEncode, decode = defaultDecode, debugMode, browserWS, headers } = params;

        this.encode = encode;
        this.decode = decode;

        this.headers = headers || {};
        this.isHttps = params.isHttps || false;

        if (debugMode) {
            this.url = defaultUrlGenerator(host, port,this.isHttps);
        }
        else {
            this.url = this.urlGenerator(host, port,this.isHttps);
        }

        if (browserWS) {
            this.wsCreator = this.wsCreatorWeb;
            this.browserWS = browserWS;
        }

        this.initCallback && this.initCallback({ code: 200, msg: 'init ok' });
    }

    setToken(token) {
        this.token = token;
    }

    makeXHR(reqId, route, method, msg) {

        const onMessage = data => {
            console.log('onMessage ',data);
            this.onData(data);
        };

        const onError = event => {
            // this.emit('xhr-io-error', event);
            console.error('socket error: ', event);
            this.processMessage({ id: reqId, route: route, body: { err: 'error', detail: event } });
        };

        const onTimeOut = event => {
            // this.emit('xhr-timeout', event);
            this.processMessage({ id: reqId, route: route, body: { err: 'timeout', detail: event } });
        };

        // socket = wx.connectSocket({ url: reconnectUrl });
        this.socket = this.xmlHttpRequestCreator({
            url: this.url,
            onError,
            onMessage,
            onTimeOut
        });

        var query = '';

        if (method.toLowerCase() == 'get') {
            for (var key in msg) {
                if(query == ''){
                    query = '?' + key + '=' + msg[key];
                }
                else{
                    query = query + '&' + key + '=' + msg[key];
                }
            }
        }

        var requestUrl = this.url + route;
        if(query != ''){
            requestUrl = requestUrl + query;
        }
        console.log('requestUrl ',requestUrl);

        this.socket.open(method, requestUrl,true);

        // this.socket.setRequestHeader("Request-Id",this.reqId);

        if (reqId > 0) {
            this.socket.setRequestHeader('X-Request-Id',reqId);
        }

        if(this.token != '') {
            this.socket.setRequestHeader('X-Access-Token',this.token);
        }
        this.socket.setRequestHeader("Content-Type", "application/json");
        if (this.headers) {
            for (var key in this.headers) {
                this.socket.setRequestHeader(key, this.headers[key]);
            }
        }

        this.socket.timeout = 25000;
    }

    disconnect() {

    }

    request(route, method, msg, cb) {

        if (arguments.length === 3 && typeof msg === 'function') {
            cb = msg;
            msg = {};
        } else {
            msg = msg || {};
        }
        route = route || msg.route;
        if (!route) {
            return;
        }

        this.reqId++;
        this.makeXHR(this.reqId, route, method, msg);

        if (method.toLowerCase() == 'get') {
            msg = null;
        }
        this.sendMessage(this.reqId, route, msg);

        this.callbacks[this.reqId] = cb;
    }
    notify(route, method, msg) {
        msg = msg || {};
        this.makeXHR(0, route, method, msg);

        if (method.toLowerCase() == 'get') {
            msg = null;
        }
        this.sendMessage(0, route, msg);
    }
    sendMessage(reqId, route, msg) {

        if (!msg) {
            this.socket.send();
        }
        else {
            msg = this.encode(reqId, route, msg);

            this.socket.send(msg);
        }
    }

    onData(msg) {
        msg = this.decode(msg);
        this.processMessage(msg);
    }

    processMessage(msg) {
        console.log('processMessage');
        if (!msg.id) {
            this.emit(msg.route, msg.body);
            return;
        }

        //if have a id then find the callback function with the request
        console.log('callbacks  ',this.callbacks);
        
        const cb = this.callbacks[msg.id];

        delete this.callbacks[msg.id];
        typeof cb === 'function' && cb(msg.body);
    }

    newInstance() {
        return new Pomelo({
            xmlHttpRequestCreator: this.xmlHttpRequestCreator,
            xmlHttpRequestCreatorWeb: this.xmlHttpRequestCreatorWeb,
            urlGenerator: this.urlGenerator
        });
    }
}