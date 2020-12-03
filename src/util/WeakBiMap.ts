/**
 * A `WeakBiMap` is a `BiMap` with weakly referenced keys.
 */
export default class WeakBiMap<K extends Object, V> {
  private forward = new WeakMap<K, V>();
  private reverse = new Map<V, WeakRef<K>>();

  private finalizationRegistry = new FinalizationRegistry((value: V) =>
    this.reverse.delete(value)
  );

  set(key: K, value: V) {
    this.forward.set(key, value);
    this.reverse.set(value, new WeakRef(key));
    this.finalizationRegistry.register(key, value);
  }

  getValue(key: K) {
    return this.forward.get(key);
  }

  getKey(value: V): K | undefined {
    return this.reverse.get(value)?.deref();
  }
}
