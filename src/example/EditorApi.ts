import React from 'react';

type EditorState = {
  title: string;
  language: string;
  value: string;
  dirty?: boolean;
};

export default interface IEditorApi {
  addEditor(id: string, state: EditorState): void;
  getEditorState(id: string): EditorState | null;
  setDirty(id: string, dirty?: boolean): void;
}

export class FakeEditorApi implements IEditorApi {
  private static data: Record<string, EditorState> = {
    'EDITOR#1': {
      title: 'library.ts',
      language: 'typescript',
      value: `export default function BubbleSort() {
  // TODO
}
`,
    },
  };

  addEditor(id: string, state: EditorState) {
    FakeEditorApi.data[id] = state;
  }

  getEditorState(id: string) {
    return FakeEditorApi.data[id];
  }

  setDirty(id: string, dirty: boolean = true) {
    FakeEditorApi.data[id].dirty = dirty;
  }
}

export const EditorApiContext = React.createContext<IEditorApi>(
  new FakeEditorApi()
);
