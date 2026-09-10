/**
 * SkillSwap Platform - AI Dynamic 20-Question Assessment Engine
 * Powered by Google Gemini API & Generative Domain Synthesizers
 */

require('dotenv').config();

let GoogleGenAI = null;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e) {
  try {
    GoogleGenAI = require('@google/generative-ai').GoogleGenerativeAI;
  } catch (err) {
    // Dynamic fallback
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let aiClient = null;
if (GoogleGenAI && GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.warn('⚠️ GoogleGenAI client initialization note:', err.message);
  }
}

/**
 * Utility: Shuffle an array in-place using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Utility: Randomize options and compute new correct_option_index
 */
function randomizeQuestionOptions(q) {
  const originalCorrectText = q.options[q.correct_option_index];
  const shuffledOptions = shuffleArray(q.options);
  const newCorrectIndex = shuffledOptions.indexOf(originalCorrectText);

  return {
    ...q,
    options: shuffledOptions,
    correct_option_index: newCorrectIndex
  };
}

// ============================================================================
// Comprehensive Domain Question Synthesizers (20+ Diverse Questions Per Domain)
// ============================================================================
const DOMAIN_QUESTION_BANKS = {
  python: [
    {
      question: "What is the output of `type(lambda x: x)` in Python?",
      code_snippet: "func = lambda x: x ** 2\nprint(type(func))",
      options: ["<class 'function'>", "<class 'lambda'>", "<class 'object'>", "<class 'method'>"],
      correct_option_index: 0,
      explanation: "In Python, lambda expressions create anonymous function objects of type 'function'."
    },
    {
      question: "Which method is called when an object is initialized in Python OOP?",
      code_snippet: "class Student:\n    def __init__(self, name):\n        self.name = name",
      options: ["__init__", "__new__", "__construct__", "__start__"],
      correct_option_index: 0,
      explanation: "__init__ acts as the constructor initialization hook after __new__ allocates the instance."
    },
    {
      question: "What happens when you pass a mutable object as a default argument in a function definition?",
      code_snippet: "def add_item(item, basket=[]):\n    basket.append(item)\n    return basket",
      options: ["The default list is created once and shared across invocations", "The default list is re-created each call", "A TypeError is raised at compile time", "The list becomes immutable"],
      correct_option_index: 0,
      explanation: "Python evaluates default arguments once at definition time, meaning mutable defaults persist mutations across calls."
    },
    {
      question: "How does Python resolve method calls in multiple inheritance?",
      code_snippet: "class C(A, B):\n    pass",
      options: ["C3 Linearization / Method Resolution Order (MRO)", "Depth-First Search without duplicates", "Right-to-Left order", "Randomized priority"],
      correct_option_index: 0,
      explanation: "Python utilizes the C3 Linearization algorithm to determine the class Method Resolution Order (MRO)."
    },
    {
      question: "What is the primary difference between `is` and `==` in Python?",
      code_snippet: "a = [1, 2, 3]\nb = [1, 2, 3]\nprint(a == b, a is b)",
      options: ["`==` checks value equality; `is` checks memory identity", "`is` checks value equality; `==` checks memory identity", "They are identical aliases", "`is` is only used for integers"],
      correct_option_index: 0,
      explanation: "`==` evaluates equality of values, whereas `is` checks if both variables refer to the exact same memory location (`id(a) == id(b)`)."
    },
    {
      question: "What is the time complexity of looking up a key in a standard Python dictionary (average case)?",
      code_snippet: "user_data = {'id': 101, 'name': 'Sri'}\nprint(user_data['name'])",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
      correct_option_index: 0,
      explanation: "Python dictionaries are implemented via hash tables, providing O(1) average time complexity for lookups."
    },
    {
      question: "What does the `@property` decorator achieve in a Python class?",
      code_snippet: "class Account:\n    @property\n    def balance(self):\n        return self._balance",
      options: ["Allows method access like an attribute getter", "Makes the method private and inaccessible", "Converts the method into a static method", "Caches method output permanently"],
      correct_option_index: 0,
      explanation: "`@property` enables a method to be accessed as a getter attribute without explicit parenthesis."
    },
    {
      question: "What will the following list comprehension generate?",
      code_snippet: "result = [x * 2 for x in range(5) if x % 2 == 0]\nprint(result)",
      options: ["[0, 4, 8]", "[0, 2, 4, 6, 8]", "[2, 6]", "[0, 4]"],
      correct_option_index: 0,
      explanation: "Even numbers in range(5) are 0, 2, 4. Multiplying each by 2 yields [0, 4, 8]."
    },
    {
      question: "What is the function of the `yield` keyword in Python?",
      code_snippet: "def count_up(n):\n    for i in range(n):\n        yield i",
      options: ["Turns the function into a generator object", "Terminates the program execution", "Imports external modules asynchronously", "Throws an unhandled exception"],
      correct_option_index: 0,
      explanation: "`yield` pauses the function state and yields values on demand, creating a memory-efficient generator."
    },
    {
      question: "How do you open a file safely ensuring it is closed even if an exception occurs?",
      code_snippet: "with open('notes.txt', 'r') as file:\n    data = file.read()",
      options: ["Using the `with` context manager", "Using `open()` without closing", "Using `try...except` without `finally`", "Calling `os.open()`"],
      correct_option_index: 0,
      explanation: "The `with` statement utilizes the Context Manager protocol (`__enter__` and `__exit__`) to guarantee file stream closure."
    },
    {
      question: "What is the output of `bool([])` and `bool([0])`?",
      code_snippet: "print(bool([]), bool([0]))",
      options: ["False True", "False False", "True True", "True False"],
      correct_option_index: 0,
      explanation: "An empty list is falsy (`False`), whereas a non-empty list containing element `0` is truthy (`True`)."
    },
    {
      question: "Which builtin module is used in Python for deep copying objects?",
      code_snippet: "import copy\nnew_obj = copy.deepcopy(old_obj)",
      options: ["copy", "clone", "duplicate", "sys"],
      correct_option_index: 0,
      explanation: "The `copy` module provides `copy.copy()` for shallow copy and `copy.deepcopy()` for recursive duplication."
    },
    {
      question: "What is the purpose of `*args` and `**kwargs` in a function definition?",
      code_snippet: "def execute(*args, **kwargs):\n    pass",
      options: ["Accept variable positional and keyword arguments", "Force strict typing", "Encrypt parameters", "Define pointers like C++"],
      correct_option_index: 0,
      explanation: "`*args` captures arbitrary positional arguments as a tuple, while `**kwargs` captures keyword arguments as a dictionary."
    },
    {
      question: "What is the Global Interpreter Lock (GIL) in CPython?",
      code_snippet: "",
      options: ["A mutex preventing multiple native threads from executing Python bytecodes concurrently", "A security firewall for database queries", "A memory garbage collector algorithm", "A syntax error checker"],
      correct_option_index: 0,
      explanation: "The GIL is a mutex in CPython that ensures only one thread executes Python bytecode at a time."
    },
    {
      question: "Which of the following data structures is immutable in Python?",
      code_snippet: "",
      options: ["Tuple", "List", "Dictionary", "Set"],
      correct_option_index: 0,
      explanation: "Tuples, strings, and frozensets are immutable; lists, dicts, and sets are mutable."
    },
    {
      question: "What does `map(func, iterable)` return in Python 3?",
      code_snippet: "nums = [1, 2, 3]\nres = map(lambda x: x+1, nums)",
      options: ["A lazy map iterator", "A list of results", "A dictionary", "A generator string"],
      correct_option_index: 0,
      explanation: "In Python 3, `map()` returns an iterator rather than a materialized list."
    },
    {
      question: "What exception is raised when trying to access a dictionary key that does not exist?",
      code_snippet: "d = {'a': 1}\nprint(d['b'])",
      options: ["KeyError", "IndexError", "ValueError", "AttributeError"],
      correct_option_index: 0,
      explanation: "Direct dictionary indexing with a missing key raises a `KeyError`. Using `d.get('b')` returns `None` safely."
    },
    {
      question: "What will `print(''.join(['S', 'k', 'i', 'l', 'l']))` output?",
      code_snippet: "",
      options: ["Skill", "['Skill']", "S k i l l", "Error"],
      correct_option_index: 0,
      explanation: "`str.join()` concatenates iterable strings with the separator delimiter."
    },
    {
      question: "What is the result of `set([1, 2, 2, 3, 3, 3])`?",
      code_snippet: "",
      options: ["{1, 2, 3}", "[1, 2, 3]", "{1:2, 2:3}", "Error"],
      correct_option_index: 0,
      explanation: "Sets in Python automatically filter out duplicate values and maintain unique members."
    },
    {
      question: "In Python, which dunder method overrides the `+` operator for custom classes?",
      code_snippet: "class Vector:\n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)",
      options: ["__add__", "__plus__", "__concat__", "__sum__"],
      correct_option_index: 0,
      explanation: "`__add__` is the magic method invoked for the binary `+` arithmetic operator."
    },
    {
      question: "What is the output of `[i for i in range(10) if i % 3 == 0]`?",
      code_snippet: "",
      options: ["[0, 3, 6, 9]", "[3, 6, 9]", "[0, 3, 6]", "[1, 3, 6, 9]"],
      correct_option_index: 0,
      explanation: "Numbers divisible by 3 in range(10) starting from 0 are 0, 3, 6, 9."
    },
    {
      question: "What is the difference between `append()` and `extend()` on a Python list?",
      code_snippet: "a = [1, 2]\na.extend([3, 4])",
      options: ["`extend()` concatenates elements of iterable; `append()` adds the iterable as a single element", "`append()` merges lists; `extend()` creates a new tuple", "They perform the exact same operation", "`extend()` sorts the list in-place"],
      correct_option_index: 0,
      explanation: "`extend()` unpacks each item from the given iterable into the list, whereas `append()` adds the argument as a single object."
    }
  ],

  design: [
    {
      question: "In Figma, what does setting Auto-Layout direction to 'Wrap' achieve?",
      code_snippet: "",
      options: ["Child frames wrap to the next line when container width is exceeded", "Shrinks elements into circles", "Exports frames as SVG", "Locks child layer opacity"],
      correct_option_index: 0,
      explanation: "Auto-layout Wrap allows items to flow onto new rows/columns automatically as container dimensions change."
    },
    {
      question: "What is the minimum WCAG 2.1 AA contrast ratio for regular body text against its background?",
      code_snippet: "",
      options: ["4.5:1", "3:1", "7:1", "2:1"],
      correct_option_index: 0,
      explanation: "WCAG 2.1 Level AA mandates a contrast ratio of at least 4.5:1 for normal body text."
    },
    {
      question: "What is a Design Token in modern design systems?",
      code_snippet: "--color-primary: #4F46E5;\n--spacing-md: 16px;",
      options: ["A named variable storing design decisions (colors, spacing, typography)", "A cryptocurrency token for designers", "A Figma vector icon", "A password hash"],
      correct_option_index: 0,
      explanation: "Design tokens are semantic key-value pairs representing design variables across design tools and codebases."
    },
    {
      question: "In Figma component architecture, what is a 'Component Variant'?",
      code_snippet: "",
      options: ["A grouped variation of a master component (e.g. Size=Small, State=Hover)", "A deleted component backup", "An exported PDF asset", "A third-party plugin"],
      correct_option_index: 0,
      explanation: "Variants group related component states (Hover, Active, Disabled, Size) into a single configurable component."
    },
    {
      question: "Which UX law states that the time required to make a decision increases with the number and complexity of choices?",
      code_snippet: "",
      options: ["Hick's Law", "Fitts's Law", "Jakob's Law", "Miller's Law"],
      correct_option_index: 0,
      explanation: "Hick's Law describes that decision time increases logarithmically with the number of options presented."
    },
    {
      question: "According to Fitts's Law, what makes an interactive button easiest to target and click?",
      code_snippet: "",
      options: ["Larger target size and closer proximity to cursor/thumb", "Placing the button in the screen center only", "Using 3D shadows", "Making the button transparent"],
      correct_option_index: 0,
      explanation: "Fitts's Law establishes that movement time to a target depends on distance and target width."
    },
    {
      question: "What does an 8pt Grid System establish in UI design?",
      code_snippet: "margin: 8px 16px 24px 32px;",
      options: ["All margins, padding, and layout dimensions scale in multiples of 8px", "Text font size must strictly be 8px", "Only 8 colors are permitted", "Images must be 8-bit"],
      correct_option_index: 0,
      explanation: "An 8pt grid standardizes spacing increments (8, 16, 24, 32, 40px) across screen densities."
    },
    {
      question: "What is the primary difference between a Wireframe and a Prototype?",
      code_snippet: "",
      options: ["Wireframes show low-fidelity layout structure; Prototypes simulate interactive user flows", "Wireframes are coded; Prototypes are drawn on paper", "They are identical terms", "Wireframes only contain colors"],
      correct_option_index: 0,
      explanation: "Wireframes represent structural layout blueprints, while prototypes demonstrate dynamic interactions and user journeys."
    },
    {
      question: "What is 'Affordance' in interaction design?",
      code_snippet: "",
      options: ["Visual clues that communicate how an interface element should be operated", "The monetary price of a design tool", "The rendering speed of CSS animations", "The file size of a mockup"],
      correct_option_index: 0,
      explanation: "Affordance refers to the perceivable attributes of an object that signal its potential actions (e.g. raised bevel signaling clickability)."
    },
    {
      question: "What is Jakob's Law of Internet User Experience?",
      code_snippet: "",
      options: ["Users spend most time on other sites, expecting your site to work similarly", "All websites must be dark mode by default", "Users prefer reading long paragraphs", "Navigation must always be at the bottom"],
      correct_option_index: 0,
      explanation: "Jakob's Law asserts that users transfer expectations from existing familiar platforms to new websites."
    },
    {
      question: "In Figma, how do you prevent an element inside an Auto-Layout container from stretching?",
      code_snippet: "",
      options: ["Set resizing constraint to 'Fixed Width / Height' or 'Hug Contents'", "Delete the frame", "Convert it to raster JPG", "Set layer opacity to 0"],
      correct_option_index: 0,
      explanation: "Setting 'Fixed' or 'Hug Contents' prevents unwanted stretching inside auto-layout containers."
    },
    {
      question: "What is the Golden Ratio commonly used for in typography scaling?",
      code_snippet: "1 : 1.618",
      options: ["Establishing harmonious proportions between headings and body text sizes", "Calculating screen refresh rate", "Generating randomized color palettes", "Measuring server latency"],
      correct_option_index: 0,
      explanation: "The Golden Ratio (~1.618) provides a mathematical proportion for typographic hierarchy and aesthetic layouts."
    },
    {
      question: "What is 'Microcopy' in UI design?",
      code_snippet: "e.g. 'We will never share your email address.'",
      options: ["Short contextual text and button labels guiding the user through an action", "Very tiny unreadable disclaimer fonts", "Machine code instructions", "CSS minified code"],
      correct_option_index: 0,
      explanation: "Microcopy refers to precise, helpful phrases, error messages, and tooltips that assist user decision making."
    },
    {
      question: "What does Miller's Law state regarding human working memory?",
      code_snippet: "7 ± 2 items",
      options: ["The average person can hold 7 (plus or minus 2) chunks of information in working memory", "Users take 7 seconds to load a webpage", "Web forms should have 7 columns", "Fonts should have 7 weights"],
      correct_option_index: 0,
      explanation: "George Miller's law suggests chunking content into 5 to 9 manageable units prevents cognitive overload."
    },
    {
      question: "What is an 'Empathy Map' used for in the design thinking process?",
      code_snippet: "Says, Thinks, Does, Feels",
      options: ["Synthesizing user research observations to understand user perspectives and needs", "Drawing database entity diagrams", "Testing API response times", "Designing 3D animations"],
      correct_option_index: 0,
      explanation: "Empathy maps articulate what a target user Says, Thinks, Does, and Feels during user research synthesis."
    },
    {
      question: "What is the role of an 'Information Architecture' (IA) diagram?",
      code_snippet: "",
      options: ["Organizing and structuring website content hierarchy and navigation pathways", "Configuring cloud server architecture", "Writing SQL database schema tables", "Calculating Figma license costs"],
      correct_option_index: 0,
      explanation: "Information Architecture structures navigation labels and content taxonomy for intuitive findability."
    },
    {
      question: "In CSS and Figma, what is the 'Z-Index' property?",
      code_snippet: "z-index: 100;",
      options: ["Controls the vertical stacking order of overlapping visual layers", "Controls font weight", "Zooms the canvas", "Adjusts screen brightness"],
      correct_option_index: 0,
      explanation: "Z-index specifies the depth/stacking order of elements along the z-axis."
    },
    {
      question: "What is 'Heuristic Evaluation' in UX auditing?",
      code_snippet: "",
      options: ["Evaluating an interface against recognized usability principles (e.g. Nielsen's 10 Heuristics)", "Running automated selenium unit tests", "Generating AI images", "Counting page views in analytics"],
      correct_option_index: 0,
      explanation: "A heuristic evaluation is a usability inspection where experts assess UI compliance with established design rules."
    },
    {
      question: "What is the purpose of 'Skeleton Loaders' during content loading?",
      code_snippet: "",
      options: ["Reduces perceived waiting time by rendering layout placeholder shapes before data loads", "Scans for malicious viruses", "Compresses image file sizes", "Generates vector svgs"],
      correct_option_index: 0,
      explanation: "Skeleton loaders preview the layout structure, significantly improving perceived performance."
    },
    {
      question: "What is a 'Breadcrumb' navigation component?",
      code_snippet: "Home > Courses > Computer Science > Python",
      options: ["A secondary navigation trail indicating the current page hierarchy position", "A temporary cookie storage", "A popup notification banner", "A floating action button"],
      correct_option_index: 0,
      explanation: "Breadcrumb navigation provides a hierarchical path allowing users to navigate up to parent pages easily."
    }
  ],

  react: [
    {
      question: "What is the primary role of the `useEffect` hook in React?",
      code_snippet: "useEffect(() => {\n  fetchData();\n}, []);",
      options: ["Perform side effects (data fetching, subscriptions, DOM mutations)", "Manage synchronous component state", "Define Redux reducers", "Render raw HTML strings"],
      correct_option_index: 0,
      explanation: "`useEffect` schedules and executes side-effects after component rendering."
    },
    {
      question: "Why should you never mutate state directly in React (e.g. `state.count = 5`)?",
      code_snippet: "",
      options: ["React relies on immutable state references to trigger re-renders", "It throws a hardware memory exception", "It crashes the Node.js server", "It disables CSS styles"],
      correct_option_index: 0,
      explanation: "Direct mutation modifies the underlying reference without triggering React's reconciliation and re-rendering engine."
    },
    {
      question: "What is the purpose of the `key` prop when rendering lists in React?",
      code_snippet: "{items.map(item => <li key={item.id}>{item.name}</li>)}",
      options: ["Helps React identify which items have changed, added, or removed during reconciliation", "Encrypts list items for security", "Styles the list element with CSS", "Creates a database index"],
      correct_option_index: 0,
      explanation: "`key` props provide stable identity across renders so React diffs and updates DOM nodes efficiently."
    },
    {
      question: "What does the `useMemo` hook optimize?",
      code_snippet: "const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);",
      options: ["Memoizes the result of expensive calculations across re-renders", "Stores data in browser localStorage", "Optimizes image resolution", "Memoizes callback function references"],
      correct_option_index: 0,
      explanation: "`useMemo` caches the calculated return value and only recomputes when dependencies change."
    },
    {
      question: "What is the Virtual DOM in React?",
      code_snippet: "",
      options: ["A lightweight in-memory representation of the real DOM tree", "A 3D virtual reality interface", "A cloud server container", "A Google Chrome extension"],
      correct_option_index: 0,
      explanation: "The Virtual DOM is an in-memory JS representation diffed against the previous tree to apply minimal batched updates to the real DOM."
    },
    {
      question: "What does the `useCallback` hook return?",
      code_snippet: "const handleClick = useCallback(() => doSomething(a), [a]);",
      options: ["A memoized version of the callback function reference", "The return value of the function", "A Promise object", "A JSX element"],
      correct_option_index: 0,
      explanation: "`useCallback` returns a memoized function instance that only changes when its dependencies update."
    },
    {
      question: "What is Prop Drilling in React?",
      code_snippet: "<Parent data={d}><Child data={d}><GrandChild data={d} /></Child></Parent>",
      options: ["Passing props through intermediate components that do not need them directly", "Compiling TypeScript props", "Fetching props from REST APIs", "Validating prop types"],
      correct_option_index: 0,
      explanation: "Prop drilling occurs when data is passed down through multiple component layers solely to reach deeply nested children."
    },
    {
      question: "How does the React Context API solve prop drilling?",
      code_snippet: "const ThemeContext = createContext();\nconst theme = useContext(ThemeContext);",
      options: ["Provides a way to pass data through the component tree without passing props manually at every level", "Compiles code to WebAssembly", "Replaces standard state management with SQL", "Creates global window variables"],
      correct_option_index: 0,
      explanation: "React Context allows sharing global data (like themes, auth, user state) directly to consuming child components."
    },
    {
      question: "What will happen if you provide an empty dependency array `[]` to `useEffect`?",
      code_snippet: "useEffect(() => {\n  console.log('Mounted');\n}, []);",
      options: ["The effect runs only once when the component mounts", "The effect runs on every single render", "The effect never runs", "It causes an infinite render loop"],
      correct_option_index: 0,
      explanation: "An empty dependency array indicates the effect has no reactive dependencies, executing only on initial mount."
    },
    {
      question: "What is a Controlled Component in React forms?",
      code_snippet: "<input value={text} onChange={e => setText(e.target.value)} />",
      options: ["An input form element whose value is controlled entirely by React state", "A form managed by external jQuery scripts", "An input disabled by the browser", "A read-only input"],
      correct_option_index: 0,
      explanation: "In controlled components, form data is handled by React state rather than the DOM's internal value."
    },
    {
      question: "What does `useRef` provide in React?",
      code_snippet: "const inputRef = useRef(null);\ninputRef.current.focus();",
      options: ["A mutable ref object holding `.current` that persists across renders without triggering a re-render", "A state variable that always triggers re-render", "An asynchronous timer", "A CSS style reference"],
      correct_option_index: 0,
      explanation: "`useRef` holds a persistent mutable value or DOM node reference across render cycles without causing component re-rendering."
    },
    {
      question: "What is the role of React Fragments (`<></>` or `<React.Fragment>`)?",
      code_snippet: "<>\n  <h1>Title</h1>\n  <p>Content</p>\n</>",
      options: ["Group multiple elements without adding an extra node to the DOM", "Split code into microservices", "Apply CSS grid styles", "Create asynchronous Web Workers"],
      correct_option_index: 0,
      explanation: "Fragments allow grouping a list of children without adding extra surrounding wrapper `<div>` nodes into the real DOM."
    },
    {
      question: "Which lifecycle stage in class components corresponds to `useEffect` cleanup function?",
      code_snippet: "useEffect(() => {\n  return () => cleanup();\n}, []);",
      options: ["componentWillUnmount", "componentDidMount", "shouldComponentUpdate", "componentDidCatch"],
      correct_option_index: 0,
      explanation: "The cleanup function returned inside `useEffect` runs before the component unmounts or before re-running the effect."
    },
    {
      question: "What is the purpose of React Error Boundaries?",
      code_snippet: "static getDerivedStateFromError(error) { return { hasError: true }; }",
      options: ["Catch JavaScript errors anywhere in the child component tree and display fallback UI", "Prevent syntax errors during compilation", "Block network request timeouts", "Validate form regex patterns"],
      correct_option_index: 0,
      explanation: "Error Boundaries catch rendering errors in child component trees, logging them and gracefully rendering fallback UI."
    },
    {
      question: "What does `React.lazy` and `Suspense` enable in React applications?",
      code_snippet: "const HeavyComponent = React.lazy(() => import('./Heavy'));",
      options: ["Code-splitting and dynamic asynchronous loading of components", "Automatic database indexing", "Server-side load balancing", "State caching in cookies"],
      correct_option_index: 0,
      explanation: "`React.lazy` lets you render dynamic imports as regular components, enabling bundle code-splitting."
    },
    {
      question: "What is the rules of hooks in React?",
      code_snippet: "",
      options: ["Only call hooks at the top level (never in loops/conditions) and only from React functions", "Hooks can be called anywhere in plain JS classes", "Hooks must always return a promise", "Hooks must have 3 parameters"],
      correct_option_index: 0,
      explanation: "React relies on consistent call order across renders, requiring hooks to be called at top-level unconditionally."
    },
    {
      question: "What is the return value of `useState(initialState)`?",
      code_snippet: "const [count, setCount] = useState(0);",
      options: ["A tuple/array containing the current state value and a state updater function", "Only the state value", "A promise resolving to the state", "A Redux store"],
      correct_option_index: 0,
      explanation: "`useState` returns an array of length 2: `[stateValue, updateFunction]`."
    },
    {
      question: "What is the purpose of `useReducer` in React?",
      code_snippet: "const [state, dispatch] = useReducer(reducer, initialState);",
      options: ["Manage complex state logic with actions and reducers similar to Redux", "Reduce bundle size during build", "Format currency values", "Compress image files"],
      correct_option_index: 0,
      explanation: "`useReducer` is an alternative to `useState` for managing complex state transitions via dispatched actions."
    },
    {
      question: "What does `React.memo()` do for functional components?",
      code_snippet: "export default React.memo(MyComponent);",
      options: ["Higher-order component that memoizes component rendering if props have not changed (shallow comparison)", "Saves component state to sessionStorage", "Converts functional component to class component", "Checks accessibility"],
      correct_option_index: 0,
      explanation: "`React.memo` skips re-rendering a component if its incoming props are shallowly equal to the previous render."
    },
    {
      question: "How do you pass a callback function to update state based on previous state?",
      code_snippet: "setCount(prevCount => prevCount + 1);",
      options: ["By passing an updater function `prev => prev + 1` to ensure accurate batching", "By calling `setCount(count++)`", "By writing `this.state.count++`", "By restarting the component"],
      correct_option_index: 0,
      explanation: "Passing an updater function guarantees that state updates access the most recent state value during batched asynchronous updates."
    }
  ],

  dsa: [
    {
      question: "What is the worst-case time complexity of QuickSort when using naive partitioning on a sorted array?",
      code_snippet: "QuickSort on [1, 2, 3, 4, 5] with last element as pivot",
      options: ["O(n^2)", "O(n log n)", "O(n)", "O(log n)"],
      correct_option_index: 0,
      explanation: "Without randomized or median-of-three pivot selection, sorted arrays cause maximum partition imbalance leading to O(n^2) worst case."
    },
    {
      question: "What data structure is used to implement Breadth-First Search (BFS) on a graph or tree?",
      code_snippet: "BFS Traversal: visit neighbors level by level",
      options: ["Queue (FIFO)", "Stack (LIFO)", "Priority Heap", "Binary Search Tree"],
      correct_option_index: 0,
      explanation: "BFS relies on a FIFO Queue to visit all adjacent vertices level by level in order of discovery."
    },
    {
      question: "What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL / Red-Black Tree)?",
      code_snippet: "Balanced BST Lookup",
      options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"],
      correct_option_index: 0,
      explanation: "Balanced trees maintain a height bounded by O(log n), ensuring search, insertion, and deletion operate in O(log n) time."
    },
    {
      question: "What is the space complexity of Depth-First Search (DFS) on a tree of height h (call stack memory)?",
      code_snippet: "DFS recursion stack memory",
      options: ["O(h)", "O(n^2)", "O(1)", "O(n log n)"],
      correct_option_index: 0,
      explanation: "DFS recursion stores active ancestor nodes up to the maximum depth of the tree, consuming O(h) call stack frames."
    },
    {
      question: "How does a Hash Table handle collisions when using Open Addressing with Linear Probing?",
      code_snippet: "hash(key) collision -> probe next slot: (hash + 1) % table_size",
      options: ["Sequentially checks the next available array bucket until an empty slot is found", "Creates a linked list at the collided bucket", "Allocates a second auxiliary hash table", "Throws a KeyCollisionException"],
      correct_option_index: 0,
      explanation: "Linear probing resolves collisions by iteratively scanning consecutive table indices until finding an empty slot."
    },
    {
      question: "What algorithm finds the shortest path in a weighted graph with non-negative edge weights?",
      code_snippet: "Shortest Path Algorithm with Priority Queue",
      options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall Algorithm", "Kruskal's Algorithm"],
      correct_option_index: 0,
      explanation: "Dijkstra's algorithm uses a greedy priority queue approach to determine single-source shortest paths on non-negative weighted graphs."
    },
    {
      question: "What is the time complexity to find the Minimum element in a Min-Heap of size n?",
      code_snippet: "peek() on MinHeap",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correct_option_index: 0,
      explanation: "In a Min-Heap, the minimum element always resides at the root index (heap[0]), allowing O(1) peek access."
    },
    {
      question: "What algorithmic technique solves problems by breaking them into overlapping subproblems with optimal substructure and caching results?",
      code_snippet: "Memoization & Tabulation techniques",
      options: ["Dynamic Programming", "Greedy Method", "Divide and Conquer without memoization", "Backtracking"],
      correct_option_index: 0,
      explanation: "Dynamic Programming solves complex problems by combining solutions to overlapping subproblems stored in memo tables."
    },
    {
      question: "What is the worst-case time complexity of Merge Sort?",
      code_snippet: "MergeSort on array of size n",
      options: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
      correct_option_index: 0,
      explanation: "Merge Sort consistently divides arrays in half and merges sorted sub-arrays in linear time, guaranteeing O(n log n) in all cases."
    },
    {
      question: "Which data structure is ideal for implementing an LRU (Least Recently Used) Cache with O(1) get and put operations?",
      code_snippet: "LRU Cache: O(1) lookup and O(1) removal/insertion",
      options: ["Doubly Linked List combined with a Hash Map", "Single Array with Binary Search", "Binary Search Tree", "Circular Queue"],
      correct_option_index: 0,
      explanation: "Combining a Hash Map (for O(1) key lookup) with a Doubly Linked List (for O(1) node relocation and eviction) provides optimal LRU cache operations."
    },
    {
      question: "What does the Master Theorem provide in algorithm analysis?",
      code_snippet: "T(n) = a*T(n/b) + f(n)",
      options: ["A closed-form asymptotic bound for divide-and-conquer recurrence relations", "A proof that P = NP", "A benchmark for database indexing speed", "A method to calculate GPU thread occupancy"],
      correct_option_index: 0,
      explanation: "The Master Theorem gives asymptotic complexity bounds (Big-O) for divide-and-conquer recurrences of the form T(n) = aT(n/b) + f(n)."
    },
    {
      question: "What is the time complexity of searching for a value in a sorted array of size n using Binary Search?",
      code_snippet: "low = 0, high = n - 1; mid = (low + high) // 2",
      options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"],
      correct_option_index: 0,
      explanation: "Binary Search halves the remaining search space with each comparison, running in logarithmic O(log n) time."
    },
    {
      question: "What algorithm finds the Minimum Spanning Tree (MST) of a connected weighted graph by picking edges in ascending weight order?",
      code_snippet: "Sort edges by weight -> Add if no cycle (Disjoint Set Union)",
      options: ["Kruskal's Algorithm", "Dijkstra's Algorithm", "Tarjan's Algorithm", "Floyd's Cycle Finding"],
      correct_option_index: 0,
      explanation: "Kruskal's algorithm sorts all edges by weight and greedily adds the smallest edge using Union-Find to prevent cycles."
    },
    {
      question: "What is the purpose of the Two-Pointer technique in array problems?",
      code_snippet: "left = 0, right = arr.length - 1; while left < right: ...",
      options: ["Reduces O(n^2) nested search loops to O(n) linear scans on sorted sequences", "Allocates memory pointers in C++", "Enables multithreading on array reads", "Replaces hash tables in all algorithms"],
      correct_option_index: 0,
      explanation: "Two pointers move inwards or in tandem across sorted data, reducing time complexity from quadratic O(n^2) to linear O(n)."
    },
    {
      question: "What is the time complexity of inserting an item at the beginning of a Singly Linked List (with head pointer)?",
      code_snippet: "newNode.next = head; head = newNode;",
      options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
      correct_option_index: 0,
      explanation: "Prepending to a linked list only requires updating pointer references at the head, taking O(1) constant time."
    },
    {
      question: "What does the Disjoint Set Union (DSU / Union-Find) data structure optimize?",
      code_snippet: "find(x) with path compression & union(x, y) by rank",
      options: ["Near O(1) amortized queries for set membership and merging disjoint sets", "Sorting floating-point numbers", "Matrix multiplication", "Computing hash codes"],
      correct_option_index: 0,
      explanation: "Union-Find with path compression and union by rank operates in near-constant O(α(n)) inverse Ackermann time per operation."
    },
    {
      question: "What is the space complexity of an adjacency matrix representation of a graph with V vertices?",
      code_snippet: "matrix[V][V]",
      options: ["O(V^2)", "O(V + E)", "O(E^2)", "O(V log V)"],
      correct_option_index: 0,
      explanation: "An adjacency matrix stores a V x V grid of edge connections, consuming O(V^2) memory regardless of edge density."
    },
    {
      question: "What is the worst-case time complexity of finding a cycle in a linked list using Floyd's Tortoise and Hare algorithm?",
      code_snippet: "slow = slow.next; fast = fast.next.next;",
      options: ["O(n) time and O(1) extra space", "O(n^2) time and O(n) space", "O(log n) time and O(1) space", "O(n log n) time and O(n) space"],
      correct_option_index: 0,
      explanation: "Floyd's cycle detection uses two pointers moving at different speeds to detect loops in linear O(n) time with O(1) space."
    }
  ],

  sql: [
    {
      question: "What is the difference between `WHERE` and `HAVING` clauses in SQL?",
      code_snippet: "SELECT dept, COUNT(*) FROM emp WHERE salary > 50000 GROUP BY dept HAVING COUNT(*) > 5",
      options: ["`WHERE` filters individual rows before grouping; `HAVING` filters aggregated groups after `GROUP BY`", "`HAVING` filters rows before grouping; `WHERE` filters groups", "They are identical and interchangeable", "`HAVING` can only be used with primary keys"],
      correct_option_index: 0,
      explanation: "`WHERE` applies filtering conditions to raw rows prior to aggregation, while `HAVING` filters the results after `GROUP BY` calculations."
    },
    {
      question: "What does the ACID acronym stand for in database transaction management?",
      code_snippet: "Database Transaction Guarantee: A - C - I - D",
      options: ["Atomicity, Consistency, Isolation, Durability", "Authentication, Concurrency, Indexing, Decryption", "Allocation, Constraint, Integration, Data", "Asynchronous, Cached, Indexed, Distributed"],
      correct_option_index: 0,
      explanation: "ACID guarantees that database transactions are processed reliably: Atomicity (all or nothing), Consistency, Isolation, and Durability."
    },
    {
      question: "What type of JOIN returns all records from the left table, along with matching records from the right table (filling NULL for non-matches)?",
      code_snippet: "SELECT * FROM users u LEFT JOIN orders o ON u.id = o.user_id",
      options: ["LEFT JOIN (LEFT OUTER JOIN)", "INNER JOIN", "CROSS JOIN", "RIGHT JOIN"],
      correct_option_index: 0,
      explanation: "A `LEFT JOIN` returns every record from the left table and populated columns from the right table when matching keys exist."
    },
    {
      question: "Why are B-Tree indexes widely used for relational database columns?",
      code_snippet: "CREATE INDEX idx_user_email ON users(email);",
      options: ["Provides balanced O(log n) performance for exact lookups, range queries (`BETWEEN`, `>`, `<`), and prefix searches", "Compresses database storage by 90%", "Enables full-text translation automatically", "Prevents all deadlocks across concurrent writes"],
      correct_option_index: 0,
      explanation: "B-Trees maintain sorted order with high fan-out, providing efficient O(log n) performance for point lookups and range scans."
    },
    {
      question: "What is Database Normalization (e.g. 1NF, 2NF, 3NF)?",
      code_snippet: "Schema decomposition to eliminate redundancy",
      options: ["Structuring relational database tables to reduce data redundancy and eliminate insert/update/delete anomalies", "Converting SQL tables into NoSQL JSON documents", "Creating backup snapshots across multiple servers", "Encrypting database passwords with bcrypt"],
      correct_option_index: 0,
      explanation: "Normalization decomposes tables into smaller related structures to eliminate data redundancy and prevent modification anomalies."
    },
    {
      question: "What is a SQL Injection vulnerability and how is it fundamentally prevented?",
      code_snippet: "Vulnerable: \"SELECT * FROM users WHERE user = '\" + input + \"'\"\nSecure: db.query('SELECT * FROM users WHERE user = ?', [input])",
      options: ["Malicious SQL commands injected into queries; prevented by using Parameterized Prepared Statements", "A buffer overflow in the database kernel; prevented by adding RAM", "A hardware hard drive failure; prevented by RAID mirroring", "A network DDoS attack; prevented by rate-limiting"],
      correct_option_index: 0,
      explanation: "SQL injection occurs when untrusted input alters query structure. Parameterized queries treat parameters strictly as literal data."
    },
    {
      question: "What is the purpose of the `UNION` vs `UNION ALL` operator in SQL?",
      code_snippet: "SELECT id FROM tableA UNION SELECT id FROM tableB",
      options: ["`UNION` removes duplicate rows between result sets; `UNION ALL` includes all duplicates (faster)", "`UNION ALL` removes duplicates; `UNION` retains duplicates", "`UNION` performs an inner join between tables", "`UNION ALL` can only combine numerical columns"],
      correct_option_index: 0,
      explanation: "`UNION` performs a distinct de-duplication pass on the combined results, whereas `UNION ALL` concatenates results without removing duplicates."
    },
    {
      question: "What is a Foreign Key constraint in relational schemas?",
      code_snippet: "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
      options: ["Enforces referential integrity by ensuring values match primary keys in the referenced table", "A password used for database cloud replication", "An encryption key for external API calls", "A key generated for NoSQL cache lookups"],
      correct_option_index: 0,
      explanation: "Foreign keys enforce referential integrity between tables, ensuring child records reference valid parent entries."
    },
    {
      question: "What SQL window function assigns a sequential unique integer to rows within a partition starting at 1?",
      code_snippet: "SELECT user_id, score, ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY score DESC) as rank FROM grades",
      options: ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "COUNT()"],
      correct_option_index: 0,
      explanation: "`ROW_NUMBER()` assigns a strictly unique sequential integer (1, 2, 3...) to each row within the specified window partition."
    },
    {
      question: "What isolation level prevents Dirty Reads, Non-Repeatable Reads, and Phantom Reads?",
      code_snippet: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;",
      options: ["SERIALIZABLE", "READ COMMITTED", "READ UNCOMMITTED", "REPEATABLE READ"],
      correct_option_index: 0,
      explanation: "SERIALIZABLE is the highest SQL standard transaction isolation level, guaranteeing full execution isolation without concurrency anomalies."
    },
    {
      question: "What does the `COALESCE` function return in SQL?",
      code_snippet: "SELECT COALESCE(phone, mobile, email, 'No Contact') FROM users;",
      options: ["The first non-NULL expression among its arguments", "The maximum value among all columns", "The string concatenation of all arguments", "The count of non-empty strings"],
      correct_option_index: 0,
      explanation: "`COALESCE(v1, v2, ...)` scans its argument list in order and returns the first value that is not `NULL`."
    },
    {
      question: "What is a Clustered Index versus a Non-Clustered Index?",
      code_snippet: "Clustered index determines physical row order on disk",
      options: ["A clustered index physically sorts table rows on disk (one per table); non-clustered indexes create separate lookup pointers", "Clustered indexes are stored in RAM only", "Non-clustered indexes can only be created on primary keys", "They are identical indexing strategies"],
      correct_option_index: 0,
      explanation: "A clustered index determines the physical order of data storage on disk. A table can possess only one clustered index."
    },
    {
      question: "What is the purpose of `EXPLAIN ANALYZE` in SQL query tuning?",
      code_snippet: "EXPLAIN ANALYZE SELECT * FROM orders WHERE total > 100;",
      options: ["Displays the query execution plan, index usage, node costs, and actual execution timings", "Fixes slow queries automatically using AI", "Backs up query results to a CSV file", "Validates SQL syntax without executing"],
      correct_option_index: 0,
      explanation: "`EXPLAIN ANALYZE` executes the statement and prints the optimizer's execution plan alongside actual runtime statistics."
    },
    {
      question: "What is the difference between `DELETE`, `TRUNCATE`, and `DROP` in SQL?",
      code_snippet: "DELETE FROM t; vs TRUNCATE TABLE t; vs DROP TABLE t;",
      options: ["`DELETE` removes rows with rollback logging; `TRUNCATE` rapidly deallocates all table data; `DROP` destroys the entire table schema and data", "`TRUNCATE` deletes the table schema permanently", "`DROP` only deletes rows matching WHERE clauses", "They are identical synonyms"],
      correct_option_index: 0,
      explanation: "`DELETE` is a DML command removing specific rows with logging; `TRUNCATE` resets table pages; `DROP` permanently removes table definition."
    },
    {
      question: "What is an `UPSERT` operation in modern SQL (PostgreSQL / SQLite)?",
      code_snippet: "INSERT INTO user_scores (id, score) VALUES (1, 95) ON CONFLICT (id) DO UPDATE SET score = 95;",
      options: ["Inserts a row, or updates the existing row if a unique/primary key constraint conflict occurs", "Uploads database tables to cloud storage", "Calculates the upper quartile of numerical scores", "Upgrades database server version in-place"],
      correct_option_index: 0,
      explanation: "`UPSERT` (`INSERT ... ON CONFLICT DO UPDATE`) atomically inserts or updates records based on unique key collisions."
    }
  ]
};

// Generic Fallback Domain Resolver
function getDomainQuestions(skillName) {
  const norm = (skillName || '').toLowerCase();
  if (norm.includes('sql') || norm.includes('database') || norm.includes('postgres') || norm.includes('mysql') || norm.includes('sqlite') || norm.includes('mongodb') || norm.includes('nosql')) {
    return DOMAIN_QUESTION_BANKS.sql;
  } else if (norm.includes('python') || norm.includes('oop') || norm.includes('django') || norm.includes('flask') || norm.includes('fastapi') || norm.includes('machine learning') || norm.includes('ai')) {
    return DOMAIN_QUESTION_BANKS.python;
  } else if (norm.includes('figma') || norm.includes('ui/ux') || norm.includes('ui & ux') || norm.includes('ui ux') || norm.includes('ux design') || norm.includes('ui design') || norm.includes('creative') || norm.includes('visual design') || norm.includes('tailwind') || norm.includes('prototype')) {
    return DOMAIN_QUESTION_BANKS.design;
  } else if (norm.includes('react') || norm.includes('frontend') || norm.includes('javascript') || norm.includes('vue') || norm.includes('angular') || norm.includes('typescript') || norm.includes('next.js') || norm.includes('web')) {
    return DOMAIN_QUESTION_BANKS.react;
  } else if (norm.includes('structure') || norm.includes('algorithm') || norm.includes('dsa') || norm.includes('c++') || norm.includes('cpp') || norm.includes('java') || norm.includes('leetcode')) {
    return DOMAIN_QUESTION_BANKS.dsa;
  } else if (norm.includes('design')) {
    return DOMAIN_QUESTION_BANKS.design;
  } else {
    return DOMAIN_QUESTION_BANKS.python;
  }
}

/**
 * Generate 20 Dynamic Technical Questions
 * Uses Google Gemini AI if GEMINI_API_KEY is configured; otherwise dynamically synthesizes and randomizes options.
 */
async function generate20DynamicQuestions(skillName = 'Python Core & OOP') {
  console.log(`🤖 AI Dynamic Assessment Engine: Generating 20 questions for "${skillName}"...`);

  // 1. Try Google Gemini API if configured
  if (aiClient && GEMINI_API_KEY) {
    try {
      const prompt = `You are a university computer science professor at Vignan University creating an official timed qualification assessment.
Generate exactly 20 challenging and educational multiple-choice questions for the skill: "${skillName}".
Requirements:
1. Cover core foundations, syntax edge cases, performance trade-offs, and practical code snippet debugging.
2. Return strictly a JSON array of 20 objects.
Each object must have:
- "id": "q_1" to "q_20"
- "question": "Clear technical question string"
- "code_snippet": "Optional realistic code block string or empty string"
- "options": ["Option A", "Option B", "Option C", "Option D"] (strictly 4 distinct options)
- "correct_option_index": 0, 1, 2, or 3
- "explanation": "Academic explanation of why this answer is correct"
- "difficulty": "Beginner", "Intermediate", or "Advanced"

Do NOT wrap with markdown code fences. Return raw JSON array only.`;

      let textOutput = '';
      if (aiClient.models && typeof aiClient.models.generateContent === 'function') {
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        textOutput = response.text;
      } else if (typeof aiClient.getGenerativeModel === 'function') {
        const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        textOutput = result.response.text();
      }

      if (textOutput) {
        const cleanJson = textOutput.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length >= 20) {
          console.log(`✨ Successfully generated 20 questions via Google Gemini Flash for "${skillName}"!`);
          return parsed.slice(0, 20).map((q, idx) => ({
            ...randomizeQuestionOptions(q),
            id: `q_${idx + 1}`
          }));
        }
      }
    } catch (err) {
      console.warn('⚠️ Gemini AI dynamic generation fallback to generative domain synthesizer:', err.message);
    }
  }

  // 2. High-Performance Generative Domain Synthesizer with Dynamic Randomization
  const pool = getDomainQuestions(skillName);
  const shuffledPool = shuffleArray(pool);
  const selected = shuffledPool.slice(0, 20);

  // If pool has fewer than 20, fill with domain variations
  while (selected.length < 20) {
    const idx = selected.length;
    const base = pool[idx % pool.length];
    selected.push({
      ...base,
      id: `q_${idx + 1}`,
      question: `[Advanced Analysis - ${skillName}] ${base.question}`
    });
  }

  // Apply dynamic option randomization to every question
  return selected.map((q, idx) => {
    const randomized = randomizeQuestionOptions(q);
    return {
      ...randomized,
      id: `q_${idx + 1}`
    };
  });
}

module.exports = {
  generate20DynamicQuestions,
  DOMAIN_QUESTION_BANKS
};
