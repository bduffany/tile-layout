import React from 'react';
import {
  TabContentComponentProps,
  TileContentComponentProps,
} from '../TileLayout';
import Tab from './Tab';

export default function SketchPad({ id }: TileContentComponentProps) {
  return (
    <iframe
      width="100%"
      height="100%"
      src="https://excalidraw.com"
      style={{ border: 0 }}
    />
  );
}

export function SketchPadTab({ id }: TabContentComponentProps) {
  return <Tab id={id}>Excalidraw</Tab>;
}
