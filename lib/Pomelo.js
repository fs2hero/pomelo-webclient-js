'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
// const Message = require('./Message');
// const Protocol = require('./Protocal');
// const Package = require('./Package');

var DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

var JS_WS_CLIENT_TYPE = 'js-websocket';
var JS_WS_CLIENT_VERSION = '0.0.1';

var RES_OK = 200;
var RES_FAIL = 500;
var RES_OLD_CLIENT = 501;

function defaultDecode(data) {
    if (!data) {
        return {};
    }

    var msg = JSON.parse(data);
    return msg;
}

function defaultEncode(reqId, route, msg) {
    if (msg) {
        msg = JSON.stringify(msg);
    }
    return msg;
}

function defaultUrlGenerator(host, port, isHttps) {
    var protocol = 'http://';
    if (isHttps) {
        protocol = 'https://';
    }

    var url = protocol + host;
    if (port) {
        url += ':' + port + '/';
    }
    return url;
}

module.exports = function (_EventEmitter) {
    _inherits(Pomelo, _EventEmitter);

    function Pomelo(args) {
        _classCallCheck(this, Pomelo);

        var _this = _possibleConstructorReturn(this, (Pomelo.__proto__ || Object.getPrototypeOf(Pomelo)).call(this, args));

        var xmlHttpRequestCreator = args.xmlHttpRequestCreator,
            xmlHttpRequestCreatorWeb = args.xmlHttpRequestCreatorWeb,
            _args$urlGenerator = args.urlGenerator,
            urlGenerator = _args$urlGenerator === undefined ? defaultUrlGenerator : _args$urlGenerator;

        _this.xmlHttpRequestCreator = xmlHttpRequestCreator;
        _this.xmlHttpRequestCreatorWeb = xmlHttpRequestCreatorWeb;
        _this.urlGenerator = urlGenerator;

        _this.callbacks = {};
        _this.reqId = 0;
        _this.token = '';
        return _this;
    }

    _createClass(Pomelo, [{
        key: 'init',
        value: function init(params, cb) {
            this.initCallback = cb;

            this.params = params;
            var host = params.host,
                port = params.port,
                user = params.user,
                handshakeCallback = params.handshakeCallback,
                _params$encode = params.encode,
                encode = _params$encode === undefined ? defaultEncode : _params$encode,
                _params$decode = params.decode,
                decode = _params$decode === undefined ? defaultDecode : _params$decode,
                debugMode = params.debugMode,
                browserWS = params.browserWS,
                headers = params.headers;


            this.encode = encode;
            this.decode = decode;

            this.headers = headers || {};
            this.isHttps = params.isHttps || false;

            if (debugMode) {
                this.url = defaultUrlGenerator(host, port, this.isHttps);
            } else {
                this.url = this.urlGenerator(host, port, this.isHttps);
            }

            if (browserWS) {
                this.wsCreator = this.wsCreatorWeb;
                this.browserWS = browserWS;
            }

            this.initCallback && this.initCallback({ code: 200, msg: 'init ok' });
        }
    }, {
        key: 'setToken',
        value: function setToken(token) {
            this.token = token;
        }
    }, {
        key: 'makeXHR',
        value: function makeXHR(reqId, route, method, msg) {
            var _this2 = this;

            var onMessage = function onMessage(data) {
                console.log('onMessage ', data);
                _this2.onData(data);
            };

            var onError = function onError(event) {
                // this.emit('xhr-io-error', event);
                console.error('socket error: ', event);
                _this2.processMessage({ id: reqId, route: route, body: { err: 'error', detail: event } });
            };

            var onTimeOut = function onTimeOut(event) {
                // this.emit('xhr-timeout', event);
                _this2.processMessage({ id: reqId, route: route, body: { err: 'timeout', detail: event } });
            };

            // socket = wx.connectSocket({ url: reconnectUrl });
            this.socket = this.xmlHttpRequestCreator({
                url: this.url,
                onError: onError,
                onMessage: onMessage,
                onTimeOut: onTimeOut
            });

            var query = '';

            if (method.toLowerCase() == 'get') {
                for (var key in msg) {
                    if (query == '') {
                        query = '?' + key + '='; // + msg[key];
                    } else {
                        query = query + '&' + key + '='; // + msg[key];
                    }

                    var value = msg[key];
                    if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
                        if (value) {
                            query += encodeURIComponent(JSON.stringify(value));
                        } else {
                            query += value;
                        }
                    } else if (typeof value == 'string') {
                        query += encodeURIComponent(value);
                    } else {
                        query += value;
                    }
                }
            }

            var requestUrl = this.url + route;
            if (query != '') {
                requestUrl = requestUrl + query;
            }
            console.log('requestUrl ', requestUrl);

            this.socket.open(method, requestUrl, true);

            // this.socket.setRequestHeader("Request-Id",this.reqId);

            if (reqId > 0) {
                this.socket.setRequestHeader('X-Request-Id', reqId);
            }

            if (this.token != '') {
                this.socket.setRequestHeader('X-Access-Token', this.token);
            }
            this.socket.setRequestHeader("Content-Type", "application/json");
            if (this.headers) {
                for (var key in this.headers) {
                    this.socket.setRequestHeader(key, this.headers[key]);
                }
            }

            this.socket.timeout = 25000;
        }
    }, {
        key: 'disconnect',
        value: function disconnect() {}
    }, {
        key: 'request',
        value: function request(route, method, msg, cb) {

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
    }, {
        key: 'notify',
        value: function notify(route, method, msg) {
            msg = msg || {};
            this.makeXHR(0, route, method, msg);

            if (method.toLowerCase() == 'get') {
                msg = null;
            }
            this.sendMessage(0, route, msg);
        }
    }, {
        key: 'sendMessage',
        value: function sendMessage(reqId, route, msg) {

            if (!msg) {
                this.socket.send();
            } else {
                msg = this.encode(reqId, route, msg);

                this.socket.send(msg);
            }
        }
    }, {
        key: 'onData',
        value: function onData(msg) {
            msg = this.decode(msg);
            this.processMessage(msg);
        }
    }, {
        key: 'processMessage',
        value: function processMessage(msg) {
            console.log('processMessage');
            if (!msg.id) {
                this.emit(msg.route, msg.body);
                return;
            }

            //if have a id then find the callback function with the request
            console.log('callbacks  ', this.callbacks);

            var cb = this.callbacks[msg.id];

            delete this.callbacks[msg.id];
            typeof cb === 'function' && cb(msg.body);
        }
    }, {
        key: 'newInstance',
        value: function newInstance() {
            return new Pomelo({
                xmlHttpRequestCreator: this.xmlHttpRequestCreator,
                xmlHttpRequestCreatorWeb: this.xmlHttpRequestCreatorWeb,
                urlGenerator: this.urlGenerator
            });
        }
    }]);

    return Pomelo;
}(EventEmitter);