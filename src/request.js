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
}

function makeRequest(url, options = {}) {
  let subject = new Rx.AsyncSubject();
  let requestOptions = {
    withCredentials:  false,
    uri:              `${url}`,
    method:           options.method,
    body:             options.body,
    json:             true
  };

  request(requestOptions, (error, response, body) => {
    if (error) {
      subject.onError(error);
    } else {
      subject.onNext(body);
      subject.onCompleted();
    }
  });

  return subject;
}
