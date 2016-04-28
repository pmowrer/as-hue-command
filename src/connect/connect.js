/* eslint-env node */
import * as Rx from 'rx';
import {Hue} from '../hue';
import {Request} from '../request';
import {stateFactory} from '../state/state';

const NUPNP_URL = 'https://www.meethue.com/api/nupnp';
const {state, state$} = stateFactory();
const OPTIONS = state.get();

export function connect({
  username = OPTIONS.username,
  ip = OPTIONS.ip,
  retries = OPTIONS.retries
} = {}) {
  const ip$ = ip ? Rx.Observable.just(ip) : requestIp();
  const username$ = username ?
    Rx.Observable.just(username) : requestUsername(ip$, retries);

  // Create an observable that emits the username and ip of the Bridge connection.
  const connection$ = Rx.Observable
    .zip(username$, ip$)
    .do(([username, ip]) => state$.onNext({ username, ip }))
    .map(() => ({ state, state$ }));

  return new Hue(connection$, { state, state$ });
}

function requestIp() {
  return Request
    .get(NUPNP_URL, {
      once: true
    })
    .map(response => response[0].internalipaddress);
}

function requestUsername(ip$, retries) {
  return ip$
    .flatMap(ip => {
      return Request.post(`http://${ip}/api`, {
        devicetype: `as-hue-command#${getPlatform()}`
      })
      .map(result => {
        result = result[0];

        if (result.error) {
          throw parseError(result.error);
        } else {
          return result.success.username;
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
