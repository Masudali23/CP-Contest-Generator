export default function ReportSection({ title, subtitle, children, className = "" }) {
    return (
        <section className={`mb-6 rounded-3xl bg-white p-8 shadow-sm ${className}`}>
            {title && (
                <header className="mb-5">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                    {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
                </header>
            )}
            {children}
        </section>
    );
}
