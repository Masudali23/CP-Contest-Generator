/** The concrete follow-up problems suggested for one weak topic. */
export default function PracticeProblemList({ problems }) {
    if (!problems || problems.length === 0) {
        return <p className="text-sm text-gray-500">No unsolved problems were found for this topic right now.</p>;
    }

    return (
        <ol className="space-y-2">
            {problems.map((problem) => (
                <li
                    key={`${problem.contestId}-${problem.index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                    <a
                        href={problem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                    >
                        {problem.contestId}
                        {problem.index} — {problem.name}
                    </a>

                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                        {problem.rating}
                    </span>
                </li>
            ))}
        </ol>
    );
}
