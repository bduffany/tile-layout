import React from 'react';

type EditorState = {
  title: string;
  language: string;
  value: string;
};

export default interface IEditorApi {
  getEditorState(id: string): EditorState | null;
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

  getEditorState(id: string) {
    return FakeEditorApi.data[id];
  }
}

export const EditorApiContext = React.createContext<IEditorApi>(
  new FakeEditorApi()
);
