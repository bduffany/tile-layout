import uuid from './uuid';

export default function namespace(name: string) {
  const id = uuid();
  return {
    name(value: string): string {
      return `${name}_${value}__${id}`;
    },
  };
}
