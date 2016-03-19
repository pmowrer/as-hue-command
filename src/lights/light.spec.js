/* eslint-env mocha */
/* jshint mocha:true */
/* jshint expr: true */ // For chai expressions

import {connect} from '../connect/connect';
import {TRANSITION_DEFAULT} from '../constants';

import LIGHTS from './fixtures/lights';
import STATE from './fixtures/state';

import _ from 'lodash-es';

// -- Test Tools Setup
import chai from 'chai';
import nock from 'nock';
const expect = chai.expect;

const IP = '192.168.0.3:80';

// -- Tests
describe('Lights', function() {
  beforeEach(function() {
    // Not intuative, but throws if unexpected calls are made,
    // though only if they're on a different domain than what has been mocked.
    // https://github.com/pgte/nock/issues/415#issuecomment-159209456
    nock.disableNetConnect();

    // Dummy configuration
    this.hue = connect({ ip: IP, username: 'as-hue-command' });

    // Set transitionTime to default to avoid extra noise in PUTs.
    this.hue.transitionTime = TRANSITION_DEFAULT;
    this.request = nock(`http://${IP}`);
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('all lights', function() {
    beforeEach(function() {
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS);
    });

    it('should get all lights', function(done) {
      this.hue.lights.all().value.subscribe(() => {
        this.request.done();
        done();
      });
    });

    it('should add an `id` field to each light', function(done) {
      this.hue.lights.all().value.subscribe(data => {
        let diff = _.difference(_.keys(data['1']), _.keys(LIGHTS['1']));
        expect(diff).to.eql(['id']);
        done();
      });
    });

    it('should get all light names', function(done) {
      this.hue.lights.all().names().subscribe(names => {
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

        this.request.done();
        done();
      });
    });
  });

  describe('light by index', function() {
    it('should get a light by index', function(done) {
      this.request
        .get('/api/as-hue-command/lights/1')
        .reply(200, LIGHTS['1']);

      this.hue.lights.get(1).value.subscribe(data => {
        expect(data).to.deep.equal(Object.assign({ id:1 }, LIGHTS['1']));
        this.request.done();
        done();
      });
    });

    it('should get a light by name', function(done) {
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS);

      this.hue.lights.get('Hallway 1').value.subscribe(data => {
        expect(data).to.deep.equal(Object.assign({ id: 3 }, LIGHTS['3']));
        this.request.done();
        done();
      });
    });

    it('should get a light\'s name', function(done) {
      this.request
        .get('/api/as-hue-command/lights/2')
        .reply(200, LIGHTS['2']);

      this.hue.lights.get(2).name().subscribe(name => {
        expect(name).to.equal('Bookcase');
        this.request.done();
        done();
      });
    });

    it('should rename a light', function(done) {
      const newName = 'Bedroom';
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS)
        .put('/api/as-hue-command/lights/2')
        .reply(200, {});

      this.hue.lights.get('Bookcase').name('Bedroom').subscribe(result => {
        expect(result).to.equal(newName);
        this.request.done();
        done();
      });
    });

    it('should rename a light with just a put', function(done) {
      const newName = 'Bedroom';
      this.request
        .put('/api/as-hue-command/lights/2', {
          name: newName
        })
        .reply(200, {});

      // Request that shouldn't happen.
      this.request
        .get('/api/as-hue-command/lights/3')
        .reply(200, []);

      this.hue.lights.get(2).name('Bedroom').subscribe(() => {
        // No great way to test that requests didn't happen in nock
        expect(this.request.pendingMocks()).to.include(
          'GET http://192.168.0.3:80/api/as-hue-command/lights/3'
        );
        done();
      });
    });

    it('should determine whehter a light is on', function(done) {
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS);

      this.hue.lights.get('Bedroom Dresser R').isOn.subscribe(result => {
        expect(result).to.equal(false);
        this.request.done();
        done();
      });
    });

    it('should turn a light on', function(done) {
      this.request
        .put('/api/as-hue-command/lights/1/state', {
          on: true
        })
        .reply(200, []);

      this.hue.lights.get(1).on().subscribe(() => {
        this.request.done();
        done();
      });
    });

    it('should turn a light off', function(done) {
      this.request
        .put('/api/as-hue-command/lights/2/state', {
          on: false
        })
        .reply(200, []);

      this.hue.lights.get(2).off().subscribe(() => {
        this.request.done();
        done();
      });
    });

    it('should toggle a light', function(done) {
      this.request
        .put('/api/as-hue-command/lights/3/state', {
          on: true
        })
        .reply(200, []);

      this.hue.lights.get(3).toggle(true).subscribe(() => {
        this.request.done();
        done();
      });
    });

    it('should toggle a light with just a put', function(done) {
      this.request
        .put('/api/as-hue-command/lights/3/state', {
          on: true
        })
        .reply(200, []);

      // Request that shouldn't happen.
      this.request
        .get('/api/as-hue-command/lights/3')
        .reply(200, []);

      this.hue.lights.get(3).toggle(true).subscribe(() => {
        // No great way to test that requests didn't happen in nock
        expect(this.request.pendingMocks()).to.include(
          'GET http://192.168.0.3:80/api/as-hue-command/lights/3'
        );
        done();
      });
    });

    it('should toggle a light by name', function(done) {
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS)
        .put('/api/as-hue-command/lights/9/state', {
          on: true
        })
        .reply(200, '[{"success":{"/lights/12/state/on":true}}]');

      this.hue.lights.get('Zombie').toggle(true).subscribe(value => {
        expect(value).to.be.true;
        this.request.done();
        done();
      });
    });

    it('should merge state update responses into a lights object', function(done) {
      this.request
        .put('/api/as-hue-command/lights/3/state', {
          on: true,
          bri: 100
        })
        .reply(200, STATE);

      this.hue.lights.get(3)
        .state({
          on: true,
          bri: 100
        })
        .subscribe(data => {
          expect(data).to.eql({
            id: 3,
            on: true,
            bri: 100
          });
          this.request.done();
          done();
        });
    });

    it('should get a light\'s brightness', function(done) {
      this.request
        .get('/api/as-hue-command/lights/10')
        .reply(200, LIGHTS[10]);

      this.hue.lights.get(10).brightness().subscribe(value => {
        expect(value).to.equal(254);
        this.request.done();
        done();
      });
    });

    it('should set a light\'s brightness', function(done) {
      this.request
        .get('/api/as-hue-command/lights')
        .reply(200, LIGHTS)
        .put('/api/as-hue-command/lights/12/state', {
          bri: 50
        })
        .reply(200, '[{"success":{"/lights/12/state/bri":50}}]');

      this.hue.lights.get('Hallway 3').brightness(50).subscribe(value => {
        expect(value).to.equal(50);
        this.request.done();
        done();
      });
    });
  });
});
