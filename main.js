const Pomelo = require('./lib/Pomelo');
// const WS = require('ws');

function getXMLHttpRequest () {
    return window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject('MSXML2.XMLHTTP');
}

function xmlHttpRequestCreator({url, onError, onMessage, onTimeOut}) {
    const xhr = getXMLHttpRequest();

    xhr.onreadystatechange = function () {
        console.log('onreadystatechange');
        
        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300  || xhr.status == 304)) {
            var respone = xhr.responseText;
            onMessage && onMessage(respone);
        }
        else if(xhr.readyState === 4 && xhr.status == 403){
            onError && onError(JSON.parse(xhr.responseText));
        }

        // console.log('readyState ',xhr.readyState,'  status ',xhr.status);
    };
    //超时回调
    xhr.ontimeout = function(event){
        //closedebug*  console.log('超时啦' );
        onTimeOut && onTimeOut(event);
    };
    xhr.onerror = function(event){
        onError && onError(event);
    };

    return xhr;
}

function xmlHttpRequestCreatorWeb({url, onError, onMessage, onTimeOut}) {
    return xmlHttpRequestCreator({url,onError,onMessage,onTimeOut});
}

function urlGenerator(host, port,isHttps) {
    let protocol = 'http://';
    if(isHttps){
        protocol = 'https://'
    }

    let url = protocol + host;
    if (port) {
        url += '/web/' + port + '/';
    }
    return url;
}

function PomeloFactory() {
    return new Pomelo({
        xmlHttpRequestCreator,
        xmlHttpRequestCreatorWeb,
        urlGenerator
    });
}

module.exports = PomeloFactory()