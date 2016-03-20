import {pick}       from 'lodash-es';
import {Request}    from '../request';
import {getUrl}     from '../selectors/selectors';
import {ENDPOINTS}  from '../constants';

export class Light {
  constructor(source, connection) {
    this.source = source;
    this.connection = connection;
  }

  get value() {
    return this.source.last();
  }

  name(value) {
    if (value) {
      return this.put((state, id) => {
        return Request
          .put(getUrl(state, `${ENDPOINTS.LIGHTS}/${id}`), {
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
    return this.put((state, id) =>
      Request
        .put(
          getUrl(state, `${ENDPOINTS.LIGHTS}/${id}/state`),
          Object.assign({}, options, pick(state, 'transitiontime'))
        )
        .map(data => data.reduce((light, result) => {
          let obj = result['success'];
          let attribute = Object.keys(obj)[0];
          let value = obj[attribute];

          light[attribute.slice(attribute.lastIndexOf('/') + 1)] = value;
          light.id = id;
          return light;
        }, {}))
    );
  }

  put(request) {
    return this.source
      .take(1) // There could be an initializer value in source, saving a GET.
      .flatMap(light =>
        this.connection.flatMap(
          ({state}) => request(state.get(), light.id)
        )
      );
  }
}
