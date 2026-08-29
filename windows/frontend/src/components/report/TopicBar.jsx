/** Horizontal solve-rate bar used in the topic performance table. */
export default function TopicBar({ solved, total }) {
    const percentage = total === 0 ? 0 : Math.round((solved * 100) / total);
    const tone = percentage === 100 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="flex items-center gap-3">
            <div className="h-2.5 w-full max-w-40 overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
            </div>
            <span className="w-24 shrink-0 text-sm text-gray-600">
                {solved}/{total} · {percentage}%
            </span>
        </div>
    );
}
