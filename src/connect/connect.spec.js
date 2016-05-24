/* eslint-env mocha */
/* jshint mocha:true */

import {getTools} from '../utils/spec-tools';
import nock from 'nock';
import chai from 'chai';
const expect = chai.expect;

const IP = '192.168.0.3';
const USERNAME = 'as-hue-command';
const t = getTools(USERNAME, IP);

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
    describe('and passing username', function() {
      //
      // USERNAME: NO, IP: NO
      //
      describe('and not passing ip', function() {
        beforeEach(function() {
          this.connect = () => t.connect({ username: USERNAME });
        });

        it('attempts to auto-detect the IP via N-UPnP', function() {
          this.nupnp = t.expectNupnp();

          // The internal sequence of calls will fail when config isn't mocked.
          // Catch to make the assertion.
          return this.connect().then(null, () => this.nupnp.done());
        });

        describe('and N-UPnP lookup is successful', function() {
          it('attempts to GET the bridge config', function() {
            t.expectNupnp();
            const config = t.expectConfig();

            return this.connect().then(() => config.done());
          });

          describe('and the bridge config GET is successful', function() {
            it('returns the hue object configured with the given username/IP', function() {
              t.expectNupnp();
              t.expectConfig();

              const {hue, then} = this.connect();

              return then(() => {
                expect(hue.state.get().username).to.equal(USERNAME);
                expect(hue.state.get().ip).to.equal(IP);
              });
            });
          });

          describe('and the bridge config GET is unsuccessful', function() {
            it('throws an error', function() {
              t.expectNupnp();
              t.expectConfig(function(uri, requestBody, cb) {
                // Would want to test for ECONNREFUSED but have to do with generic error.
                // https://github.com/node-nock/nock/issues/410
                cb(new Error());
              });

              return this.connect().then(null, error =>
                expect(error.message)
                  .to.equal(`Unable to connect to ${IP}.`)
              );
            });
          });
        });

        describe('and the connection is successful', function() {
          it("doesn't call N-UPnP or config again on subsequent requests", function() {
            const nupnp = t.expectNupnp();
            const lights = t.expectGetLights();
            t.expectConfig();

            const {hue, then} = this.connect();

            return then(() => {
              nupnp.done();
              return hue.lights.all().value.toPromise().then(() => {
                lights.done();
              });
            });
          });

          // Integration test. Reproduced problem that wasn't caught by lights tests alone.
          it("doesn't force light-by-index GET call on light PUT", function() {
            t.expectNupnp();
            t.expectConfig();

            const put = t.expectPutLightState(1, null, []);
            // This call shouldn't happen.
            this.lights = t.expectGetLights();

            const {hue, then} = this.connect();

            return then(() => {
              return hue.lights.get(1).toggle(true).toPromise().then(() => {
                put.done();

                // No great way to test that requests didn't happen in nock
                expect(this.lights.pendingMocks()).to.include(
                  `GET /${IP}//api/as-hue-command/lights`
                );
              });
            });
          });
        });
      });
      //
      // USERNAME: YES, IP: YES
      //
      describe('and passing ip', function() {
        beforeEach(function() {
          this.connect = () => t.connect({ username: USERNAME, ip: IP });
        });

        it('returns the hue object configured with the given IP', function() {
          t.expectConfig();

          const {hue, then} = this.connect();

          return then(() => {
            expect(hue.state.get().username).to.equal(USERNAME);
            expect(hue.state.get().ip).to.equal(IP);
          });
        });

        describe('and the IP is incorrect', function() {
          it('runs the auto-detect as if an IP wasn\'t passed', function() {
            // not sure we should do this
          });
        });
      });
    });

    describe('and passing ip', function() {
      //
      // USERNAME: NO, IP: YES
      //
      describe('and no username', function() {
        beforeEach(function() {
          this.connect = options => t.connect(Object.assign({ ip: IP }, options));
        });

        describe('and the link button has been pressed', function() {
          it('creates a new user', function() {
            t.expectConfig();
            this.post = t.expectHuePost(
              '/api',
              { devicetype: /as-hue-command#.*/ },
              `[{"success":{"username": "${USERNAME}"}}]`
            );

            return this.connect().then(() => this.post.done());
          });
        });

        describe("and the link button hasn't been pressed", function() {
          beforeEach(function() {
            this.ERROR = '[{"error":{"type":101,"address":"","description":"link button not pressed"}}]';

            // To keep tests decoupled, provide generic request matching any path.
            this.getPost = () => {
              return nock(new RegExp(`${IP}`))
                .post('/api', {
                  devicetype: /as-hue-command#.*/
                });
            };
          });

          it('retries every x secs for y times', function() {
            const RETRIES = {
              total: 5,
              timeout: 0
            };

            const post = this.getPost()
              .times(RETRIES.total + 1)
              .reply(200, this.ERROR);

            return this.connect({ retries: RETRIES })
              .then(null, () => post.done());
          });

          it('throws Error 101 (Bridge button not pressed)', function() {
            const post = this.getPost().reply(200, this.ERROR);
            const RETRIES = {
              total: 0,
              timeout: 0
            };

            return this.connect({ retries: RETRIES }).then(null,
              error => {
                expect(error.message).to.equal([
                  'Failed to create a new user for as-hue-command.',
                  'The Philis Hue Bridge button must be pressed before calling connect().'
                ].join(' '));

                post.done();
              });
          });
        });
      });
    });
  });
});
