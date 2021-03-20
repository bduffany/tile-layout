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
  getTodoList(id: string): TodoList | null;
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
    'TODOLIST#3': {
      title: 'Books to read',
      todos: [
        {
          id: 'TODO#4',
          content: 'Cook the Turkey',
        },
      ],
    },
    'TODOLIST#4': {
      title: 'Stuff to buy',
      todos: [
        {
          id: 'TODO#5',
          content: 'Waffles',
        },
      ],
    },
  };

  getTodoList(id: string): TodoList | null {
    return FakeTodosApi.data[id] || null;
  }
}

export const TodosApiContext = React.createContext<TodosApi>(
  new FakeTodosApi()
);
