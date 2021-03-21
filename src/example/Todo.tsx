import React from 'react';
import Tab from './Tab';
import css from './Todo.module.css';
import { TodosApiContext } from './TodosApi';
import {
  TileContentComponentProps,
  TabContentComponentProps,
} from '../TileLayout';
import { ReactComponent as CheckSquare } from './check-square.svg';

// TODO: Encapsulate tab and content into a class
// so data doesn't need to be fetched twice for each
// content ID.

export default function Todo({ id }: TileContentComponentProps) {
  // TODO: Make this async
  const todosApi = React.useContext(TodosApiContext);
  const todoList = todosApi.getTodoList(id)!;

  return (
    <div className={css.todoListPane}>
      <div className={css.tileContent}>
        <div className={css.todoListTitle}>To-do List</div>
        <ul className={css.todoList}>
          {todoList!.todos.map(({ id, content }) => (
            <li className={css.todoItem} key={id}>
              {content}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TodoTab({ id, direction }: TabContentComponentProps) {
  // TODO: Make this async
  const todosApi = React.useContext(TodosApiContext);
  const todoList = todosApi.getTodoList(id)!;

  return (
    <Tab id={id} direction={direction}>
      {direction === 'horizontal' ? (
        todoList.title
      ) : (
        <CheckSquare stroke="white" />
      )}
    </Tab>
  );
}
