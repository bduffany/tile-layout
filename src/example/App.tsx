import React from 'react';
import css from './App.module.css';
import { ActiveTabState, TileLayoutConfig } from '../layout';
import TileLayout, {
  TabContentComponents,
  TileContentComponents,
} from '../TileLayout';
import Todo, { TodoTab } from './Todo';
import { useJsonLocalStorage } from '../util/useLocalStorage';
import Editor, { EditorTab } from './Editor';
import Terminal, { TerminalTab } from './Terminal';

window.React = React;

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    localStorage['layout'] = '';
    localStorage['activeTabState'] = '';
    window.location.reload();
  }
});

// TODO: consider consolidating tileRenderers & tabRenderers.
const tileRenderers: TileContentComponents = {
  Todo,
  Editor,
  Terminal,
};

const tabRenderers: TabContentComponents = {
  Todo: TodoTab,
  Editor: EditorTab,
  Terminal: TerminalTab,
};

const exampleLayout: TileLayoutConfig = {
  direction: 'column',
  items: [
    {
      direction: 'row',
      items: [
        {
          id: '17b982a7-fa9c-4706-8147-2fd719d7367a',
          tabs: [
            { id: 'EDITOR#1', type: 'Editor' },
            { id: 'TODOLIST#1', type: 'Todo' },
            { id: 'TODOLIST#3', type: 'Todo' },
            { id: 'TODOLIST#4', type: 'Todo' },
          ],
        },
        {
          id: '7a6733bf-a917-4c99-91b7-7892b71156a9',
          tabs: [{ id: 'TODOLIST#2', type: 'Todo' }],
        },
      ],
    },
    {
      id: '9dd7271b-4ad9-47b5-a376-03ac5d902416',
      tabs: [{ id: 'TERMINAL#1', type: 'Terminal' }],
    },
  ],
};

const EXAMPLE_LAYOUT_JSON = JSON.stringify(exampleLayout);

function App() {
  const [layout, onLayoutChange] = useJsonLocalStorage<TileLayoutConfig | null>(
    'layout',
    EXAMPLE_LAYOUT_JSON
  );
  const [
    activeTabState,
    onActiveTabStateChange,
  ] = useJsonLocalStorage<ActiveTabState>('activeTabState', '{}');

  return (
    <div className={css.app}>
      <TileLayout
        tileComponents={tileRenderers}
        tabComponents={tabRenderers}
        layout={layout}
        onLayoutChange={onLayoutChange}
        activeTabState={activeTabState}
        onActiveTabStateChange={onActiveTabStateChange}
      />
    </div>
  );
}

export default App;
