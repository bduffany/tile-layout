import React from 'react';
import css from './App.module.css';
import { TileLayoutConfig } from './layout';
import TileLayout, { TabRenderers, TileRenderers } from './TileLayout';
import Todo, { TodoTab } from './todos/Todo';

window.React = React;

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

const layout: TileLayoutConfig = {
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

function App() {
  return (
    <div className={css.app}>
      <TileLayout
        tileRenderers={tileRenderers}
        tabRenderers={tabRenderers}
        layout={layout}
      />
    </div>
  );
}

export default App;
