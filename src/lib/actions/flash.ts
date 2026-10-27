export function flash(node: HTMLElement, value: unknown) {
  let prev = value;
  return {
    update(next: unknown) {
      if (next === prev) return;
      prev = next;
      node.classList.remove('flash');
      void node.offsetWidth; // restart the animation
      node.classList.add('flash');
    }
  };
}