import namespace from './util/namespace';

const { name } = namespace('events');

const eventFactory = (type: string) => {
  const namespacedType = name(type);
  const factory = () => new CustomEvent(namespacedType, { bubbles: true });
  factory.type = namespacedType;
  return factory;
};

export const dragBorderEnd = eventFactory('dragBorderEnd');
export const dragBorderStart = eventFactory('dragBorderStart');
export const dragBorder = eventFactory('dragBorder');
