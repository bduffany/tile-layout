/**
 * Composes a list of event handlers, with the outermost handler coming first.
 *
 * For convenience, null or undefined handlers will be skipped.
 *
 * If an inner handler returns false, outer handlers will not be invoked.
 */
export function composeEventHandlers<T = Element, E extends Event = Event>(
  ...handlers: (
    | React.EventHandler<React.SyntheticEvent<T, E>>
    | undefined
    | null
  )[]
): React.EventHandler<React.SyntheticEvent<T, E>> {
  const chain = handlers.filter(Boolean).reverse() as React.EventHandler<
    React.SyntheticEvent<T, E>
  >[];
  return (e) => {
    for (const handler of chain) {
      const value = handler(e) as any;
      if (value === false) return;
    }
  };
}

export function classNames(
  ...values: (string | boolean | number | undefined | null)[]
) {
  return values.filter(Boolean).join(' ');
}
