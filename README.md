# @xperjs/ide-layout

High-performance VSCode-style tile layout for React.

## Install

```bash
yarn add @xperjs/tile-layout
```

## User experience

- [x] **Resizable tiles**: click and drag borders to resize.
- [x] **Tabbed layout**: Drag and drop tabs from one tab strip to another.
- [x] **Splitting**: Drag a tab into a region of another tile to split
      the view with that tile.
- [x] **Add new tabs**: double-click the tab bar to add new tabs.
- [x] **Saved layouts**: the layout can be saved and restored in subsequent
      sessions.
- [x] **High performance resizing**: unlike some other libraries out there,
      resizing is very smooth.
- [x] Horizontal tab scrolling at 60FPS.

## Developer experience

- [x] **Low-level API**: you get full control over everything that renders inside
      the tabs as well as the tiles.
- [x] **Minimal re-renders**: to ensure high performance, `TileLayout` does
      not re-render your components unexpectedly.
- [x] **Simple layout format**: Layouts are specified in a simple JSON format.
      You can construct layouts by hand without needing to learn lots of
      weird abstractions. Because it is just JSON, you can persist the
      layout to a database or local storage, and then restore it on the
      next user session.
- [x] **Utility components**: Since you control everything that renders inside
      the layout, building basic features like a close button can be a bit
      involved. Some utility components are included to take care of these
      common tasks, like `TabCloseButton`, which closes a tab
- [x] **Unopinionated**: The layout itself comes with basic styling that
      is meant to be overridden. Utility components come with no styling at
      all. For now, you can copy the example components and then tweak the
      styles to your liking.
- [x] **Full-featured example app**: if you don't want to deal with the
      low-level API, you can copy the components from the examples.

## Supported environments

- [x] Runs in the browser (or Electron).
- [ ] React Native: NOT supported, due to some architectural choices that require
      using DOM APIs directly.

## Works with

- [x] Monaco
  - [ ] Known issue: right-click menu gets cut off by other tiles.
- [x] xterm.js
  - [ ] Known issue: doesn't resize properly.

## Missing features

VS Code's tile layout has _tons_ of features. The following features aren't
supported yet. PRs welcome!

User features:

- [ ] Drag entire tab strips by clicking and dragging the tab strip itself.
- [ ] When double-clicking a tile border, evenly resize the tiles along
      that axis.
- [ ] When double-clicking a tab, maximize or restore the tab.
- [ ] Allow tabs to wrap instead of scrolling.
- [ ] Allow resizing tiles at junction points
- [ ] Ctrl+Click and drag to clone the tab that you're dragging, instead of
      moving it.

Developer features:

- [ ] Vertically-oriented tab strips
- [ ] _Consider_ supporting expando sections within tiles. (It should be
      possible to implement this at the application level but it would be
      nice to provide utility components for this)
- [ ] Allow rendering arbitrary content in the tab strip, such as menus
      that control which tabs are open.
- [ ] Expose more tab strip APIs like close others, close all, close to
      the right.
- [ ] Allow programmatically manipulating tabs.

## Getting started

### Rendering a basic layout

```tsx
import TileLayout from '@xperjs/tile-layout';
import { Editor, TodoList } from 'your-component-lib';

// Specify the layout that the user should see when they first open the
// app (optional). This is a regular JSON object, so you can get this from
// a database or local storage.
const INITIAL_LAYOUT = {
  tabs: [
    {
      // `type` selects the component to render.
      type: 'Editor',
      // `id` is passed to your component so that it knows what to render.
      // You can set this however you like.
      id: 'file:///path/to/file.txt',
    },
    {
      // For the TodoList component, the ID might be used to fetch the
      // todo list from a database.
      type: 'TodoList',
      id: 'f5e806af-214f-42b8-a871-0131b1f57347',
    },
  ],
};

// Specify the types of components that the layout will render.
// Each key in these objects matches a "type" in the config above.
const TILE_COMPONENTS = { Editor: EditorTile, TodoList: TodoListTile };
const TAB_COMPONENTS = { Editor: EditorTab, TodoList: TodoListTab };

function MyApp() {
  return (
    <TileLayout
      layout={INITIAL_LAYOUT}
      components={TILE_COMPONENTS}
      tabComponents={TAB_COMPONENTS}
    ></TileLayout>
  );
}
```

### Writing components for the layout

For each _type_ of tile that you want to render (editor, terminal, search, etc.),
write one component for the tile and another for the tab.

```tsx
function EditorTile({ id: filePath }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // In this example, we're using Electron, so we can read local files.
    fs.readFile(id, { encoding: 'utf-8' }).then((t) => {
      setText(t);
      setLoading(false);
    });
  }, [setText]);
  const onChange = useCallback((e) => setText(e.target.value), [setText]);
  return loading ? null : <textarea onChange={onChange} value={text} />;
}

function EditorTab({ id: filePath }) {
  const fileName = React.useMemo(() => path.baseName(filePath));
  return <Tab>{fileName}</Tab>;
}
```

<!--

TODO: Persisting layouts
TODO: Building empty states
TODO: Styling tabs

-->
