import React, { useCallback, useContext, useMemo, useState } from 'react';
import { TabContext } from '../TileLayout';
import useAsync from '../util/useAsync';
import css from './Todo.module.css';
import { TodosApiContext } from './TodosApi';

type TodoProps = {
  id: string;
};

// TODO: Encapsulate tab and content into a class
// so data doesn't need to be fetched twice for each
// content ID.

const useRenderCount = function () {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return renderCount.current;
};

export default function Todo({ id }: TodoProps) {
  // TODO: Make this async
  const todosApi = useContext(TodosApiContext);
  const todoList = todosApi.getTodoList(id)!;

  const renderCount = useRenderCount();
  const [numClicks, setNumClicks] = useState(0);

  const onButtonClick = useCallback(() => setNumClicks((n) => n + 1), [
    setNumClicks,
  ]);

  const [value, setValue] = useState('Editable text');
  const onChange = useCallback((e) => setValue(e.target.value), [setValue]);

  return (
    <div className={css.todoListPane}>
      <div className={css.tileContent}>
        <ul>
          {todoList!.todos.map(({ id, content }) => (
            <li key={id}>{content}</li>
          ))}
        </ul>
        <div style={{ fontSize: 12 }}>Rendered {renderCount} times.</div>
        <button onClick={onButtonClick}>Clicked {numClicks} times.</button>
        <input value={value} onChange={onChange}></input>
      </div>
    </div>
  );
}

type TodoTabProps = { id: string };

export function TodoTab({ id }: TodoTabProps) {
  // TODO: Make this async
  const todosApi = useContext(TodosApiContext);
  const todoList = todosApi.getTodoList(id)!;

  return <div className={css.todoTab}>{todoList.title}</div>;
}
