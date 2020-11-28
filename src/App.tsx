import React from 'react';
import css from './App.module.css';
import { TileLayoutConfig } from './layout';
import TileLayout, { TileRenderers } from './TileLayout';
import Todo from './todos/Todo';

window.React = React;

// TODO: consider using the plugin pattern for this instead, or
// make sure it works with `React.lazy`
const tileRenderers: TileRenderers = {
  todo: (id: string) => {
    return <Todo id={id as string} />;
  },
};

const layout: TileLayoutConfig = {
  direction: 'row',
  gap: 1,
  items: [
    {
      id: 'TODOLIST#1',
      type: 'todo',
    },
    {
      id: 'TODOLIST#2',
      type: 'todo',
    },
  ],
};

function App() {
  return (
    <div className={css.app}>
      <TileLayout renderers={tileRenderers} layout={layout} />
    </div>
  );
}

export default App;
