import {Request} from './request';
import {TRANSITION_DEFAULT} from './constants';

const ENDPOINTS = {
  LIGHTS: '/api/as-hue-command/lights'
};

export class Light {
  constructor(source, options) {
    this.options = options;
    this.source = source;
  }

  get value() {
    return this.source.last();
  }

  name(value) {
    if (value) {
      return this.source
        .take(1)
        .map(light => light.id)
        .flatMap(id => {
          return Request
            .put(`${ENDPOINTS.LIGHTS}/${id}`, {
              name: value
            })
            // Give back value since Api doesn't respond w/ anything.
            .map(() => value);
        });
    } else {
      return this.value.map(light => light.name);
    }
  }

  brightness(value) {
    if (value) {
      return this.state({ bri: value })
        .map(response => response.bri);
    } else {
      return this.value.map(light => light.state.bri);
    }
  }

  get isOn() {
    return this.value.map(light => light.state.on);
  }

  on() {
    return this.toggle(true);
  }

  off() {
    return this.toggle(false);
  }

  toggle(bool) {
    return this.state({
      on: bool
    })
    .map(response => response.on);
  }

  state(options) {
    if (this.options.transitionTime !== TRANSITION_DEFAULT) {
      options.transitiontime = this.options.transitionTime;
    }

    return this.source
      .take(1)
      .map(light => light.id)
      .flatMap(id => {
        return Request
          .put(`${ENDPOINTS.LIGHTS}/${id}/state`, options)
          .map(data => data.reduce((light, result) => {
            let obj = result['success'];
            let attribute = Object.keys(obj)[0];
            let value = obj[attribute];

            light[attribute.slice(attribute.lastIndexOf('/') + 1)] = value;
            light.id = id;
            return light;
          }, {}));
      });
  }
}

export default Light;
