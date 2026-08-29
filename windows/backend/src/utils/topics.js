/*
 * Codeforces tag metadata used by the report generator.
 *
 * `label`      human readable name shown in the UI
 * `blurb`      why the topic matters, used when a topic is flagged as weak
 * `drills`     concrete practice actions for the study plan
 * `resources`  links a user can open straight away
 */
const TOPIC_META = {
    "2-sat": {
        label: "2-SAT",
        blurb: "Turns boolean constraint problems into an implication graph solved with SCC.",
        drills: ["Model 3 constraint problems as implication graphs", "Implement Tarjan SCC from scratch once"],
        resources: [{ title: "CP-Algorithms: 2-SAT", url: "https://cp-algorithms.com/graph/2SAT.html" }],
    },
    "binary search": {
        label: "Binary Search",
        blurb: "Binary search on the answer converts many optimisation problems into a simple feasibility check.",
        drills: [
            "Write a predicate-style binary search template and reuse it",
            "Practise 'minimum x such that check(x) is true' problems",
        ],
        resources: [{ title: "CP-Algorithms: Binary Search", url: "https://cp-algorithms.com/num_methods/binary_search.html" }],
    },
    bitmasks: {
        label: "Bitmasks",
        blurb: "Compact subset representation; the backbone of exponential DP over small sets.",
        drills: ["Enumerate submasks of a mask", "Solve a travelling-salesman style bitmask DP"],
        resources: [{ title: "CP-Algorithms: Bit Manipulation", url: "https://cp-algorithms.com/algebra/bit-manipulation.html" }],
    },
    "brute force": {
        label: "Brute Force",
        blurb: "Knowing when the constraints permit an exhaustive search saves a lot of wasted thinking.",
        drills: ["Estimate the operation count before coding", "Practise pruning search spaces early"],
        resources: [{ title: "Codeforces EDU", url: "https://codeforces.com/edu/courses" }],
    },
    "chinese remainder theorem": {
        label: "Chinese Remainder Theorem",
        blurb: "Combines modular congruences with coprime moduli into a single congruence.",
        drills: ["Implement CRT for two congruences, then generalise"],
        resources: [{ title: "CP-Algorithms: CRT", url: "https://cp-algorithms.com/algebra/chinese-remainder-theorem.html" }],
    },
    combinatorics: {
        label: "Combinatorics",
        blurb: "Counting arguments, binomials and inclusion-exclusion appear in most rating bands.",
        drills: ["Precompute factorials and modular inverses", "Practise inclusion-exclusion counting"],
        resources: [{ title: "CP-Algorithms: Combinatorics", url: "https://cp-algorithms.com/combinatorics/binomial-coefficients.html" }],
    },
    "constructive algorithms": {
        label: "Constructive Algorithms",
        blurb: "Building any valid answer rather than the optimal one; heavy on pattern spotting.",
        drills: ["Work small cases by hand before generalising", "Look for invariants and parity arguments"],
        resources: [{ title: "Codeforces: Constructive problems", url: "https://codeforces.com/problemset?tags=constructive+algorithms" }],
    },
    "data structures": {
        label: "Data Structures",
        blurb: "Segment trees, BITs, heaps and sets - the toolbox for range and order queries.",
        drills: ["Implement a Fenwick tree and a segment tree with lazy propagation"],
        resources: [{ title: "CP-Algorithms: Segment Tree", url: "https://cp-algorithms.com/data_structures/segment_tree.html" }],
    },
    "dfs and similar": {
        label: "DFS and Similar",
        blurb: "Graph traversal, connected components, cycle detection and flood fill.",
        drills: ["Write iterative DFS to avoid stack overflow on deep graphs"],
        resources: [{ title: "CP-Algorithms: DFS", url: "https://cp-algorithms.com/graph/depth-first-search.html" }],
    },
    "divide and conquer": {
        label: "Divide and Conquer",
        blurb: "Splitting a problem and merging results; also the base of D&C DP optimisation.",
        drills: ["Practise merge-sort style counting problems"],
        resources: [{ title: "CP-Algorithms: D&C DP", url: "https://cp-algorithms.com/dynamic_programming/divide-and-conquer-dp.html" }],
    },
    dp: {
        label: "Dynamic Programming",
        blurb: "State design and transitions; the single highest-leverage topic between 1200 and 2100.",
        drills: [
            "Write the state definition in words before coding",
            "Solve one knapsack, one interval DP and one digit DP",
        ],
        resources: [
            { title: "CP-Algorithms: DP", url: "https://cp-algorithms.com/dynamic_programming/intro-to-dp.html" },
            { title: "AtCoder DP Contest", url: "https://atcoder.jp/contests/dp/tasks" },
        ],
    },
    dsu: {
        label: "Disjoint Set Union",
        blurb: "Near-constant-time merging of components; underpins Kruskal and offline connectivity.",
        drills: ["Implement DSU with path compression and union by size"],
        resources: [{ title: "CP-Algorithms: DSU", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" }],
    },
    "expression parsing": {
        label: "Expression Parsing",
        blurb: "Shunting-yard and recursive descent for evaluating expressions.",
        drills: ["Write a recursive descent parser for + - * / and parentheses"],
        resources: [{ title: "CP-Algorithms: Expression Parsing", url: "https://cp-algorithms.com/string/expression_parsing.html" }],
    },
    fft: {
        label: "Fast Fourier Transform",
        blurb: "Fast polynomial and big-integer multiplication, plus convolution counting.",
        drills: ["Implement iterative FFT and verify against naive convolution"],
        resources: [{ title: "CP-Algorithms: FFT", url: "https://cp-algorithms.com/algebra/fft.html" }],
    },
    flows: {
        label: "Network Flows",
        blurb: "Max-flow / min-cut modelling; often the hidden structure behind matching problems.",
        drills: ["Implement Dinic's algorithm", "Practise modelling a problem as a flow network"],
        resources: [{ title: "CP-Algorithms: Max Flow", url: "https://cp-algorithms.com/graph/edmonds_karp.html" }],
    },
    games: {
        label: "Game Theory",
        blurb: "Win/lose states, Nim and Sprague-Grundy numbers.",
        drills: ["Compute Grundy numbers for small games by brute force, then find the pattern"],
        resources: [{ title: "CP-Algorithms: Games on Graphs", url: "https://cp-algorithms.com/game_theory/games_on_graphs.html" }],
    },
    geometry: {
        label: "Geometry",
        blurb: "Vectors, cross products, convex hulls and careful precision handling.",
        drills: ["Build a small geometry template with integer cross products"],
        resources: [{ title: "CP-Algorithms: Geometry", url: "https://cp-algorithms.com/geometry/basic-geometry.html" }],
    },
    "graph matchings": {
        label: "Graph Matchings",
        blurb: "Bipartite matching, Hall's theorem and vertex cover duality.",
        drills: ["Implement Kuhn's algorithm"],
        resources: [{ title: "CP-Algorithms: Kuhn's Algorithm", url: "https://cp-algorithms.com/graph/kuhn_maximum_bipartite_matching.html" }],
    },
    graphs: {
        label: "Graphs",
        blurb: "Modelling problems as vertices and edges is often the entire difficulty.",
        drills: ["Practise recognising implicit graphs (states as nodes)"],
        resources: [{ title: "CP-Algorithms: Graphs", url: "https://cp-algorithms.com/#graphs" }],
    },
    greedy: {
        label: "Greedy",
        blurb: "Exchange arguments and sorting-based strategies; the most common Div. 2 A/B pattern.",
        drills: ["Prove the exchange argument before submitting", "Stress test greedy against brute force"],
        resources: [{ title: "Codeforces: Greedy problems", url: "https://codeforces.com/problemset?tags=greedy" }],
    },
    hashing: {
        label: "Hashing",
        blurb: "Polynomial string hashing for fast substring comparison.",
        drills: ["Implement double hashing to avoid anti-hash tests"],
        resources: [{ title: "CP-Algorithms: String Hashing", url: "https://cp-algorithms.com/string/string-hashing.html" }],
    },
    implementation: {
        label: "Implementation",
        blurb: "Long but mechanical problems - accuracy and clean code matter more than insight.",
        drills: ["Practise writing bug-free simulations under time pressure", "Split logic into small functions"],
        resources: [{ title: "Codeforces: Implementation problems", url: "https://codeforces.com/problemset?tags=implementation" }],
    },
    interactive: {
        label: "Interactive Problems",
        blurb: "Query-based problems with a strict interaction budget; flush output every turn.",
        drills: ["Practise binary search style interactive queries"],
        resources: [{ title: "Codeforces: Interactive Problems guide", url: "https://codeforces.com/blog/entry/45307" }],
    },
    math: {
        label: "Mathematics",
        blurb: "Number sense, algebraic manipulation and closed-form reasoning.",
        drills: ["Derive formulas on paper before coding", "Practise modular arithmetic"],
        resources: [{ title: "CP-Algorithms: Algebra", url: "https://cp-algorithms.com/#algebra" }],
    },
    matrices: {
        label: "Matrices",
        blurb: "Matrix exponentiation for linear recurrences and transitions.",
        drills: ["Implement matrix power and solve a Fibonacci-style recurrence"],
        resources: [{ title: "CP-Algorithms: Matrix Exponentiation", url: "https://cp-algorithms.com/algebra/binary-exp.html" }],
    },
    "meet-in-the-middle": {
        label: "Meet in the Middle",
        blurb: "Halving an exponential search space and joining the halves.",
        drills: ["Solve a subset-sum problem with n up to 40"],
        resources: [{ title: "CP-Algorithms: Meet in the Middle", url: "https://cp-algorithms.com/num_methods/meet_in_the_middle.html" }],
    },
    "number theory": {
        label: "Number Theory",
        blurb: "Primes, gcd, modular inverses and divisor structure.",
        drills: ["Implement a linear sieve", "Practise modular inverse via Fermat and extended Euclid"],
        resources: [{ title: "CP-Algorithms: Number Theory", url: "https://cp-algorithms.com/#algebra" }],
    },
    probabilities: {
        label: "Probability",
        blurb: "Expected value linearity is usually the key that unlocks these problems.",
        drills: ["Practise expected-value DP", "Use linearity of expectation to decompose problems"],
        resources: [{ title: "Codeforces: Probability problems", url: "https://codeforces.com/problemset?tags=probabilities" }],
    },
    schedules: {
        label: "Scheduling",
        blurb: "Ordering tasks under deadlines; usually greedy with an exchange argument.",
        drills: ["Practise deadline scheduling with a priority queue"],
        resources: [{ title: "Codeforces: Schedules problems", url: "https://codeforces.com/problemset?tags=schedules" }],
    },
    "shortest paths": {
        label: "Shortest Paths",
        blurb: "Dijkstra, 0-1 BFS and Bellman-Ford, including layered-graph variants.",
        drills: ["Implement Dijkstra with a priority queue", "Practise 0-1 BFS with a deque"],
        resources: [{ title: "CP-Algorithms: Dijkstra", url: "https://cp-algorithms.com/graph/dijkstra.html" }],
    },
    sortings: {
        label: "Sorting",
        blurb: "Custom comparators and the sort-then-scan pattern.",
        drills: ["Practise problems where sorting by a derived key reveals the answer"],
        resources: [{ title: "Codeforces: Sortings problems", url: "https://codeforces.com/problemset?tags=sortings" }],
    },
    "string suffix structures": {
        label: "Suffix Structures",
        blurb: "Suffix arrays, suffix automata and Z-function for substring queries.",
        drills: ["Implement the Z-function and a suffix array with counting sort"],
        resources: [{ title: "CP-Algorithms: Suffix Array", url: "https://cp-algorithms.com/string/suffix-array.html" }],
    },
    strings: {
        label: "Strings",
        blurb: "Prefix functions, KMP and general string manipulation.",
        drills: ["Implement KMP and use it for pattern counting"],
        resources: [{ title: "CP-Algorithms: Prefix Function", url: "https://cp-algorithms.com/string/prefix-function.html" }],
    },
    "ternary search": {
        label: "Ternary Search",
        blurb: "Finding the extremum of a unimodal function.",
        drills: ["Practise ternary search on real and integer domains"],
        resources: [{ title: "CP-Algorithms: Ternary Search", url: "https://cp-algorithms.com/num_methods/ternary_search.html" }],
    },
    trees: {
        label: "Trees",
        blurb: "Rooting, LCA, subtree DP and Euler tours.",
        drills: ["Implement binary lifting LCA", "Solve a rerooting DP problem"],
        resources: [{ title: "CP-Algorithms: LCA", url: "https://cp-algorithms.com/graph/lca.html" }],
    },
    "two pointers": {
        label: "Two Pointers",
        blurb: "Sliding windows over sorted or monotone sequences.",
        drills: ["Practise longest-subarray-with-property problems"],
        resources: [{ title: "Codeforces EDU: Two Pointers", url: "https://codeforces.com/edu/course/2/lesson/9" }],
    },
    "*special": {
        label: "Special Problem",
        blurb: "Problem-specific tricks that do not fit a standard category.",
        drills: ["Read the editorial carefully and note the trick"],
        resources: [{ title: "Codeforces problemset", url: "https://codeforces.com/problemset" }],
    },
};

const DEFAULT_META = {
    blurb: "Recurring pattern in this rating band - worth a focused practice session.",
    drills: ["Solve five problems with this tag near your current rating", "Read the editorial for each one you cannot finish"],
    resources: [{ title: "Codeforces problemset", url: "https://codeforces.com/problemset" }],
};

export const ALL_TAGS = Object.keys(TOPIC_META).filter((tag) => tag !== "*special");

export const topicLabel = (tag) =>
    TOPIC_META[tag]?.label ?? tag.replace(/\b\w/g, (character) => character.toUpperCase());

export const topicMeta = (tag) => ({
    tag,
    label: topicLabel(tag),
    blurb: TOPIC_META[tag]?.blurb ?? DEFAULT_META.blurb,
    drills: TOPIC_META[tag]?.drills ?? DEFAULT_META.drills,
    resources: TOPIC_META[tag]?.resources ?? DEFAULT_META.resources,
});

export default TOPIC_META;
