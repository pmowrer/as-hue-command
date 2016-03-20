/* eslint-env mocha */
/* jshint mocha:true */

import {stateFactory} from './state';
import {DEFAULT_OPTIONS} from './defaults';
import chai from 'chai';
const expect = chai.expect;

// -- Tests
describe('State', function() {
  describe('#get', function() {
    it('returns the default state', function() {
      assertStatesEqual(stateFactory().state.get(), DEFAULT_OPTIONS);
    });
  });

  describe('when emitting state on state$', function() {
    beforeEach(function() {
      let {state, state$} = stateFactory();
      Object.assign(this, { state, state$} );

      this.username = { username: 'as-hue-command' };
      this.ip = { ip: '192.168.0.10' };
    });

    it('becomes available via state.get', function() {
      this.state$.onNext(this.username);

      assertStatesEqual(this.state.get(), merge(DEFAULT_OPTIONS, this.username));
    });

    describe('and multiple state emits are made', function() {
      it('merges the state', function() {
        this.state$.onNext(this.username);
        this.state$.onNext(this.ip);

        assertStatesEqual(this.state.get(), merge(DEFAULT_OPTIONS, this.username, this.ip));
      });
    });
  });
});

function assertStatesEqual(state1, state2) {
  expect(JSON.stringify(state1)).to.equal(JSON.stringify(state2));
}

function merge(...states) {
  return Object.assign({}, ...states);
}
