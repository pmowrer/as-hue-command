import * as Rx from 'rx';
import request from 'request';

export class Request {
  static get(url, options) {
    return makeRequest(url, Object.assign({}, options, {
      method: 'GET'
    }));
  }

  static put(url, body, options) {
    return makeRequest(url, Object.assign({}, options, {
      method: 'PUT',
      body
    }));
  }

  static post(url, body, options) {
    return makeRequest(url, Object.assign({}, options, {
      method: 'POST',
      body
    }));
  }
}

function makeRequest(url, options = {}) {
  let requestOptions = {
    withCredentials:  false,
    uri:              `${url}`,
    method:           options.method,
    body:             options.body,
    json:             true
  };

  if (options.once) {
    // Request is only made once during entire observable sequence.
    return doRequest(new Rx.AsyncSubject(), requestOptions);
  } else {
    return Rx.Observable.create(observer => doRequest(observer, requestOptions));
  }

  function doRequest(observer) {
    request(requestOptions, (error, response, body) => {
      if (error) {
        observer.onError(error);
      } else {
        observer.onNext(body);
        observer.onCompleted();
      }
    });

    return observer;
  }
}
