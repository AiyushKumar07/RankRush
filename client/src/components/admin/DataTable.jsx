/**
 * DataTable — generic admin data table matching .atable from admin-shell.css.
 * Renders a <table> with column definitions and row data.
 */
export default function DataTable({ columns, children, className = "" }) {
  return (
    <table className={`atable ${className}`}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th
              key={i}
              className={[col.className, col.align === "right" ? "right" : ""].filter(Boolean).join(" ")}
              style={col.style}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
