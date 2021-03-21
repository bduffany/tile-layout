import React from 'react';
import {
  TileContentComponentProps,
  TabContentComponentProps,
} from '../TileLayout';
import { ReactComponent as FileSvg } from './file.svg';
import Tab from './Tab';

export default function FileTree({ id }: TileContentComponentProps) {
  return (
    <div>
      <ul>
        <li>File 1</li>
        <li>File 2</li>
      </ul>
    </div>
  );
}

export function FileTreeTab({ id, direction }: TabContentComponentProps) {
  return (
    <Tab id={id} direction={direction}>
      <FileSvg stroke="white" />
    </Tab>
  );
}
