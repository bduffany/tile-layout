import React from 'react';

type EditorState = {
  title: string;
  language: string;
  value: string;
  dirty: boolean;
};

export default interface IEditorApi {
  getEditorState(id: string): EditorState | null;
  setDirty(id: string, dirty?: boolean): void;
}

export class FakeEditorApi implements IEditorApi {
  private static data: Record<string, EditorState> = {
    'EDITOR#1': {
      title: 'library.ts',
      language: 'typescript',
      dirty: false,
      value: `export default function BubbleSort() {
  // TODO
}
`,
    },
  };

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
