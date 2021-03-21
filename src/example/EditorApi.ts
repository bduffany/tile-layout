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
  static data: Record<string, EditorState> = {
    'EDITOR#1': {
      title: 'library.ts',
      language: 'typescript',
      value: `export default function BubbleSort() {
  // TODO
}
`,
    },
  };

  static loadData() {
    if (localStorage['FakeEditorData']) {
      FakeEditorApi.data = JSON.parse(localStorage['FakeEditorData']);
    }
  }

  static saveData() {
    localStorage['FakeEditorData'] = JSON.stringify(FakeEditorApi.data);
  }

  addEditor(id: string, state: EditorState) {
    FakeEditorApi.data[id] = state;
    FakeEditorApi.saveData();
  }

  getEditorState(id: string) {
    return FakeEditorApi.data[id];
  }

  setDirty(id: string, dirty: boolean = true) {
    FakeEditorApi.data[id].dirty = dirty;
    FakeEditorApi.saveData();
  }
}

FakeEditorApi.loadData();

export const EditorApiContext = React.createContext<IEditorApi>(
  new FakeEditorApi()
);
