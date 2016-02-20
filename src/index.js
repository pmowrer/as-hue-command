import 'rx';
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

class Hue {
  constructor() {
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
      all: () => new Lights(getAllLights()),
      get: id => new Light(getLight(id), this.options)
    };
  }
}

const hue = new Hue();
export default hue;

function getLight(id) {
  if (typeof id === 'string') {
    return hue.lights.all().value.map(lights => {
      return Object.keys(lights)
      .filter(key => lights[key].name === id)
      .map(key => lights[key])
      .pop();
    });
  } else {
    return Request
      .get(`${ENDPOINTS.LIGHTS}/${id}`)
      .map(light => addLightId(light, id))
      .startWith({
        id
      });
  }
}

function getAllLights() {
  return Request
    .get(ENDPOINTS.LIGHTS)
    .map(data => mapValues(data, addLightId));
}

function addLightId(light, id) {
  light.id = parseInt(id, 10);
  return light;
}
