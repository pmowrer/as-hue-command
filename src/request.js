import * as Rx from 'rx';
import request from 'request';

const IP = '192.168.0.3:80';

export class Request {
  static get(path, options) {
    return makeRequest(path, Object.assign({}, options, {
      method: 'GET'
    }));
  }

  static put(path, body, options) {
    return makeRequest(path, Object.assign({}, options, {
      method: 'PUT',
      body
    }));
  }
}

function makeRequest(path, options = {}) {
  let requestOptions = {
    withCredentials:  false,
    uri:              `http://${IP}${path}`,
    method:           options.method,
    body:             options.body,
    json:             true
  };

  return Rx.Observable.create(observer => {
    request(requestOptions, (error, response, body) => {
      if (error) {
        observer.onError(error);
      } else {
        observer.onNext(body);
        observer.onCompleted();
      }
    });
  });
}
