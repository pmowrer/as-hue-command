import * as Rx from 'rx';
import {Hue} from './hue';
import {Request} from './request';

const NUPNP_URL = 'https://www.meethue.com/api/nupnp';

export function connect(ip = '') {
  let connection;

  if (ip) {
    connection = Rx.Observable.just(ip);
  } else {
    connection = Request
      .get(NUPNP_URL, {
        once: true
      })
      // TODO: Support multiple bridges
      .map(response => response[0].internalipaddress);
  }

  return new Hue(connection);
}
