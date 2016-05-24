import * as Rx      from 'rx';
import {mapValues}  from 'lodash-es';
import {ENDPOINTS}  from './constants';
import {Request}    from './request';
import {Light}      from './lights/light';
import {Lights}     from './lights/lights';
import {getUrl}     from './selectors/selectors';

export class Hue {
  constructor(connection$, {state, state$}) {
    this.connection$ = connection$;
    this.state = state;
    this.state$ = state$;
  }

  get transitionTime() {
    return this.state.get().transitiontime;
  }

  set transitionTime(value) {
    this.state$.onNext({
      transitiontime: value
    });
  }

  get lights() {
    return {
      all: () => new Lights(getAllLights(this.connection$)),
      get: id => new Light(
        getLight(this.connection$, id),
        this.connection$
      )
    };
  }
}

function getLight(connection, id) {
  if (typeof id === 'string') {
    // When the id is a string, treat it as a match against a light's name.
    // Must fetch all lights to determine which matches (if any).
    return getAllLights(connection)
      .map(lights => {
        return Object.keys(lights)
          .filter(key => lights[key].name === id)
          .map(key => lights[key])
          .pop();
      });
  } else if (typeof id === 'number') {
    // As an int `id` is valid state, treat it as the initial state of the light
    // since certain operations only require `id` (e.g. PUTs). That way we're not
    // making unnecessary GET calls.
    return Rx.Observable
      .zip(
        connection.repeat(),
        Rx.Observable
          .just(state => Request
            .get(getUrl(state, `${ENDPOINTS.LIGHTS}/${id}`))
            .map(light => addLightId(light, id))
          )
          .startWith(() => { return Rx.Observable.just({ id }); }),
          ({state}, func) => func(state.get())
        )
        .flatMap(x => x);
  }
}

function getAllLights(connection) {
  return connection
    .flatMap(({state}) => {
      return Request
        .get(getUrl(state.get(), ENDPOINTS.LIGHTS))
        .map(data => mapValues(data, addLightId));
    });
}

function addLightId(light, id) {
  light.id = parseInt(id, 10);
  return light;
}
