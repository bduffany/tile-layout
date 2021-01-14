import React from 'react';
import css from './App.module.css';
import { ActiveTabState, TileLayoutConfig } from './layout';
import TileLayout, { TabRenderers, TileRenderers } from './TileLayout';
import Todo, { TodoTab } from './todos/Todo';
import { useJsonLocalStorage } from './util/useLocalStorage';

window.React = React;

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    localStorage['layout'] = '';
    localStorage['activeTabState'] = '';
    window.location.reload();
  }
});

// TODO: consider using the plugin pattern for this instead, or
// make sure it works with `React.lazy`
// TODO: consider consolidating tileRenderers & tabRenderers.
const tileRenderers: TileRenderers = {
  todo: (id: string) => {
    return <Todo id={id as string} />;
  },
};

const tabRenderers: TabRenderers = {
  todo: (id: string) => {
    return <TodoTab id={id as string} />;
  },
};

const exampleLayout: TileLayoutConfig = {
  direction: 'row',
  gap: 1,
  items: [
    {
      id: '17b982a7-fa9c-4706-8147-2fd719d7367a',
      type: 'todo',
      tabs: [
        { id: 'TODOLIST#1', type: 'todo' },
        { id: 'TODOLIST#3', type: 'todo' },
        { id: 'TODOLIST#4', type: 'todo' },
      ],
    },
    {
      id: '7a6733bf-a917-4c99-91b7-7892b71156a9',
      type: 'todo',
      tabs: [{ id: 'TODOLIST#2', type: 'todo' }],
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
        tileRenderers={tileRenderers}
        tabRenderers={tabRenderers}
        layout={layout}
        onLayoutChange={onLayoutChange}
        activeTabState={activeTabState}
        onActiveTabStateChange={onActiveTabStateChange}
      />
    </div>
  );
}

export default App;
