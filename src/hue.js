import * as Rx from 'rx';
import {Request}    from './request';
import {Light}      from './light';
import {Lights}     from './lights';
import {mapValues}  from 'lodash-es';
import {TRANSITION_NONE, ENDPOINTS} from './constants';

const DEFAULT_OPTIONS = {
  transitionTime: TRANSITION_NONE
};

export class Hue {
  constructor(connection) {
    this.connection = connection;
    this.options = DEFAULT_OPTIONS;
  }

  get transitionTime() {
    return this.options.transitionTime;
  }

  set transitionTime(value) {
    return this.options.transitionTime = value;
  }

  get lights() {
    return {
      all: () => new Lights(getAllLights(this.connection)),
      get: id => new Light(getLight(this.connection, id), this.connection, this.options)
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
          .just(getUrl => Request
            .get(getUrl(`${ENDPOINTS.LIGHTS}/${id}`))
            .map(light => addLightId(light, id))
          )
          .startWith(() => { return Rx.Observable.just({ id }); }),
          (getUrl, func) => func(getUrl)
        )
        .flatMap(x => x);
  }
}

function getAllLights(connection) {
  return connection
    .flatMap(getUrl => {
      return Request
        .get(getUrl(ENDPOINTS.LIGHTS))
        .map(data => mapValues(data, addLightId));
    });
}

function addLightId(light, id) {
  light.id = parseInt(id, 10);
  return light;
}
