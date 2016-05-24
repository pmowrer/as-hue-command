import nock from 'nock';
import {connect} from '../connect/connect';

const NO_BODY = () => true;

export function getTools(USERNAME, IP) {
  const self = {
    expectHueGet: (path, replyWith) => {
      return nock(new RegExp(IP))
        .get(path)
        .reply(200, replyWith);
    },

    expectHuePut: (path, body = NO_BODY, replyWith = {}) => {
      return nock(new RegExp(IP))
        .put(path, body !== null ? body : NO_BODY)
        .reply(200, replyWith);
    },

    expectHuePost: (path, body = NO_BODY, replyWith = {}) => {
      return nock(new RegExp(IP))
        .post(path, body !== null ? body : NO_BODY)
        .reply(200, replyWith);
    },

    expectNupnp: () => {
      return nock('https://www.meethue.com')
        .get('/api/nupnp')
        .reply(200, `[{"id":"001788fffe09fe16","internalipaddress":"${IP}"}]`);
    },

    expectConfig: replyWith =>
      self.expectHueGet('/api/as-hue-command/config', replyWith),

    expectGetLights: replyWith =>
      self.expectHueGet('/api/as-hue-command/lights', replyWith),

    expectGetLight: (id, replyWith) =>
      self.expectHueGet(`/api/as-hue-command/lights/${id}`, replyWith),

    expectPutLight: (id, body, replyWith) =>
      self.expectHuePut(`/api/as-hue-command/lights/${id}`, body, replyWith),

    expectPutLightState: (id, body, replyWith) =>
      self.expectHuePut(`/api/as-hue-command/lights/${id}/state`, body, replyWith),

    connect: (options) => {
      const hue = connect(options);
      return {
        hue,
        then: (...args) => {
          return hue.connection$.toPromise().then(...args);
        }
      };
    }
  };

  return self;
}
