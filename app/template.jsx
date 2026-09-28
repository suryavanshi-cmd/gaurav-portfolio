/* A template, unlike a layout, remounts on every navigation — so the entrance
   animation on .page plays once per route change and never on a re-render.
   The nav, footer, background and assistant live in the layout and persist. */
export default function Template({ children }) {
  return <div className="page">{children}</div>;
}
