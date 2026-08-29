import { useState } from 'react'

const suggestedTags = ['Dynamic Programming', 'Graphs', 'Greedy', 'Trees', 'Math', 'Binary Search']

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M7 17 17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="m12 3-1.35 5.65L5 10l5.65 1.35L12 17l1.35-5.65L19 10l-5.65-1.35L12 3ZM5 16l-.7 2.3L2 19l2.3.7L5 22l.7-2.3L8 19l-2.3-.7L5 16Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Home() {
  const [handle, setHandle] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [difficulty, setDifficulty] = useState('Balanced')
  const [duration, setDuration] = useState('2 hours')
  const [message, setMessage] = useState('')

  const toggleTag = (tag) => {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])
  }

  const generateContest = (event) => {
    event.preventDefault()
    setMessage(handle.trim() ? `Your ${difficulty.toLowerCase()} contest is ready to generate.` : 'Enter your Codeforces handle to get started.')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f2] text-[#172018]">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10 lg:px-14">
        <nav className="flex items-center justify-between" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#b9f227] text-lg font-black text-[#172018]">C</span>
            <span>ContestCraft</span>
          </a>
          <a href="#how-it-works" className="hidden items-center gap-1 text-sm font-medium text-[#536050] transition hover:text-[#172018] sm:flex">
            How it works <ArrowUpRight />
          </a>
        </nav>

        <section id="top" className="grid items-center gap-12 pb-14 pt-16 lg:grid-cols-[1.04fr_.96fr] lg:pb-20 lg:pt-24">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dce5d2] bg-[#fdfdf9] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#547047]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#74ad26]" />
              YOUR NEXT GREAT PRACTICE SESSION
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#182117] sm:text-6xl lg:text-7xl">
              Practice with <span className="text-[#66a126]">purpose,</span> not chance.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#62705e] sm:text-lg">
              Get a personalized Codeforces contest built around your current level, goals, and the topics you want to sharpen.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#596656]">
              <span className="flex items-center gap-2"><span className="text-[#76a932]">✓</span> No sign-up needed</span>
              <span className="flex items-center gap-2"><span className="text-[#76a932]">✓</span> Unsolved problems only</span>
            </div>
          </div>

          <form onSubmit={generateContest} className="relative rounded-3xl border border-[#dfe5d7] bg-[#fffefa] p-5 shadow-[0_25px_70px_-32px_rgba(44,67,31,0.28)] sm:p-7">
            <div className="absolute -right-16 -top-16 z-0 h-48 w-48 rounded-full bg-[#dbf995] blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#182117]">Build your contest</p>
                  <p className="mt-1 text-sm text-[#758070]">Tuned for your next breakthrough.</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef8d8] text-[#4d8020]"><Sparkles /></span>
              </div>

              <label className="block text-sm font-medium" htmlFor="cf-handle">Codeforces handle</label>
              <input
                id="cf-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="e.g. tourist"
                className="mt-2 w-full rounded-xl border border-[#d8e0d2] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a2aa9e] focus:border-[#8dc43b] focus:ring-4 focus:ring-[#ddf6b0]"
              />

              <div className="mt-6">
                <p className="text-sm font-medium">Focus topics <span className="font-normal text-[#84907f]">(optional)</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${selectedTags.includes(tag) ? 'border-[#81b936] bg-[#e7f8bd] text-[#345d17]' : 'border-[#e1e6dc] bg-[#fbfcf9] text-[#667263] hover:border-[#b8d77c]'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Difficulty
                  <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-2 w-full appearance-none rounded-xl border border-[#d8e0d2] bg-white px-3 py-3 text-sm font-normal text-[#52604f] outline-none focus:border-[#8dc43b]">
                    <option>Balanced</option><option>Comfort zone</option><option>Challenge me</option>
                  </select>
                </label>
                <label className="text-sm font-medium">Duration
                  <select value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full appearance-none rounded-xl border border-[#d8e0d2] bg-white px-3 py-3 text-sm font-normal text-[#52604f] outline-none focus:border-[#8dc43b]">
                    <option>90 minutes</option><option>2 hours</option><option>3 hours</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f321b] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#304d28] focus:outline-none focus:ring-4 focus:ring-[#c9ec86]">
                Generate my contest <ArrowUpRight />
              </button>
              {message && <p className="mt-3 text-center text-xs font-medium text-[#63765a]" role="status">{message}</p>}
            </div>
          </form>
        </section>

        <section id="how-it-works" className="border-t border-[#dfe5d9] pt-10">
          <p className="text-xs font-bold tracking-[0.16em] text-[#75914d]">HOW IT WORKS</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['01', 'Read your profile', 'We look at your rating and solved problems.'],
              ['02', 'Find the right fit', 'We match fresh problems to your chosen topics.'],
              ['03', 'Start your session', 'A focused contest, ready when you are.'],
            ].map(([number, title, copy]) => <article key={number} className="rounded-2xl bg-[#edf1e8] p-5"><span className="text-xs font-bold text-[#7ea64d]">{number}</span><h2 className="mt-6 text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#697566]">{copy}</p></article>)}
          </div>
        </section>
      </div>
    </main>
  )
}