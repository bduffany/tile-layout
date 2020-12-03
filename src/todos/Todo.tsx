import React, { useContext, useMemo } from 'react';
import useAsync from '../util/useAsync';
import css from './Todo.module.css';
import { TodosApiContext } from './TodosApi';

type TodoProps = {
  id: string;
};

export default function Todo({ id }: TodoProps) {
  const todosApi = useContext(TodosApiContext);

  const fetchTodo = useMemo(() => () => todosApi.getTodoList(id), [
    todosApi,
    id,
  ]);

  const { pending: loading, value: todoList, error } = useAsync(fetchTodo);

  if (error) throw error;
  if (loading || !todoList) return <>Loading TODOs...</>;

  return (
    <div className={css.todoListPane}>
      <div className={css.tileContent}>
        <ul>
          {todoList!.todos.map(({ id, content }) => (
            <li key={id}>{content}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type TodoTabProps = { id: string };

export function TodoTab({ id }: TodoTabProps) {
  const todosApi = useContext(TodosApiContext);

  const fetchTodo = useMemo(() => () => todosApi.getTodoList(id), [
    todosApi,
    id,
  ]);

  const { pending: loading, value: todoList, error } = useAsync(fetchTodo);

  if (error) throw error;
  if (loading || !todoList) return <>...</>;

  return <div className={css.todoTab}>{todoList.title}</div>;
}
