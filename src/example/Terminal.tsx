import React from 'react';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './Terminal.module.css';
import HooksComponent, { eventListener } from './HooksComponent';
import XTerm from './XTerm';
import { TerminalApiContext } from './TerminalApi';
import Tab from './Tab';

const THEME = {
  background: '#282c34',
  black: '#2d3139',
  blue: '#528bff',
  green: '#98c379',
  yellow: '#e5c07b',
  cyan: '#56b6c2',
  magenta: '#c678dd',
  red: '#e06c75',
  white: '#d7dae0',
  brightBlack: '#7f848e',
  brightBlue: '#528bff',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightCyan: '#56b6c2',
  brightMagenta: '#7e0097',
  brightRed: '#f44747',
  brightWhite: '#d7dae0',
};

export const XTERM_OPTIONS = {
  cursorBlink: true,
  disableStdin: false,
  theme: THEME,
};

export type TerminalProps = {
  inputPipe?: any;
  outputPipe?: any;
};

export type TerminalHandle = {
  restart: () => void;
  kill: () => void;
};

export type TerminalState = {
  restartCount: number;
  isRunning: boolean;
};

export class Terminal extends HooksComponent<TerminalProps, TerminalState> {
  state = { restartCount: 0, isRunning: true };

  term = React.createRef<XTerm>();

  fitAddon: FitAddon | null = null;

  constructor(props: TerminalProps) {
    super(props);

    this.useEffect(
      eventListener(window, 'resize', this.onWindowResize.bind(this))
    );
    this.useEffect(() => this.loadFitAddon());
  }

  private onWindowResize() {
    this.fitAddon?.fit();
  }

  private loadFitAddon() {
    this.fitAddon = new FitAddon();
    const xterm = this.term.current!.terminal;
    xterm.loadAddon(this.fitAddon);
    this.fitAddon.fit();
  }

  render() {
    return <XTerm ref={this.term} options={XTERM_OPTIONS} />;
  }
}

export default function TerminalWrapper({ id }: { id: string }) {
  return <Terminal />;
}

export function TerminalTab({ id }: { id: string }) {
  const api = React.useContext(TerminalApiContext);
  const term = api.getTerminalState(id);
  if (!term) return null;
  return <Tab id={id}>{term.title}</Tab>;
}
