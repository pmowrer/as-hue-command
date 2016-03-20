import * as Rx from 'rx';
import {DEFAULT_OPTIONS} from './defaults';

export function stateFactory() {
  let store;
  const state$ = new Rx.BehaviorSubject({});
  state$
    .scan((previous, next) => Object.assign({}, previous, next))
    .subscribe(state => store = state);

  return {
    state$,

    state: {
      get: name => {
        let state = Object.assign(
          {},
          DEFAULT_OPTIONS,
          store
        );

        return name ? state[name] : state;
      }
    }
  };
}
