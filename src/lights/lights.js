import {map} from 'lodash-es';

export class Lights {
  constructor(source) {
    this.source = source;
  }

  get value() {
    return this.source;
  }

  names() {
    return this.source.map(result => map(result, 'name'));
  }
}
