export type DisposeFns = (() => void)[];

export function eventListener(obj: any, eventName: string, listener: Function) {
  obj.addEventListener(eventName, listener);
  return () => obj.removeEventListener(eventName, listener);
}

export function disposeAll(disposeFuncs: DisposeFns) {
  for (const dispose of disposeFuncs) {
    dispose();
  }
}
