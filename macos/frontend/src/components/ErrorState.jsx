export default function ErrorState({ title = "Something went wrong", message, onRetry, action }) {
    return (
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="text-4xl">⚠️</div>
            <h2 className="mt-4 text-2xl font-bold text-red-800">{title}</h2>
            {message && <p className="mt-2 text-red-700">{message}</p>}

            <div className="mt-6 flex justify-center gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
                    >
                        Try again
                    </button>
                )}
                {action}
            </div>
        </div>
    );
}
