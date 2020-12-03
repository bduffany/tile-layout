import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';

export type DebugValueProps = JSX.IntrinsicElements['pre'] & {
  label: string;
  value: any;
};

const className = `DebugValue__${Math.floor(Math.random() * Math.pow(10, 16))}`;

function DebugPanel() {
  const [hidden, setHidden] = useState(false);
  const hide = useCallback(() => setHidden(true), [setHidden]);
  const show = useCallback(() => setHidden(false), [setHidden]);

  return (
    <div className={className}>
      <div
        style={{
          position: 'fixed',
          right: 0,
          bottom: 0,
          maxHeight: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
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
            height: 32,
            background: 'black',
            color: 'white',
            border: 'none',
            padding: 8,
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
