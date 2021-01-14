import uuid from './uuid';

type Factory<T> = (name: string) => T;

export type Namespace = {
  name(value: string): string;
  wrap<T>(factory: Factory<T>): Factory<T>;
};

/**
 * A namespace allows generating global names that won't conflict with
 * any other globals.
 *
 * ## Usage
 *
 * ```ts
 * // Create a namespace
 * const ns = namespace('events');
 *
 * // Generate names directly...
 * const TWIST_EVENT_NAME = ns.name('twist'); // returns "events_twist__85bxkif"
 *
 * // ...or wrap a function to transform name inputs
 * const defineEvent = ns((name: string) => new CustomEvent(name, {bubbles: true}));
 * const bop = defineEvent('bop');
 * element.dispatchEvent(bop()); // Dispatches `new CustomEvent("events_bop__85bxkif")`
 * ```
 */
export default function namespace(prefix?: string): Namespace {
  const suffix = `_${uuid()}`;
  prefix = prefix ? `${prefix}_` : '';
  return {
    wrap<T>(factory: Factory<T>): Factory<T> {
      return (value: string) => {
        return factory(this.name(value));
      };
    },
    name(value: string): string {
      return `${prefix}${value}${suffix}`;
    },
  };
}
