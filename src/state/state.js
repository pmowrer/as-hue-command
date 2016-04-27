/* eslint-env node */
import * as Rx from 'rx';
import {DEFAULT_OPTIONS} from './defaults';

function getStorage() {
  const localStorage = global.localStorage;

  // `storageOption` is `localStorage`, if available, else `false`.
  // https://mathiasbynens.be/notes/localstorage-pattern#comment-7
  return !!function() {
    var result;
    var uid = +new Date;
    try {
      localStorage.setItem(uid, uid);
      result = localStorage.getItem(uid) == uid;
      localStorage.removeItem(uid);
      return result;
    } catch (exception) {
      return () => {};
    }
  }() && localStorage;
}

const storage = {
  getItem: name => {
    const storageOption = getStorage();
    return storageOption ? JSON.parse(storageOption.getItem(name)) : {};
  },
  setItem: (name, value) => {
    const storageOption = getStorage();
    if (storageOption) {
      storageOption.setItem(name, JSON.stringify(value));
    }
  },
  removeItem: name => {
    const storageOption = getStorage();
    if (storageOption) {
      storageOption.removeItem(name);
    }
  }
};

const STORAGE_NAME = 'as-hue-command';

export function stateFactory() {
  let store;
  const state$ = new Rx.BehaviorSubject({});
  state$
    .scan((previous, next) => Object.assign({}, previous, next))
    .subscribe(state => store = state);

  function get(name) {
    let state = Object.assign(
      {},
      storage.getItem(STORAGE_NAME),
      DEFAULT_OPTIONS,
      store
    );

    return name ? state[name] : state;
  }

  function save() {
    storage.setItem(STORAGE_NAME, get());
  }

  function clear() {
    storage.removeItem(STORAGE_NAME);
  }

  return {
    state$,

    state: {
      get,
      save,
      clear
    }
  };
}
