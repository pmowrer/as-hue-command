/* eslint-env mocha */
/* jshint mocha:true */
/* jshint expr: true */ // For chai expressions

import {TRANSITION_DEFAULT} from '../constants';
import {getTools} from '../utils/spec-tools';

import LIGHTS from './fixtures/lights';
import STATE from './fixtures/state';
import ON from './fixtures/on';
import OFF from './fixtures/off';

// -- Test Tools Setup
import chai from 'chai';
import nock from 'nock';
const expect = chai.expect;

const IP = '192.168.0.3';
const USERNAME = 'as-hue-command';
const t = getTools(USERNAME, IP);

// -- Tests
describe('Light', function() {
  beforeEach(function() {
    // Not intuative, but throws if unexpected calls are made,
    // though only if they're on a different domain than what has been mocked.
    // https://github.com/pgte/nock/issues/415#issuecomment-159209456
    nock.disableNetConnect();

    t.expectConfig();

    const {hue, then} = t.connect({ username: USERNAME, ip: IP });

    return then(() => {
      this.hue = hue;

      // Set transitionTime to default to avoid extra noise in PUTs.
      this.hue.transitionTime = TRANSITION_DEFAULT;
    });
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('light by index', function() {
    it('should get a light by index', function() {
      t.expectGetLight(1, LIGHTS['1']);

      return this.hue.lights
        .get(1)
        .value
        .toPromise()
        .then(data => {
          expect(data).to.deep.equal(Object.assign({ id:1 }, LIGHTS['1']));
        });
    });

    it('should get a light by name', function() {
      t.expectGetLights(LIGHTS);

      return this.hue.lights
        .get('Hallway 1')
        .value
        .toPromise()
        .then(data => {
          expect(data).to.deep.equal(Object.assign({ id: 3 }, LIGHTS['3']));
        });
    });

    it('should get a light\'s name', function() {
      t.expectGetLight(2, LIGHTS['2']);

      return this.hue.lights
        .get(2)
        .name()
        .toPromise()
        .then(name => {
          expect(name).to.equal('Bookcase');
        });
    });

    it('should rename a light', function() {
      const newName = 'Bedroom';

      t.expectGetLights(LIGHTS);
      t.expectPutLight(2, { name: newName }, {});

      return this.hue.lights
        .get('Bookcase')
        .name('Bedroom')
        .toPromise()
        .then(result => expect(result).to.equal(newName));
    });

    it('should rename a light with just a put', function() {
      const newName = 'Bedroom';
      const expectLight = t.expectGetLight(2);

      t.expectPutLight(2, { name: newName }, {});

      return this.hue.lights
        .get(2)
        .name('Bedroom')
        .toPromise()
        .then(() =>
          // No great way to test that requests didn't happen in nock
          expect(expectLight.pendingMocks()).to.include(
            `GET /${IP}//api/as-hue-command/lights/2`
          ));
    });

    it('should determine whehter a light is on', function() {
      t.expectGetLights(LIGHTS);

      return this.hue.lights
        .get('Bedroom Dresser R')
        .isOn
        .toPromise()
        .then(result => expect(result).to.equal(false));
    });

    it('should turn a light on', function() {
      const on = { on: true };
      t.expectPutLightState(2, on, ON);

      return this.hue.lights
        .get(2)
        .on()
        .toPromise()
        .then(result => expect(result).to.equal(true));
    });

    it('should turn a light off', function() {
      const off = { on: false };
      t.expectPutLightState(2, off, OFF);

      return this.hue.lights
        .get(2)
        .off()
        .toPromise()
        .then(result => expect(result).to.equal(false));
    });

    it('should toggle a light', function() {
      const on = { on: true };
      t.expectPutLightState(2, on, ON);

      return this.hue.lights
        .get(2)
        .toggle(true)
        .toPromise()
        .then(result => expect(result).to.equal(true));
    });

    it('should mutate a light\'s state with just a put', function() {
      const on = { on: true };
      const expectLight = t.expectGetLight(1);
      t.expectPutLightState(1, on, ON);

      return this.hue.lights
        .get(1)
        .toggle(true)
        .toPromise()
        .then(() =>
          // No great way to test that requests didn't happen in nock
          expect(expectLight.pendingMocks()).to.include(
            `GET /${IP}//api/as-hue-command/lights/1`
          )
        );
    });

    it('should toggle a light by name', function() {
      const on = { on: true };
      t.expectGetLights(LIGHTS);
      t.expectPutLightState(2, on, ON);

      return this.hue.lights
        .get('Bookcase')
        .toggle(true)
        .toPromise()
        .then((value => expect(value).to.be.true));
    });

    it('should merge state update responses into a lights object', function() {
      const newState = { on: true, bri: 100};
      t.expectPutLightState(3, newState, STATE);

      return this.hue.lights
        .get(3)
        .state(newState)
        .toPromise()
        .then(data =>
          expect(data).to.eql(Object.assign({}, newState, { id: 3 }))
        );
    });

    it('should get a light\'s brightness', function() {
      t.expectGetLight(10, LIGHTS[10]);

      return this.hue.lights
        .get(10)
        .brightness()
        .toPromise()
        .then(value => expect(value).to.equal(254));
    });

    it('should set a light\'s brightness', function() {
      t.expectPutLightState(12, { bri: 50 }, '[{"success":{"/lights/12/state/bri":50}}]');

      return this.hue.lights
        .get(12)
        .brightness(50)
        .toPromise()
        .then(value => expect(value).to.equal(50));
    });
  });
});
