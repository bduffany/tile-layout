interface IWeakBiMap<K extends Object, V> extends WeakMap<K, V> {
  inverse(): IWeakBiMap<V, K>;
}

/**
 * A `WeakBiMap` is a `BiMap` with weakly referenced keys.
 */
export default class WeakBiMap<K extends Object, V>
  implements IWeakBiMap<K, V> {
  private forward = new WeakMap<K, V>();
  private reverse = new Map<V, WeakRef<K>>();
  private inverseView: IWeakBiMap<V, K> | null = null;

  private finalizationRegistry = new FinalizationRegistry((value: V) =>
    this.reverse.delete(value)
  );

  inverse(): IWeakBiMap<V, K> {
    return (this.inverseView =
      this.inverseView || new InverseWeakBiMapView<V, K>(this, this.reverse));
  }

  get(key: K): V | undefined {
    return this.forward.get(key);
  }

  set(key: K, value: V) {
    this.forward.set(key, value);
    this.reverse.set(value, new WeakRef(key));
    this.finalizationRegistry.register(key, value);
    return this;
  }

  has(key: K): boolean {
    return this.forward.has(key);
  }

  delete(key: K): boolean {
    if (!this.forward.has(key)) return false;

    const value = this.forward.get(key)!;
    this.forward.delete(key);
    this.reverse.delete(value);
    return true;
  }

  get [Symbol.toStringTag]() {
    return 'WeakBiMap';
  }
}

class InverseWeakBiMapView<V, K extends Object> implements IWeakBiMap<V, K> {
  constructor(
    private original: WeakBiMap<K, V>,
    private map: Map<V, WeakRef<K>>
  ) {}

  inverse() {
    return this.original;
  }

  get(value: V): K | undefined {
    return this.map.get(value)?.deref();
  }

  set(value: V, key: K) {
    this.original.set(key, value);
    return this;
  }

  has(value: V) {
    return this.map.has(value);
  }

  delete(value: V): boolean {
    return this.original.delete(this.get(value)!);
  }

  get [Symbol.toStringTag]() {
    return 'InverseWeakBiMapView';
  }
}
