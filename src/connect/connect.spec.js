/* eslint-env mocha */
/* jshint mocha:true */

import {connect} from './connect';
import nock from 'nock';
import chai from 'chai';
const expect = chai.expect;

// -- Tests
describe('Connect', function() {
  beforeEach(function() {
    // Not intuative, but throws if unexpected calls are made,
    // though only if they're on a different domain than what has been mocked.
    // https://github.com/pgte/nock/issues/415#issuecomment-159209456
    nock.disableNetConnect();
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('when calling connect', function() {
    describe('without passing IP', function() {
      describe('and N-UPnP lookup is successful', function() {
        beforeEach(function() {
          this.IP = '192.168.0.3';

          this.getNupnpRequest = () => {
            return nock('https://www.meethue.com')
              .get('/api/nupnp')
              .reply(200, `[{"id":"001788fffe09fe16","internalipaddress":"${this.IP}"}]`);
          };

          // To keep tests decoupled, provide generic request matching any path.
          this.getApiRequest = () => {
            return nock(new RegExp(`${this.IP}`))
              .get(/as-hue-command\/.*/)
              .reply(200, []);
          };

          this.hue = connect({ username: 'as-hue-command' });
        });

        it('returns the hue object configured with the given IP', function(done) {
          this.request1 = this.getNupnpRequest();
          this.request2 = this.getApiRequest();

          this.hue.lights.all().value.subscribe(() => {
            this.request1.done();
            this.request2.done();
            done();
          });
        });

        it("doesn't call N-UPnP again on new requests", function(done) {
          this.request1 = this.getNupnpRequest();
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

        // Integration test. Reproduced problem that wasn't caught by lights tests alone.
        it("doesn't force light-by-index GET call on light PUT", function(done) {
          this.request1 = this.getNupnpRequest();
          this.request2 = nock(new RegExp(`${this.IP}`))
            .put(/as-hue-command\/.*/)
            .reply(200, []);

          // This call shouldn't happen.
          this.request3 = this.getApiRequest();

          this.hue.lights.get(1).toggle(true).subscribe(() => {
            this.request1.done();
            this.request2.done();

            // No great way to test that requests didn't happen in nock
            expect(this.request3.pendingMocks()).to.include(
              `GET ${new RegExp(`${this.IP}`).toString()}\/\/as-hue-command\\/.*\/`
            );
            done();
          });
        });
      });
    });

    describe('passing an explicit IP', function() {
      it('returns the hue object configured with the given IP', function(done) {
        const IP = '192.168.0.10';

        this.request = nock(new RegExp(`${IP}`))
          .get(/as-hue-command\/.*/)
          .reply(200, []);

        connect({ ip: IP, username: 'as-hue-command' }).lights.all().value.subscribe(() => {
          this.request.done();
          done();
        });
      });
    });

    describe('without passing a username', function() {
      beforeEach(function() {
        this.IP = '192.168.0.15';
        this.ERROR = '[{"error":{"type":101,"address":"","description":"link button not pressed"}}]';

        // To keep tests decoupled, provide generic request matching any path.
        this.getPost = () => {
          return nock(new RegExp(`${this.IP}`))
            .post('/api', {
              devicetype: /as-hue-command#.*/
            });
        };
      });

      describe('and the link button has been pressed', function() {
        it('creates a new user', function(done) {
          this.request = this.getPost()
            .reply(200, '[{"success":{"username": "83b7780291a6ceffbe0bd049104df"}}]')
            .get(/api\/83b7780291a6ceffbe0bd049104df\/.*/)
            .reply(200, []);

          connect({ ip: this.IP }).lights.all().value.subscribe(() => {
            this.request.done();
            done();
          });
        });
      });

      describe("and the link button hasn't been pressed", function() {
        it('retries every x secs for y times', function(done) {
          const RETRIES = {
            total: 5,
            timeout: 0
          };

          this.request = this.getPost()
            .times(RETRIES.total + 1)
            .reply(200, this.ERROR);

          connect({ ip: this.IP, retries: RETRIES }).lights.all().value.subscribe(
            () => {},
            () => {
              this.request.done();
              done();
            }
          );
        });

        it('throws Error 101 (Bridge button not pressed)', function(done) {
          const RETRIES = {
            total: 0,
            timeout: 0
          };

          this.request = this.getPost()
            .reply(200, this.ERROR);

          connect({ ip: this.IP, retries: RETRIES }).lights.all().value.subscribe(
            () => {},
            error => {
              expect(error.message).to.equal([
                'Failed to create a new user for as-hue-command.',
                'The Philis Hue Bridge button must be pressed before calling connect().'
              ].join(' '));

              this.request.done();
              done();
            });
        });
      });
    });
  });
});
