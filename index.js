'use strict';

var Pomelo = require('./lib/Pomelo');
// const WS = require('ws');

function getXMLHttpRequest() {
    return window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject('MSXML2.XMLHTTP');
}

function xmlHttpRequestCreator(_ref) {
    var url = _ref.url,
        onError = _ref.onError,
        onMessage = _ref.onMessage,
        onTimeOut = _ref.onTimeOut;

    var xhr = getXMLHttpRequest();

    xhr.onreadystatechange = function () {
        console.log('onreadystatechange');

        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304)) {
            var respone = xhr.responseText;
            onMessage && onMessage(respone);
        } else if (xhr.readyState === 4 && xhr.status == 403) {
            onError && onError(JSON.parse(xhr.responseText));
        }

        // console.log('readyState ',xhr.readyState,'  status ',xhr.status);
    };
    //超时回调
    xhr.ontimeout = function (event) {
        //closedebug*  console.log('超时啦' );
        onTimeOut && onTimeOut(event);
    };
    xhr.onerror = function (event) {
        onError && onError(event);
    };

    return xhr;
}

function xmlHttpRequestCreatorWeb(_ref2) {
    var url = _ref2.url,
        onError = _ref2.onError,
        onMessage = _ref2.onMessage,
        onTimeOut = _ref2.onTimeOut;

    return xmlHttpRequestCreator({ url: url, onError: onError, onMessage: onMessage, onTimeOut: onTimeOut });
}

function urlGenerator(host, port, isHttps) {
    var protocol = 'http://';
    if (isHttps) {
        protocol = 'https://';
    }

    var url = protocol + host;
    if (port) {
        url += '/web/' + port + '/';
    }
    return url;
}

function PomeloFactory() {
    return new Pomelo({
        xmlHttpRequestCreator: xmlHttpRequestCreator,
        xmlHttpRequestCreatorWeb: xmlHttpRequestCreatorWeb,
        urlGenerator: urlGenerator
    });
}

module.exports = PomeloFactory();
