import React from 'react';
import { TabContentComponentProps } from '../TileLayout';
import Tab from './Tab';

const useRenderCount = function () {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return renderCount.current;
};

export default function RenderTest() {
  const renderCount = useRenderCount();
  const [numClicks, setNumClicks] = React.useState(0);

  const onButtonClick = React.useCallback(() => setNumClicks((n) => n + 1), [
    setNumClicks,
  ]);

  const [value, setValue] = React.useState('Editable text');
  const onChange = React.useCallback((e) => setValue(e.target.value), [
    setValue,
  ]);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 12 }}>Rendered {renderCount} times.</div>
      <button onClick={onButtonClick}>Clicked {numClicks} times.</button>
      <input value={value} onChange={onChange}></input>
    </div>
  );
}

export function RenderTestTab({ id }: TabContentComponentProps) {
  return <Tab id={id}>Render test</Tab>;
}
