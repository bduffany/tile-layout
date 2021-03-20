import { EditorApiContext } from './EditorApi';
import React, { useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import Tab from './Tab';
import OneMonokai from './OneMonokai.json';
import css from './Editor.module.css';
import { TileLayoutContext } from '../TileLayout';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export default function Editor({ id }: { id: string }) {
  const [
    editor,
    setEditor,
  ] = React.useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const api = React.useContext(EditorApiContext);
  const layout = React.useContext(TileLayoutContext);

  const state = api.getEditorState(id);

  const onMount = useCallback(
    (editor, monaco) => {
      monaco.editor.defineTheme('OneMonokai', OneMonokai);
      monaco.editor.setTheme('OneMonokai');
      setEditor(editor);
    },
    [setEditor]
  );

  React.useEffect(() => {
    if (editor) {
      const disposable = editor.getModel()!.onDidChangeContent(() => {
        if (state && !state.dirty) {
          api.setDirty(id);
          layout.updateTab('Editor', id);
        }
      });
      return () => disposable.dispose();
    }
  }, [editor, state, api, id, layout]);

  if (!state) return <div></div>;

  return (
    <div
      className={`${css.editor} ${
        editor ? css.editorVisible : css.editorLoading
      }`}
      style={{ height: 'inherit' }}
    >
      <MonacoEditor
        onMount={onMount}
        language={state.language}
        value={state.value}
        options={{
          smoothScrolling: true,
          minimap: { enabled: false },
          contextmenu: localStorage['disable_monaco_context_menu'] !== 'true',
        }}
      />
    </div>
  );
}

export function EditorTab({ id }: { id: string }) {
  const api = React.useContext(EditorApiContext);
  const editor = api.getEditorState(id);
  if (!editor) return null;

  return (
    <Tab id={id} dirty={editor.dirty}>
      {editor.title}
    </Tab>
  );
}
