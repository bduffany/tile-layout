import React, { useCallback } from 'react';
import { ActiveTabState, TileLayoutConfig } from '../layout';
import TileLayout, {
  ITabStrip,
  TabContentComponents,
  TileContentComponents,
} from '../TileLayout';
import { useJsonLocalStorage } from '../util/useLocalStorage';
import uuid from '../util/uuid';
import css from './App.module.css';
import Editor, { EditorTab } from './Editor';
import { EditorApiContext } from './EditorApi';
import SketchPad, { SketchPadTab } from './SketchPad';
import FileTree, { FileTreeTab } from './FileTree';
import Terminal, { TerminalTab } from './Terminal';
import Todo, { TodoTab } from './Todo';

window.React = React;

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    localStorage['layout'] = '';
    localStorage['activeTabState'] = '';
    localStorage['FakeEditorData'] = '';
    window.location.reload();
  }
});

// TODO: consider consolidating tileRenderers & tabRenderers.
// Maybe specify "Tab" as a static prop of the tile?
const tileComponents: TileContentComponents = {
  Todo,
  Editor,
  Terminal,
  FileTree,
  SketchPad,
};

const tabComponents: TabContentComponents = {
  Todo: TodoTab,
  Editor: EditorTab,
  Terminal: TerminalTab,
  FileTree: FileTreeTab,
  SketchPad: SketchPadTab,
};

const exampleLayout: TileLayoutConfig = {
  direction: 'row',
  items: [
    // Sidebar
    {
      weight: 1,
      direction: 'vertical',
      tabs: [
        {
          type: 'FileTree',
          id: '1',
        },
        {
          type: 'Todo',
          id: 'TODOLIST#4',
        },
      ],
    },
    // Main content
    {
      weight: 3.5,
      direction: 'column',
      items: [
        {
          direction: 'row',
          items: [
            {
              tabs: [
                { id: 'EDITOR#1', type: 'Editor' },
                { id: 'TODOLIST#1', type: 'Todo' },
                { id: 'TODOLIST#3', type: 'Todo' },
              ],
            },
            {
              tabs: [
                { id: 'SKETCHPAD#1', type: 'SketchPad' },
                { id: 'TODOLIST#2', type: 'Todo' },
              ],
            },
          ],
        },
        {
          tabs: [{ id: 'TERMINAL#1', type: 'Terminal' }],
        },
      ],
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

  const editorApi = React.useContext(EditorApiContext);

  const onDoubleClickTabStrip = useCallback(
    (tabStrip: ITabStrip) => {
      const id = uuid();
      editorApi.addEditor(id, { title: 'Untitled', language: '', value: '' });
      tabStrip.append({
        id,
        type: 'Editor',
      });
    },
    [editorApi]
  );

  return (
    <div className={css.app}>
      <TileLayout
        tileComponents={tileComponents}
        tabComponents={tabComponents}
        onDoubleClickTabStrip={onDoubleClickTabStrip}
        layout={layout}
        onLayoutChange={onLayoutChange}
        activeTabState={activeTabState}
        onActiveTabStateChange={onActiveTabStateChange}
      />
    </div>
  );
}

export default App;
