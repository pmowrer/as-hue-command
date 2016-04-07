import * as Rx from 'rx';
import axios from 'axios';

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
    url:    `${url}`,
    method: options.method,
    data:   options.body
  };

  if (options.once) {
    // Request is only made once during entire observable sequence.
    return doRequest(new Rx.AsyncSubject(), requestOptions);
  } else {
    return Rx.Observable.create(observer => doRequest(observer, requestOptions));
  }

  function doRequest(observer) {
    axios(requestOptions)
      .then(({data}) => {
        observer.onNext(data);
        observer.onCompleted();
      })
      .catch(error => {
        observer.onError(error);
      });

    return observer;
  }
}
