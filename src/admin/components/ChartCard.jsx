export default function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}