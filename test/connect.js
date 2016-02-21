/* eslint-env mocha */
/* jshint mocha:true */

import {connect} from '../src/connect';
import nock from 'nock';

// -- Tests
describe('Connect', function() {
  beforeEach(function() {
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('when calling connect', function() {
    describe('without passing arguments', function() {
      describe('and N-UPnP lookup is successful', function() {
        beforeEach(function() {
          this.IP = '192.168.0.3';

          // To keep tests decoupled, provide generic request matching any IP.
          this.getApiRequest = () => {
            return nock(new RegExp(`${this.IP}`))
              .get(/.*/)
              .reply(200, []);
          };

          this.hue = connect();
        });

        it('returns the hue object configured with the given IP', function(done) {
          this.request1 = nock(`https://www.meethue.com`)
            .get('/api/nupnp')
            .reply(200, `[{"id":"001788fffe09fe16","internalipaddress":"${this.IP}"}]`);

          this.request2 = this.getApiRequest();

          this.hue.lights.all().value.subscribe(() => {
            this.request1.done();
            this.request2.done();
            done();
          });
        });

        it(`doesn't call N-UPnP again on new requests`, function(done) {
          this.request1 = nock(`https://www.meethue.com`)
            .get('/api/nupnp')
            .reply(200, `[{"id":"001788fffe09fe16","internalipaddress":"${this.IP}"}]`);

          this.request2 = this.getApiRequest();

          this.hue.lights.all().value.subscribe(() => {
            this.request1.done();
            this.request2.done();

            // Must do this, else request2 keeps intercepting requests,
            // blocking request3 from getting them. Seems like a nock bug.
            nock.cleanAll();

            this.request3 = this.getApiRequest();

            this.hue.lights.get(1).value.subscribe(() => {
              this.request3.done();
              done();
            });
          });
        });
      });
    });

    describe('passing an explicit IP', function() {
      it('returns the hue object configured with the given IP', function(done) {
        const IP = '192.168.0.10';

        this.request = nock(new RegExp(`${IP}`))
          .get(/.*/)
          .reply(200, []);

        connect(IP).lights.all().value.subscribe(() => {
          this.request.done();
          done();
        });
      });
    });
  });
});
