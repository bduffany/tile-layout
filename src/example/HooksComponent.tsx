import React from 'react';
import ContextStack from './ContextStack';

export type DisposeFn = () => any;
export type EffectPredicate<P, S> = (prevProps: P, prevState: S) => boolean;
export type Effect<P = {}, S = {}> =
  | ((prevProps: P | null, prevState: S | null) => DisposeFn | void | undefined)
  | ((prevProps: P | null) => DisposeFn | void | undefined)
  | (() => DisposeFn | void | undefined);

type EffectEntry<P, S> = {
  effect: Effect<P, S>;
  predicate?: EffectPredicate<P, S>;
  dispose?: DisposeFn | undefined;
};

/**
 * Component base class that exposes similar functionality offered by React hooks.
 */
export default abstract class HooksComponent<
  P = {},
  S = {},
  SS = {}
> extends React.Component<P, S, SS> {
  contexts: React.ContextType<React.Context<any>>[] = [];

  private effectEntries: EffectEntry<P, S>[] = [];
  private contextValues: Map<React.Context<any>, any> = new Map();
  private originalRender: () => React.ReactNode;

  constructor(props: P) {
    super(props);

    this.originalRender = this.render;

    // On first render, check whether contexts are requested.
    this.render = () => {
      if (!this.contexts?.length) {
        return (this.render = this.originalRender.bind(this))();
      }
      return (this.render = this.renderWithContextStack.bind(this))();
    };
  }

  private renderWithContextStack() {
    return (
      <ContextStack
        contexts={this.contexts}
        render={(values: Map<React.Context<any>, any>) => {
          this.contextValues = values;
          return this.originalRender();
        }}
      />
    );
  }

  useEffect(effect: Effect<P, S>, predicate?: EffectPredicate<P, S>) {
    this.effectEntries.push({ effect, predicate });
  }

  contextValue<T>(context: React.Context<T>): T {
    return this.contextValues.get(context);
  }

  componentDidMount() {
    for (const entry of this.effectEntries) {
      entry.dispose = entry.effect(null, null) as DisposeFn | undefined;
    }
  }

  componentDidUpdate(prevProps: P, prevState: S) {
    for (const entry of this.effectEntries) {
      if (entry.predicate && entry.predicate(prevProps, prevState)) {
        if (entry.dispose) entry.dispose();
        entry.dispose = entry.effect(prevProps, prevState) as
          | DisposeFn
          | undefined;
      }
    }
  }

  componentWillUnmount() {
    for (const entry of this.effectEntries) {
      if (entry.dispose) {
        entry.dispose();
      }
    }
  }
}

export const eventListener = (
  object: any,
  event: string,
  callback: Function
) => () => {
  object.addEventListener(event, callback);

  return () => {
    console.log(`Removing ${event} event listener.`);
    object.removeEventListener(event, callback);
  };
};
