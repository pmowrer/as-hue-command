import {Request}    from './request';
import {Light}      from './light';
import {Lights}     from './lights';
import {mapValues}  from 'lodash-es';

import {TRANSITION_NONE} from './constants';

const ENDPOINTS = {
  LIGHTS: '/api/as-hue-command/lights'
};

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
    return getAllLights(connection)
      .map(lights => {
        return Object.keys(lights)
          .filter(key => lights[key].name === id)
          .map(key => lights[key])
          .pop();
      });
  } else {
    return connection
      .flatMap(ip => {
        return Request
          .get(`http://${ip}${ENDPOINTS.LIGHTS}/${id}`)
          .map(light => addLightId(light, id))
          .startWith({
            id
          });
      });
  }
}

function getAllLights(connection) {
  return connection
    .flatMap(ip => {
      return Request
        .get(`http://${ip}${ENDPOINTS.LIGHTS}`)
        .map(data => mapValues(data, addLightId));
    });
}

function addLightId(light, id) {
  light.id = parseInt(id, 10);
  return light;
}
