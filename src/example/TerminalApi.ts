import React from 'react';

type TerminalState = {
  title: string;
};

export default interface ITerminalApi {
  getTerminalState(id: string): TerminalState | null;
}

export class FakeTerminalApi implements ITerminalApi {
  private static data: Record<string, TerminalState> = {
    'TERMINAL#1': {
      title: 'Bash',
    },
  };

  getTerminalState(id: string) {
    return FakeTerminalApi.data[id];
  }
}

export const TerminalApiContext = React.createContext<ITerminalApi>(
  new FakeTerminalApi()
);
