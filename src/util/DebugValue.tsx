import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

export type DebugValueProps = JSX.IntrinsicElements['pre'] & {
  label: string;
  value: any;
};

const className = `DebugValue__${String(Math.random()).substring(2)}`;

function DebugPanel() {
  const [hidden, setHidden] = useState(
    localStorage['DebugValue__hidden'] === 'true'
  );
  const hide = useCallback(() => setHidden(true), [setHidden]);
  const show = useCallback(() => setHidden(false), [setHidden]);

  useEffect(() => {
    localStorage['DebugValue__hidden'] = String(hidden);
  }, [hidden]);

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        zIndex: 10000,
        maxHeight: '100%',
      }}
    >
      <div
        style={{
          overflowY: 'auto',
          display: hidden ? 'none' : 'initial',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 4,
            paddingBottom: 0,
            position: 'sticky',
            top: 0,
            zIndex: 1001,
          }}
        >
          <button
            onClick={hide}
            style={{
              height: 32,
              background: 'black',
              color: 'white',
              border: 'none',
              padding: 8,
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            Hide
          </button>
        </div>
        <div
          className={`${className}__children`}
          style={{ display: hidden ? 'none' : 'initial' }}
        ></div>
        <style>
          {`
        .${className} > div::-webkit-scrollbar {
          width: 4px;
        }

        .${className} > div::-webkit-scrollbar-track {
          background: transparent;
        }

        .${className} > div::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 2px;
        }

        .${className} button {
          outline: none;
          cursor: pointer;
          font-size: 12px;
          background: black;
          padding: 8px;
        }

        .${className} button:hover {
          background: rgba(0, 0, 0, 0.5);
        }
        `}
        </style>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          display: hidden ? 'initial' : 'none',
        }}
      >
        <button
          onClick={show}
          style={{
            color: 'white',
            border: 'none',
            borderRadius: 4,
            whiteSpace: 'nowrap',
          }}
        >
          Show debug panel
        </button>
      </div>
    </div>
  );
}

let panelContainer: Promise<HTMLDivElement> | null = null;

async function initDebugPanel() {
  if (!panelContainer) {
    panelContainer = (async () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      return new Promise<HTMLDivElement>((accept) =>
        ReactDOM.render(<DebugPanel />, root, () => {
          accept(root);
        })
      );
    })();
  }
  return (await panelContainer).querySelector(`.${className}__children`)!;
}

export default function DebugValue({ label, value, style }: DebugValueProps) {
  const container = useMemo(() => {
    const el = document.createElement('div');
    return el;
  }, []);

  useEffect(() => {
    let cancelled = false;
    initDebugPanel().then((panel) => {
      if (cancelled) return;
      panel.appendChild(container);
    });

    return () => {
      cancelled = true;
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
