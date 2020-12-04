export function eventListener(obj: any, eventName: string, listener: Function) {
  obj.addEventListener(eventName, listener);
  return () => obj.removeEventListener(eventName, listener);
}
