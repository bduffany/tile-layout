import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

export type DebugValueProps = JSX.IntrinsicElements['pre'] & {
  label: string;
  value: any;
};

const panelContainer: HTMLDivElement = document.createElement('div');

(function initDebugPanel() {
  Object.assign(panelContainer.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    zIndex: '1000',
  });
  document.body.appendChild(panelContainer);
})();

export default function DebugValue({ label, value, style }: DebugValueProps) {
  const container = useMemo(() => {
    const el = document.createElement('div');
    panelContainer.appendChild(el);
    return el;
  }, []);

  useEffect(() => {
    return () => {
      container.remove();
    };
  }, [container]);

  return ReactDOM.createPortal(
    <pre
      style={{
        marginTop: 8,
        padding: 8,
        fontSize: 12,
        background: 'black',
        color: 'white',
        margin: 4,
        borderRadius: 4,
        opacity: 0.8,
        backdropFilter: 'blur(10px)',
        ...style,
      }}
    >
      <b>{label}:</b> {JSON.stringify(value, null, 2)}
    </pre>,
    container
  );
}
