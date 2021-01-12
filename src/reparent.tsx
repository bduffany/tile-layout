import * as React from 'react';

const elementCallbacks = new Map<any, ((el: Element) => void)[]>();
const elementsById = new Map<any, Element>();
async function waitForElement(id: any) {
  const element = elementsById.get(id);
  if (element) return element;

  return new Promise<Element>((accept) => {
    let callbacks = elementCallbacks.get(id);
    if (!callbacks) {
      elementCallbacks.set(id, (callbacks = []));
    }
    callbacks.push(accept);
  });
}

export type InletProps<IdType, DataType> = {
  id?: IdType | null;
  data?: DataType | null;
  renderer: (data?: DataType | null) => React.ReactNode;
};

export class Inlet<IdType, DataType> extends React.PureComponent<
  InletProps<IdType, DataType>
> {
  private containerRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.update();
  }

  componentDidUpdate() {
    this.update();
  }

  private update() {
    const {
      props: { id },
      containerRef,
    } = this;
    if (!id || !containerRef.current?.childElementCount) return;
    const element = containerRef.current.children[0];
    elementsById.set(id, element);
    const callbacks = elementCallbacks.get(id);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(element);
      }
      elementCallbacks.delete(id);
    }
  }

  render() {
    const {
      props: { id, data, renderer },
      containerRef,
    } = this;
    return (
      <div style={{ display: 'none' }} ref={containerRef}>
        {id && <div>{renderer(data)}</div>}
      </div>
    );
  }
}

type OutletProps<T> = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  id?: T | null;
};

export const Outlet = function <T>({ id, ...props }: OutletProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!containerRef.current || !id) return;
    let cancelled = false;
    const container = containerRef.current;
    waitForElement(id).then((el) => {
      if (cancelled || containerRef.current !== container) return;
      container.appendChild(el);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return <div ref={containerRef} {...props} data-outlet-id={id} />;
};
