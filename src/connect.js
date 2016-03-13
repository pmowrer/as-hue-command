/* eslint-env node */

import * as Rx from 'rx';
import {Hue} from './hue';
import {Request} from './request';

const NUPNP_URL = 'https://www.meethue.com/api/nupnp';
const DEFAULT_RETRIES = {
  total: 30,
  timeout: 1000
};

export function connect({username, ip, retries = DEFAULT_RETRIES} = {}) {
  let connection;

  if (ip) {
    connection = Rx.Observable.just(ip);
  } else {
    connection = Request
      .get(NUPNP_URL, {
        once: true
      })
      .map(response => response[0].internalipaddress);
  }

  if (username) {
    connection = connection.map(ip => getUrlFactory(username, ip));
  } else {
    connection = connection
      .flatMap(ip => {
        return Request.post(`http://${ip}/api`, {
          devicetype: `as-hue-command#${getPlatform()}`
        })
        .map(result => {
          result = result[0];

          if (result.error) {
            throw parseError(result.error);
          } else {
            return getUrlFactory(result.success.username, ip);
          }
        })
        .retryWhen(errors =>
          errors
            .scan((errorCount, err) => {
              if (errorCount >= retries.total) {
                throw err;
              }

              console.warn([
                'Bridge button must be pressed for as-hue-command',
                `${err.name} to create a user. Retrying in ${retries.timeout}ms.`
              ].join(' '));

              return errorCount + 1;
            }, 0)
            .delay(retries.timeout)
        );
      });
  }

  return new Hue(connection);
}

function getUrlFactory(username, ip) {
  return function getUrl(path) {
    return `http://${ip}/api/${username}/${path}`;
  };
}

function getPlatform() {
  return typeof self === 'object' ?
    navigator.platform : require('os').platform();
}

function parseError(data) {
  let error = new Error(ERRORS[data.type ] || ERRORS.default);
  error.name = error.type;
  return error;
}

const ERRORS = {
  101: [
    'Failed to create a new user for as-hue-command.',
    'The Philis Hue Bridge button must be pressed before calling connect().'
  ].join(' '),
  default: [
    'An error occurred trying to create a new user for as-hue-command on the bridge.',
    'Sorry, not documented yet. :('
  ].join(' ')
};
