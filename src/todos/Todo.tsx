import React, { useContext, useMemo } from 'react';
import { TodosApiContext } from './TodosApi';
import useAsync from '../util/useAsync';
import css from './Todo.module.css';
import { TileDragHandle } from '../TileLayout';

type TodoProps = {
  id: string;
};

export default function Todo({ id }: TodoProps) {
  const todosApi = useContext(TodosApiContext);

  const fetchTodo = useMemo(() => () => todosApi.getTodoList(id), [
    todosApi,
    id,
  ]);

  console.log(fetchTodo);

  const { pending: loading, value: todoList, error } = useAsync(fetchTodo);

  if (error) return <>Failed to load TODO list</>;
  if (loading || !todoList) return <>Loading TODOs...</>;

  return (
    <div className={css.todoListPane}>
      <TileDragHandle className={css.tileHeader}>
        {todoList!.title} <code>[{id}]</code>
      </TileDragHandle>
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
