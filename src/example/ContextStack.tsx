import React from 'react';

type ContextValues = Map<React.Context<any>, any>;

export type ContextStackProps = {
  contexts: React.ContextType<React.Context<any>>[];
  values?: ContextValues;
  render: (values: ContextValues) => React.ReactNode;
  i?: number;
};

export default function ContextStack({
  contexts,
  render,
  values = new Map(),
  i = 0,
}: ContextStackProps) {
  if (i >= contexts.length || 0) {
    return <>{render(values)}</>;
  }
  const Context = contexts[i];
  return (
    <Context.Consumer>
      {(value: any) => {
        values.set(Context, value);
        return (
          <ContextStack
            contexts={contexts}
            i={i + 1}
            values={values}
            render={render}
          />
        );
      }}
    </Context.Consumer>
  );
}
