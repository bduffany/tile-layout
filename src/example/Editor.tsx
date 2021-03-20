import { EditorApiContext } from './EditorApi';
import React, { useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import Tab from './Tab';
import OneMonokai from './OneMonokai.json';
import css from './Editor.module.css';

export default function Editor({ id }: { id: string }) {
  const [visible, setVisible] = React.useState(false);
  const api = React.useContext(EditorApiContext);

  const state = api.getEditorState(id);

  const onMount = useCallback(
    (editor, monaco) => {
      monaco.editor.defineTheme('OneMonokai', OneMonokai);
      monaco.editor.setTheme('OneMonokai');
      setVisible(true);
    },
    [setVisible]
  );

  if (!state) return <div></div>;

  return (
    <div
      className={`${css.editor} ${
        visible ? css.editorVisible : css.editorLoading
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

  return <Tab id={id}>{editor.title}</Tab>;
}
