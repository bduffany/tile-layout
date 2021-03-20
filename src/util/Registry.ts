export default interface IRegistry<IdType, ValueType> {
  register(id: IdType, value: ValueType): void;
  unregister(id: IdType): void;
}
