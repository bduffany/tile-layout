import React from 'react';
import { TabCloseButton } from '../TileLayout';
import css from './Tab.module.css';

export type TabProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  id: string;
};

export default function Tab(props: TabProps) {
  const { children, className, id, ...rest } = props;
  return (
    <div className={`${css.tab} ${className || ''}`} {...rest}>
      {children}{' '}
      <TabCloseButton
        tabId={id}
        className={css.closeButton}
        aria-label="close"
        title="Close"
      >
        <span className={css.x}>×</span>
      </TabCloseButton>
    </div>
  );
}
