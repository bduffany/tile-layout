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
      title: 'sort.ts',
      language: 'typescript',
      value: `export function bubbleSort<T>(array: T[]) {
  for (let i = array.length - 1; i > 1; i--) {
    bubbleUpTo(i, array);
  }
}

function bubbleUpTo<T>(index: number, array: T[]) {
  for (let i = 0; i < index; i++) {
    const left = array[i], right = array[i + 1];
    if (left > right) {
      array[i] = right;
      array[i + 1] = left;
    }
  }
}

const array = [2, 3, 1, 5, 4, 4];
bubbleSort(array);
console.log(array);
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
