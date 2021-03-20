import React from 'react';
import { TabCloseButton } from '../TileLayout';
import css from './Tab.module.css';

export type TabProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  id: string;
  dirty?: boolean;
};

export default function Tab(props: TabProps) {
  const { children, className, id, dirty, ...rest } = props;

  const confirm = React.useMemo(
    () => async () => {
      alert('Closing tab with unsaved work :(');
      return true; // TODO: actually prompt the user for confirmation
    },
    []
  );

  return (
    <div className={`${css.tab} ${className || ''}`} {...rest}>
      {children}{' '}
      <TabCloseButton
        tabId={id}
        className={css.closeButton}
        confirm={dirty ? confirm : null}
        aria-label="close"
        title="Close"
      >
        {dirty ? <Dot /> : <X />}
      </TabCloseButton>
    </div>
  );
}

function Dot() {
  const size = 8;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'white',
      }}
    ></div>
  );
}

function X() {
  const size = 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      stroke="white"
      strokeWidth={1}
    >
      <line x1="0" y1="0" x2={size} y2={size} />
      <line x1={size} y1="0" x2="0" y2={size} />
    </svg>
  );
}
