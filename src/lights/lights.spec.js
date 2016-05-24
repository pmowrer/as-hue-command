/* eslint-env mocha */
/* jshint mocha:true */
/* jshint expr: true */ // For chai expressions
import _ from 'lodash-es';

import LIGHTS     from './fixtures/lights';
import {getTools} from '../utils/spec-tools';

// -- Test Tools Setup
import chai from 'chai';
import nock from 'nock';
const expect = chai.expect;

const IP = '192.168.0.3';
const USERNAME = 'as-hue-command';
const t = getTools(USERNAME, IP);

// -- Tests
describe('Lights', function() {
  beforeEach(function() {
    // Not intuative, but throws if unexpected calls are made,
    // though only if they're on a different domain than what has been mocked.
    // https://github.com/pgte/nock/issues/415#issuecomment-159209456
    nock.disableNetConnect();

    t.expectConfig();
    this.expectGetLights = t.expectGetLights(LIGHTS);

    const {hue, then} = t.connect({ username: USERNAME, ip: IP });
    return then(() => this.hue = hue);
  });

  afterEach(function() {
    nock.cleanAll();
  });

  it('should get all lights', function() {
    return this.hue.lights.all().value.toPromise().then(() => {
      this.expectGetLights.done();
    });
  });

  it('should add an `id` field to each light', function() {
    return this.hue.lights.all().value.toPromise().then(data => {
      const diff = _.difference(_.keys(data['1']), _.keys(LIGHTS['1']));
      expect(diff).to.eql(['id']);
    });
  });

  it('should get all light names', function() {
    return this.hue.lights.all().names().toPromise().then(names => {
      expect(names).to.deep.equal([
        'Bedside Table',
        'Bookcase',
        'Hallway 1',
        'Bedroom Dresser R',
        'Kitchen Table',
        'Hallway 2',
        'Bedroom Dresser L',
        'LightStrips 1',
        'Zombie',
        'Kitchen RF',
        'Kitchen RN',
        'Hallway 3'
      ]);
    });
  });
});
