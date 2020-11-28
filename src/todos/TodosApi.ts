import React from 'react';

type Todo = {
  id: string;
  content: string;
};

type TodoList = {
  title: string;
  todos: Todo[];
};

export default interface TodosApi {
  getTodoList(id: string): Promise<TodoList | null>;
}

export class FakeTodosApi implements TodosApi {
  private static data: Record<string, TodoList> = {
    'TODOLIST#1': {
      title: 'TODOs for Saturday',
      todos: [
        {
          id: 'TODO#1',
          content: 'Do thing',
        },
        {
          id: 'TODO#2',
          content: 'Do another thing',
        },
      ],
    },
    'TODOLIST#2': {
      title: 'TODOs for Sunday',
      todos: [
        {
          id: 'TODO#3',
          content: 'Take out the trash',
        },
      ],
    },
  };

  async getTodoList(id: string): Promise<TodoList | null> {
    console.log(`getTodoList("${id}}")`);
    return FakeTodosApi.data[id] || null;
  }
}

export const TodosApiContext = React.createContext<TodosApi>(
  new FakeTodosApi()
);
