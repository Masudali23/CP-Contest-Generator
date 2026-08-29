/** Shared row used by both the contest history and the report list. */
export default function ContestCard({ contest, index, actionLabel, onAction, secondary }) {
    const formatDate = (value) =>
        new Date(value).toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div>
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                        {index + 1}
                    </span>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Contest #{contest.id}</h2>
                        <p className="mt-1 text-gray-500">Created {formatDate(contest.created_at)}</p>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
                        ⏱ {contest.duration} minutes
                    </span>

                    <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold capitalize text-gray-600">
                        {contest.difficulty}
                    </span>

                    <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
                        {contest.problem_count ?? 0} problems
                    </span>

                    <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            contest.is_ended ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-700"
                        }`}
                    >
                        {contest.is_ended ? "Completed" : "Active"}
                    </span>

                    {contest.has_report && (
                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                            Report ready
                        </span>
                    )}

                    {contest.tags?.length > 0 && (
                        <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
                            {contest.tags.join(", ")}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={onAction}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    {actionLabel}
                </button>
                {secondary}
            </div>
        </div>
    );
}
