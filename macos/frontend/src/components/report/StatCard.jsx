export default function StatCard({ label, value, hint, tone = "blue" }) {
    const tones = {
        blue: "text-blue-600",
        green: "text-green-600",
        red: "text-red-600",
        amber: "text-amber-600",
        gray: "text-gray-700",
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className={`text-3xl font-bold ${tones[tone] ?? tones.blue}`}>{value}</p>
            <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
    );
}
