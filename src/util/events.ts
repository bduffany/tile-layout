export function customEventFactory(type: string) {
  const factory = () => new CustomEvent(type, { bubbles: true });
  factory.type = type;
  return factory;
}
