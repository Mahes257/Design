/** List toolbar: filters/refresh on the left, search/export/columns + count on the right. */
export default function Toolbar({ left, right, count }) {
  return (
    <div className="list-toolbar">
      <div className="toolbar-left">{left}</div>
      <div className="toolbar-right">
        {right}
        {count && <span className="toolbar-count">{count}</span>}
      </div>
    </div>
  );
}
