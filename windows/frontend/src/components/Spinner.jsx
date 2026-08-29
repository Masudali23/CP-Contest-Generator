export default function Spinner({ label = "Loading..." }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-lg font-medium text-gray-600">{label}</p>
        </div>
    );
}
