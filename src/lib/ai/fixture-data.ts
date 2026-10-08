// Deterministic demo content for fixture mode: a hand-written "Python for data
// analysis" course. It is used only when no Gemma key is configured (or fixture
// mode is forced) and the UI labels it as fixture content. It is not model output.

export type Tag = [code: string, suspectedSkillKey: string | null, note: string];

export interface FixtureMcq {
  p: string;
  o: string[];
  c: number;
  h: string;
  e: string;
  d?: "easy" | "medium" | "hard";
  tags?: Record<number, Tag>;
}

export interface FixtureShort {
  p: string;
  /** [criterion shown to the learner, keywords that satisfy it] */
  rubric: [string, string[]][];
  h: string;
  e: string;
}

export interface FixtureSkill {
  key: string;
  title: string;
  objective: string;
  contribution: string;
  minutes: number;
  query: string;
  prereqs: string[];
  analogy: string;
  recap: string;
  sections: [heading: string, body: string][];
  example: [title: string, body: string];
  short: FixtureShort;
  mcq: FixtureMcq[];
}

const VALUE_AS_INDEX: Tag = [
  "value_as_index",
  "list-indexing",
  "Used an item's value where its position (index) was needed.",
];
const ONE_BASED: Tag = ["one_based_indexing", "list-indexing", "Counted positions from 1 instead of 0."];

export const FIXTURE_SKILLS: FixtureSkill[] = [
  {
    key: "variables-types",
    title: "Variables and data types",
    objective: "Store values in named variables and recognise int, float, str and bool.",
    contribution: "Every dataset you analyse is made of values with types; variables are how you hold them.",
    minutes: 15,
    query: "python tutorial variables numbers strings beginners",
    prereqs: [],
    analogy: "A variable is a labelled jar: the label is the name, the contents are the value.",
    recap: "No prerequisites. You only need to be able to run a line of Python.",
    sections: [
      [
        "Names point at values",
        "The `=` sign assigns: the value on the right is stored under the name on the left.\n\n```python\nrows = 120\nprice = 4.5\ncity = \"Pune\"\n```\n\nAssigning again replaces the old value: after `rows = rows + 1`, `rows` is 121.",
      ],
      [
        "Every value has a type",
        "`int` is a whole number, `float` has a decimal point, `str` is text in quotes and `bool` is `True` or `False`. Use `type(x)` to check. Division with `/` always gives a float, and `int(\"42\")` converts text to a number.",
      ],
    ],
    example: [
      "Total price of an order",
      "```python\nquantity = 3\nunit_price = 2.5\ntotal = quantity * unit_price\nprint(total)        # 7.5\nprint(type(total))  # <class 'float'>\n```\n\nAn int times a float gives a float.",
    ],
    short: {
      p: "Explain the difference between `=` and `==` in Python, with a short example of each.",
      rubric: [
        ["Says = assigns a value to a name", ["assign", "store", "set", "give"]],
        ["Says == compares two values", ["compar", "equal", "check", "test"]],
      ],
      h: "One of them changes a variable; the other answers a yes/no question.",
      e: "`x = 5` stores 5 in x. `x == 5` compares x with 5 and gives True or False.",
    },
    mcq: [
      {
        p: "What does this print?\n\n```python\nx = 5\nx = x + 2\nprint(x)\n```",
        o: ["5", "7", "52", "An error"],
        c: 1,
        d: "easy",
        h: "The right-hand side is computed first, then stored back in x.",
        e: "x + 2 is 7, and that result replaces the old value of x.",
      },
      {
        p: "What is the value and type of `3 / 2`?",
        o: ["1 (int)", "1.5 (float)", "2 (int)", "'3/2' (str)"],
        c: 1,
        h: "The `/` operator never rounds.",
        e: "`/` is true division and always returns a float: 1.5.",
      },
      {
        p: "What is the result of `int(\"42\") + 1`?",
        o: ["'421'", "43", "An error", "42"],
        c: 1,
        h: "int() converts the text first.",
        e: "int(\"42\") is the number 42, so the sum is 43.",
      },
      {
        p: "Which of these is a valid variable name?",
        o: ["2nd_value", "second-value", "second_value", "class"],
        c: 2,
        h: "Names cannot start with a digit, contain a minus sign, or be a keyword.",
        e: "second_value uses only letters and underscores. `class` is a reserved keyword.",
      },
    ],
  },
  {
    key: "operators-expressions",
    title: "Operators and expressions",
    objective: "Combine values with arithmetic and comparison operators and predict the result.",
    contribution: "Analysis is mostly arithmetic and comparisons applied to columns of values.",
    minutes: 15,
    query: "python arithmetic operators comparison operators tutorial",
    prereqs: ["variables-types"],
    analogy: "An expression is a small calculation Python reduces to a single value.",
    recap: "You can assign values to variables and know int, float and str.",
    sections: [
      [
        "Arithmetic operators",
        "`+ - * /` work as expected. `//` is floor division (drops the fraction), `%` gives the remainder and `**` is a power.\n\n```python\n7 // 2   # 3\n7 % 2    # 1\n2 ** 3   # 8\n```\n\nMultiplication and division happen before addition and subtraction; use parentheses to change the order.",
      ],
      [
        "Comparisons give booleans",
        "`== != < <= > >=` compare two values and return `True` or `False`. Combine them with `and`, `or` and `not`: `x > 3 and x < 10` is True only when both sides are True.",
      ],
    ],
    example: [
      "Is a number even?",
      "```python\nn = 14\nis_even = n % 2 == 0\nprint(is_even)  # True\n```\n\n`n % 2` is the remainder after dividing by 2; an even number leaves 0.",
    ],
    short: {
      p: "What does `10 % 3` evaluate to, and what does the `%` operator compute?",
      rubric: [
        ["Gives the value 1", ["1"]],
        ["Says % gives the remainder of a division", ["remainder", "left over", "leftover", "modulo"]],
      ],
      h: "3 goes into 10 three times. What is left?",
      e: "10 = 3 * 3 + 1, so the remainder is 1.",
    },
    mcq: [
      {
        p: "What is `7 // 2`?",
        o: ["3.5", "3", "4", "1"],
        c: 1,
        h: "`//` drops the fractional part.",
        e: "Floor division gives 3; the remainder 1 is discarded.",
      },
      {
        p: "What is `2 + 3 * 4`?",
        o: ["20", "14", "24", "9"],
        c: 1,
        h: "Multiplication happens before addition.",
        e: "3 * 4 = 12 first, then 2 + 12 = 14.",
      },
      {
        p: "What is `7 % 2`?",
        o: ["3", "0", "1", "3.5"],
        c: 2,
        h: "It is the remainder after dividing 7 by 2.",
        e: "7 = 2 * 3 + 1, so the remainder is 1.",
      },
    ],
  },
  {
    key: "strings",
    title: "Working with strings",
    objective: "Create, combine and clean up text values with common string methods.",
    contribution: "Real data files are full of text that needs cleaning before analysis.",
    minutes: 15,
    query: "python strings methods tutorial split strip upper",
    prereqs: ["variables-types"],
    analogy: "A string is a row of characters, like beads on a thread.",
    recap: "You know that text values are written in quotes and have type str.",
    sections: [
      [
        "Building strings",
        "Join strings with `+`, or put values inside an f-string:\n\n```python\nname = \"Ada\"\ngreeting = f\"Hello, {name}!\"\n```\n\n`len(text)` gives the number of characters.",
      ],
      [
        "Cleaning text",
        "Methods return a new string: `text.strip()` removes surrounding spaces, `text.lower()` and `text.upper()` change case, `text.replace(\"a\", \"b\")` swaps text and `text.split(\",\")` cuts a string into a list of parts.",
      ],
    ],
    example: [
      "Cleaning a city name",
      "```python\nraw = \"  PUNE \"\nclean = raw.strip().title()\nprint(clean)  # Pune\n```\n\nMethods can be chained: strip first, then fix the capitalisation.",
    ],
    short: {
      p: "Given `first = \"Ada\"` and `last = \"Lovelace\"`, write an expression that produces `\"Ada Lovelace\"`.",
      rubric: [
        ["Combines the two variables with + or an f-string", ["+", "f\"", "f'", "format", "join"]],
        ["Puts a space between the names", ["\" \"", "' '", "{first} {last}"]],
      ],
      h: "You need three pieces: first, a space, and last.",
      e: "`first + \" \" + last` or `f\"{first} {last}\"`.",
    },
    mcq: [
      {
        p: "What is `len(\"pandas\")`?",
        o: ["5", "6", "7", "An error"],
        c: 1,
        h: "Count the characters.",
        e: "p-a-n-d-a-s is six characters.",
      },
      {
        p: "What does `\"a,b,c\".split(\",\")` return?",
        o: ["'abc'", "['a', 'b', 'c']", "['a,b,c']", "('a', 'b', 'c')"],
        c: 1,
        h: "split cuts the string at each separator and returns a list.",
        e: "The commas are removed and the three parts become list items.",
      },
      {
        p: "What does `\"  hi \".strip()` return?",
        o: ["'hi'", "'  hi'", "'h i'", "'HI'"],
        c: 0,
        h: "strip removes spaces at both ends.",
        e: "Leading and trailing whitespace is removed, leaving 'hi'.",
      },
    ],
  },
  {
    key: "lists",
    title: "Lists",
    objective: "Create lists, add items and measure their length.",
    contribution: "A column of data is a sequence of values; lists are Python's basic sequence.",
    minutes: 15,
    query: "python lists tutorial append len beginners",
    prereqs: ["variables-types"],
    analogy: "A list is a numbered row of lockers, each holding one value.",
    recap: "You can store single values in variables.",
    sections: [
      [
        "One name, many values",
        "Square brackets create a list:\n\n```python\ntemps = [18, 21, 25]\n```\n\nThe items keep their order. `len(temps)` is 3.",
      ],
      [
        "Changing a list",
        "`temps.append(19)` adds an item at the end. `temps + [30]` builds a new, longer list. `sum(temps)`, `min(temps)` and `max(temps)` summarise numeric lists.",
      ],
    ],
    example: [
      "Average temperature",
      "```python\ntemps = [18, 21, 25]\ntemps.append(20)\naverage = sum(temps) / len(temps)\nprint(average)  # 21.0\n```",
    ],
    short: {
      p: "Describe one difference between a list and a variable holding a single number, and say when you would use a list.",
      rubric: [
        ["Says a list holds several values", ["multiple", "several", "many", "collection", "more than one"]],
        ["Mentions order or position", ["order", "position", "index", "sequence"]],
      ],
      h: "Think about a whole column of measurements.",
      e: "A list keeps many values in order under one name, for example every temperature in a week.",
    },
    mcq: [
      {
        p: "What does this print?\n\n```python\nnums = [3, 1, 2]\nnums.append(5)\nprint(len(nums))\n```",
        o: ["3", "4", "5", "An error"],
        c: 1,
        d: "easy",
        h: "append adds one item.",
        e: "The list had 3 items and gained one, so its length is 4.",
      },
      {
        p: "Which of these creates a list?",
        o: ["{1, 2, 3}", "(1, 2, 3)", "[1, 2, 3]", "'1, 2, 3'"],
        c: 2,
        h: "Lists use square brackets.",
        e: "Square brackets make a list; the others are a set, a tuple and a string.",
      },
      {
        p: "What is `[1, 2] + [3]`?",
        o: ["[1, 2, 3]", "[4, 5]", "[[1, 2], 3]", "An error"],
        c: 0,
        h: "+ joins two lists end to end.",
        e: "Concatenation produces one list containing all three items.",
      },
    ],
  },
  {
    key: "list-indexing",
    title: "Indexing and slicing",
    objective: "Read and change list items by position, counting from 0, and take slices.",
    contribution: "Picking rows and columns by position is the basis of selecting data later in pandas.",
    minutes: 20,
    query: "python list indexing slicing zero based tutorial",
    prereqs: ["lists"],
    analogy: "The index is the locker number; the value is what is inside the locker.",
    recap: "You can create a list and know that its items stay in order.",
    sections: [
      [
        "Positions start at 0",
        "Each item has an index: its position, counted from 0.\n\n```python\ntemps = [18, 21, 25, 19]\ntemps[0]   # 18  (first item)\ntemps[1]   # 21\ntemps[-1]  # 19  (last item)\n```\n\nThe index says *where*; the value is *what is stored there*. `temps[21]` is an error: 21 is a value, not a position.",
      ],
      [
        "Slices and assignment",
        "`temps[1:3]` gives the items at positions 1 and 2 (the end position is not included). Assigning to a position replaces that item: `temps[0] = 17`. Asking for a position that does not exist raises `IndexError`.",
      ],
    ],
    example: [
      "First, last and middle readings",
      "```python\ntemps = [18, 21, 25, 19]\nfirst = temps[0]            # 18\nlast = temps[len(temps)-1]  # 19, same as temps[-1]\nmiddle = temps[1:3]         # [21, 25]\n```\n\nThe last valid index is always `len(temps) - 1`.",
    ],
    short: {
      p: "In your own words, what is the difference between an item's index and its value? Use `prices = [5, 9, 12]` as your example.",
      rubric: [
        ["Says the index is the position of an item", ["position", "place", "location", "where"]],
        ["Says positions start at 0", ["0", "zero"]],
        ["Says the value is what is stored at that position", ["value", "stored", "item", "element", "content"]],
      ],
      h: "What is prices[1]? Which part of that expression is the index?",
      e: "In prices[1], 1 is the index (second position, counting from 0) and 9 is the value stored there.",
    },
    mcq: [
      {
        p: "Given `temps = [18, 21, 25, 19]`, what is `temps[1]`?",
        o: ["18", "21", "25", "19"],
        c: 1,
        h: "Count positions starting from 0.",
        e: "Index 0 is 18, so index 1 is 21.",
        tags: { 0: ["one_based_indexing", null, "Counted positions from 1 instead of 0."] },
      },
      {
        p: "Given `temps = [18, 21, 25, 19]`, what is `temps[-1]`?",
        o: ["18", "19", "An error", "-1"],
        c: 1,
        h: "Negative indexes count from the end.",
        e: "-1 is the last item, 19.",
      },
      {
        p: "Given `temps = [18, 21, 25, 19]`, what is `temps[1:3]`?",
        o: ["[21, 25]", "[21, 25, 19]", "[18, 21, 25]", "[18, 21]"],
        c: 0,
        h: "The end position of a slice is not included.",
        e: "Positions 1 and 2 are 21 and 25; position 3 is excluded.",
      },
      {
        p: "Given `names = [\"Ana\", \"Ben\", \"Cy\"]`, which expression gives `\"Ana\"`?",
        o: ["names[1]", "names[0]", "names[\"Ana\"]", "names.Ana"],
        c: 1,
        h: "Which position is the first item at?",
        e: "The first item is at index 0. A list cannot be indexed by one of its values.",
      },
      {
        p: "Given `scores = [70, 85, 90]`, which line changes 85 to 88?",
        o: ["scores[85] = 88", "scores[1] = 88", "scores[2] = 88", "scores.85 = 88"],
        c: 1,
        h: "You need the position of 85, not the number 85 itself.",
        e: "85 is stored at index 1, so scores[1] = 88 replaces it.",
      },
      {
        p: "Given `letters = [\"a\", \"b\", \"c\", \"d\"]`, what is `letters[2]`?",
        o: ["'b'", "'c'", "'d'", "An error"],
        c: 1,
        h: "Index 0 is 'a'.",
        e: "Counting from 0: a, b, c. Index 2 is 'c'.",
      },
      {
        p: "Given `data = [4, 8, 15, 16]`, what is `data[len(data) - 1]`?",
        o: ["15", "16", "An error", "4"],
        c: 1,
        h: "len(data) is 4. What is the last valid index?",
        e: "len(data) - 1 is 3, the index of the last item, 16.",
      },
      {
        p: "Given `cities = [\"Pune\", \"Kochi\", \"Delhi\"]`, what is the index of `\"Kochi\"`?",
        o: ["0", "1", "2", "'Kochi'"],
        c: 1,
        h: "Pune is at index 0.",
        e: "Kochi is the second item, so its index is 1.",
      },
      {
        p: "Given `cities = [\"Pune\", \"Kochi\", \"Delhi\"]`, what happens when you run `cities[3]`?",
        o: ["It returns 'Delhi'", "It returns None", "It raises IndexError", "It returns 'Pune'"],
        c: 2,
        h: "Three items have indexes 0, 1 and 2.",
        e: "There is no position 3 in a three-item list, so Python raises IndexError.",
      },
      {
        p: "Given `vals = [10, 20, 30]` and `i = 0`, what is `vals[i + 1]`?",
        o: ["10", "20", "30", "11"],
        c: 1,
        h: "Work out the index first: i + 1.",
        e: "i + 1 is 1, and vals[1] is 20. The arithmetic happens on the index, not the value.",
      },
    ],
  },
  {
    key: "conditionals",
    title: "Conditionals",
    objective: "Use if, elif and else to run different code depending on a condition.",
    contribution: "Filtering data means deciding, row by row, whether a condition holds.",
    minutes: 15,
    query: "python if elif else statements tutorial",
    prereqs: ["operators-expressions"],
    analogy: "An if statement is a fork in the road: the condition decides which branch you take.",
    recap: "You can write comparisons such as `x > 5` that evaluate to True or False.",
    sections: [
      [
        "if and else",
        "```python\nscore = 62\nif score >= 50:\n    print(\"pass\")\nelse:\n    print(\"fail\")\n```\n\nThe indented block under `if` runs only when the condition is True; otherwise the `else` block runs.",
      ],
      [
        "Several branches",
        "`elif` adds more conditions. Python checks them from top to bottom and runs only the first branch whose condition is True.",
      ],
    ],
    example: [
      "Labelling a temperature",
      "```python\ntemp = 31\nif temp >= 30:\n    label = \"hot\"\nelif temp >= 20:\n    label = \"mild\"\nelse:\n    label = \"cold\"\nprint(label)  # hot\n```",
    ],
    short: {
      p: "Write an if statement that prints `pass` when `score` is at least 50 and `fail` otherwise.",
      rubric: [
        ["Compares score with 50 using >= (or > 49)", [">= 50", ">=50", "> 49", ">49"]],
        ["Has an else branch", ["else"]],
        ["Prints both outcomes", ["fail"]],
      ],
      h: "\"At least 50\" includes 50 itself.",
      e: "if score >= 50: print('pass') else: print('fail')",
    },
    mcq: [
      {
        p: "What does this print?\n\n```python\nx = 7\nif x > 5:\n    print(\"big\")\nelse:\n    print(\"small\")\n```",
        o: ["big", "small", "big small", "Nothing"],
        c: 0,
        h: "Is 7 greater than 5?",
        e: "The condition is True, so only the if branch runs.",
      },
      {
        p: "With `x = 5`, what is `x > 3 and x < 5`?",
        o: ["True", "False", "5", "An error"],
        c: 1,
        h: "Both sides must be True.",
        e: "x > 3 is True but x < 5 is False, so the whole expression is False.",
      },
      {
        p: "What does this print?\n\n```python\nn = 10\nif n > 5:\n    print(\"A\")\nelif n > 8:\n    print(\"B\")\nelse:\n    print(\"C\")\n```",
        o: ["A", "B", "A and B", "C"],
        c: 0,
        h: "Only the first matching branch runs.",
        e: "n > 5 is True, so A is printed and the remaining branches are skipped.",
      },
    ],
  },
  {
    key: "loops",
    title: "Loops and iteration",
    objective: "Repeat work over the items of a list with for loops and range.",
    contribution: "Looping over rows is how you compute totals and transform data before pandas does it for you.",
    minutes: 25,
    query: "python for loop range iterate list tutorial",
    prereqs: ["list-indexing", "conditionals"],
    analogy: "A for loop is a conveyor belt: each item arrives in turn and the same steps run on it.",
    recap: "You can read list items by index (starting at 0) and write an if statement.",
    sections: [
      [
        "Looping over items",
        "```python\nprices = [5, 9, 12]\nfor p in prices:\n    print(p)\n```\n\nThe loop variable `p` takes each *value* in turn: 5, then 9, then 12.",
      ],
      [
        "Looping over positions",
        "`range(len(prices))` produces the *indexes* 0, 1, 2:\n\n```python\nfor i in range(len(prices)):\n    print(i, prices[i])\n```\n\nHere `i` is a position and `prices[i]` is the value at that position. Mixing the two up is the most common loop mistake.",
      ],
    ],
    example: [
      "Total and count above a threshold",
      "```python\nprices = [5, 9, 12]\ntotal = 0\nexpensive = 0\nfor p in prices:\n    total += p\n    if p > 8:\n        expensive += 1\nprint(total, expensive)  # 26 2\n```",
    ],
    short: {
      p: "Write a loop that prints every item in `names = [\"Ana\", \"Ben\"]` on its own line.",
      rubric: [
        ["Uses a for loop", ["for "]],
        ["Iterates over names (directly or by index)", ["in names", "range(len(names))"]],
        ["Prints each item", ["print"]],
      ],
      h: "Start with: for name in names:",
      e: "for name in names:\n    print(name)",
    },
    mcq: [
      {
        p: "What does this print?\n\n```python\nnums = [10, 20, 30]\nfor i in range(len(nums)):\n    print(i)\n```",
        o: ["10 20 30", "0 1 2", "1 2 3", "3"],
        c: 1,
        h: "range(len(nums)) produces positions, not items.",
        e: "range(3) yields the indexes 0, 1, 2. The items would be nums[i].",
        tags: { 0: VALUE_AS_INDEX, 2: ONE_BASED },
      },
      {
        p: "What happens when this runs?\n\n```python\nwords = [\"a\", \"b\", \"c\"]\nfor w in words:\n    print(words[w])\n```",
        o: [
          "It prints a b c",
          "TypeError: list indices must be integers",
          "It prints 0 1 2",
          "It prints nothing",
        ],
        c: 1,
        h: "What is w on the first pass: a position or an item?",
        e: "w is the item \"a\", not a position, so words[\"a\"] is not a valid index.",
        tags: { 0: VALUE_AS_INDEX, 2: VALUE_AS_INDEX },
      },
      {
        p: "What does this print?\n\n```python\nprices = [5, 9, 12]\nfor i in range(len(prices)):\n    print(prices[i])\n```",
        o: ["0 1 2", "5 9 12", "1 2 3", "An error"],
        c: 1,
        h: "i is the position; prices[i] is what is stored there.",
        e: "The loop visits indexes 0, 1, 2 and prints the value at each: 5, 9, 12.",
        tags: { 0: VALUE_AS_INDEX, 2: ONE_BASED },
      },
      {
        p: "What does this print?\n\n```python\nnums = [10, 20, 30]\ntotal = 0\nfor n in nums:\n    total += n\nprint(total)\n```",
        o: ["60", "3", "30", "An error"],
        c: 0,
        h: "n is each value in turn.",
        e: "10 + 20 + 30 = 60.",
        tags: { 1: ["count_vs_sum", null, "Counted the items instead of adding their values."] },
      },
    ],
  },
  {
    key: "functions",
    title: "Functions",
    objective: "Define functions with parameters and return values to reuse analysis steps.",
    contribution: "Functions let you apply the same cleaning or calculation to many columns and files.",
    minutes: 20,
    query: "python defining functions return parameters tutorial",
    prereqs: ["loops"],
    analogy: "A function is a recipe card: ingredients go in, a dish comes out.",
    recap: "You can loop over a list and accumulate a result.",
    sections: [
      [
        "Defining and calling",
        "```python\ndef mean(values):\n    return sum(values) / len(values)\n\nmean([2, 4, 6])  # 4.0\n```\n\n`values` is a parameter: a name for whatever is passed in. `return` sends the result back to the caller.",
      ],
      [
        "Return versus print",
        "`print` only shows a value; `return` hands it back so it can be stored or used again. A function without a `return` statement gives back `None`. Parameters can have defaults: `def greet(name, greeting=\"Hi\")`.",
      ],
    ],
    example: [
      "A reusable range calculation",
      "```python\ndef value_range(values):\n    return max(values) - min(values)\n\nprint(value_range([18, 21, 25]))  # 7\nprint(value_range([5, 9, 12]))    # 7\n```",
    ],
    short: {
      p: "Why wrap repeated analysis steps in a function? Give at least one reason.",
      rubric: [
        ["Mentions reuse or avoiding repetition", ["reuse", "re-use", "repeat", "again", "once", "duplicat"]],
        ["Mentions readability, testing or easier changes", ["read", "test", "change", "maintain", "clear", "organi", "fix"]],
      ],
      h: "Imagine the same five lines copied into ten places, then needing to change them.",
      e: "A function is written once and reused, and a fix in one place applies everywhere.",
    },
    mcq: [
      {
        p: "What does this print?\n\n```python\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))\n```",
        o: ["5", "23", "None", "An error"],
        c: 0,
        h: "The function returns the sum of its two arguments.",
        e: "add(2, 3) returns 5, which is then printed.",
      },
      {
        p: "What does a function return if it has no `return` statement?",
        o: ["0", "None", "An error", "An empty string"],
        c: 1,
        h: "Python has a special value for \"nothing\".",
        e: "Without a return statement a function returns None.",
      },
      {
        p: "What is the value of `mean([2, 4, 6])` given\n\n```python\ndef mean(values):\n    return sum(values) / len(values)\n```",
        o: ["12", "4.0", "3", "6"],
        c: 1,
        h: "Sum divided by count.",
        e: "12 / 3 = 4.0.",
      },
      {
        p: "What does `greet(\"Ana\")` return?\n\n```python\ndef greet(name, greeting=\"Hi\"):\n    return greeting + \" \" + name\n```",
        o: ["'Hi Ana'", "'Ana Hi'", "An error: missing argument", "'greeting Ana'"],
        c: 0,
        d: "hard",
        h: "A parameter with a default does not have to be passed.",
        e: "greeting falls back to its default \"Hi\", so the result is 'Hi Ana'.",
      },
    ],
  },
  {
    key: "dictionaries",
    title: "Dictionaries",
    objective: "Store and look up values by key, and add or update entries.",
    contribution: "A row of data is naturally a dictionary: column name to value.",
    minutes: 20,
    query: "python dictionaries keys values tutorial",
    prereqs: ["list-indexing"],
    analogy: "A dictionary is a contact list: you look people up by name, not by position.",
    recap: "You can read list items by position with square brackets.",
    sections: [
      [
        "Keys instead of positions",
        "```python\nrow = {\"city\": \"Pune\", \"temp\": 31}\nrow[\"temp\"]   # 31\n```\n\nSquare brackets again, but with a *key* inside instead of a position. Asking for a key that does not exist raises `KeyError`.",
      ],
      [
        "Adding and updating",
        "`row[\"humidity\"] = 60` adds a new entry or replaces an existing one. `len(row)` counts entries, `\"temp\" in row` checks for a key and `row.get(\"wind\", 0)` gives a default instead of an error.",
      ],
    ],
    example: [
      "Counting occurrences",
      "```python\ncounts = {}\nfor city in [\"Pune\", \"Kochi\", \"Pune\"]:\n    counts[city] = counts.get(city, 0) + 1\nprint(counts)  # {'Pune': 2, 'Kochi': 1}\n```",
    ],
    short: {
      p: "When is a dictionary a better choice than a list? Give a short example.",
      rubric: [
        ["Mentions looking values up by key or name", ["key", "name", "label", "look"]],
        ["Gives an example mapping", [":", "->", "price", "age", "score", "city", "phone"]],
      ],
      h: "Think of data you would look up by name rather than by position.",
      e: "When each value has a natural label, e.g. {\"Ana\": 31, \"Ben\": 27} for ages by name.",
    },
    mcq: [
      {
        p: "Given `d = {\"a\": 1, \"b\": 2}`, what is `d[\"b\"]`?",
        o: ["1", "2", "'b'", "An error"],
        c: 1,
        h: "Look up the value stored under the key \"b\".",
        e: "The key \"b\" maps to 2.",
      },
      {
        p: "Given `d = {\"a\": 1, \"b\": 2}`, what happens when you run `d[\"c\"]`?",
        o: ["It returns None", "It returns 0", "It raises KeyError", "It returns 'c'"],
        c: 2,
        h: "There is no entry with that key.",
        e: "Looking up a missing key with square brackets raises KeyError.",
      },
      {
        p: "Given `d = {\"a\": 1, \"b\": 2}`, what is `len(d)` after `d[\"c\"] = 3`?",
        o: ["2", "3", "An error", "1"],
        c: 1,
        d: "hard",
        h: "Assigning to a new key adds an entry.",
        e: "The dictionary now has three keys: a, b and c.",
      },
    ],
  },
  {
    key: "nested-data",
    title: "Lists of dictionaries",
    objective: "Represent a small table as a list of row dictionaries and loop over it.",
    contribution: "This is the shape of real tabular data, and exactly what a DataFrame replaces.",
    minutes: 20,
    query: "python list of dictionaries loop tutorial",
    prereqs: ["dictionaries", "loops"],
    analogy: "Think of a spreadsheet: the list is the sheet, each dictionary is one row.",
    recap: "You can loop over a list and look up values in a dictionary by key.",
    sections: [
      [
        "A table as rows",
        "```python\nrows = [\n    {\"city\": \"Pune\", \"temp\": 31},\n    {\"city\": \"Kochi\", \"temp\": 29},\n]\nrows[1][\"city\"]  # 'Kochi'\n```\n\nFirst pick the row by position, then the column by key.",
      ],
      [
        "Looping over rows",
        "```python\nfor r in rows:\n    print(r[\"city\"], r[\"temp\"])\n```\n\nEach `r` is one row dictionary. Collect a column with a loop: start with `cities = []` and `append(r[\"city\"])` for each row.",
      ],
    ],
    example: [
      "Average of a column",
      "```python\ntotal = 0\nfor r in rows:\n    total += r[\"temp\"]\nprint(total / len(rows))  # 30.0\n```",
    ],
    short: {
      p: "Describe how you would collect all the city names from `rows` into a list.",
      rubric: [
        ["Loops over the rows (or uses a comprehension)", ["for "]],
        ["Reads the city key from each row", ["city"]],
        ["Collects the values into a list", ["append", "[", "list"]],
      ],
      h: "Start with an empty list and add to it inside a loop.",
      e: "cities = []; for r in rows: cities.append(r[\"city\"]) or [r[\"city\"] for r in rows].",
    },
    mcq: [
      {
        p: "Given\n\n```python\nrows = [{\"city\": \"Pune\", \"temp\": 31}, {\"city\": \"Kochi\", \"temp\": 29}]\n```\n\nwhat is `rows[1][\"city\"]`?",
        o: ["'Pune'", "'Kochi'", "29", "An error"],
        c: 1,
        h: "Row positions start at 0.",
        e: "rows[1] is the second row, whose city is Kochi.",
        tags: { 0: ONE_BASED },
      },
      {
        p: "With the same `rows`, what is `total` after\n\n```python\ntotal = 0\nfor r in rows:\n    total += r[\"temp\"]\n```",
        o: ["60", "2", "31", "An error"],
        c: 0,
        h: "Add the temp of each row.",
        e: "31 + 29 = 60.",
      },
      {
        p: "With the same `rows`, what is `len(rows)`?",
        o: ["2", "4", "1", "An error"],
        c: 0,
        h: "len counts the items of the outer list.",
        e: "There are two row dictionaries in the list.",
      },
    ],
  },
  {
    key: "files-csv",
    title: "Reading CSV files",
    objective: "Open a CSV file, read its rows and convert text values to numbers.",
    contribution: "Most small datasets arrive as CSV; reading one is the first step of any analysis.",
    minutes: 20,
    query: "python csv module DictReader read file tutorial",
    prereqs: ["functions", "nested-data"],
    analogy: "A CSV file is a table written as plain text, one row per line with commas between cells.",
    recap: "You can loop over a list of row dictionaries and write small functions.",
    sections: [
      [
        "Opening a file safely",
        "```python\nimport csv\n\nwith open(\"temps.csv\", newline=\"\") as f:\n    rows = list(csv.DictReader(f))\n```\n\n`with` closes the file automatically. `csv.DictReader` uses the header line as keys, so each row is a dictionary.",
      ],
      [
        "Everything is text at first",
        "Values read from a CSV are strings: `\"31\"`, not `31`. Convert before calculating: `int(r[\"temp\"])` or `float(r[\"temp\"])`.",
      ],
    ],
    example: [
      "Average from a file",
      "```python\nimport csv\n\nwith open(\"temps.csv\", newline=\"\") as f:\n    rows = list(csv.DictReader(f))\n\ntemps = [float(r[\"temp\"]) for r in rows]\nprint(sum(temps) / len(temps))\n```",
    ],
    short: {
      p: "Values read with the csv module are strings. Why does that matter before computing an average?",
      rubric: [
        ["Says the values must be converted to numbers", ["convert", "int(", "float(", "number", "cast", "numeric"]],
        ["Says text cannot be summed or averaged as it is", ["string", "text", "str"]],
      ],
      h: "What is \"3\" + \"4\" in Python?",
      e: "Strings cannot be averaged; convert each with int() or float() first.",
    },
    mcq: [
      {
        p: "Which standard-library module reads CSV files?",
        o: ["csv", "json", "os", "math"],
        c: 0,
        h: "It is named after the format.",
        e: "The csv module provides reader and DictReader.",
      },
      {
        p: "What is the main benefit of `with open(\"data.csv\") as f:`?",
        o: [
          "It reads the file faster",
          "The file is closed automatically",
          "It converts values to numbers",
          "It sorts the rows",
        ],
        c: 1,
        h: "Think about what happens when the block ends.",
        e: "The with statement closes the file when the block finishes, even after an error.",
      },
      {
        p: "What does `csv.DictReader` give you for each row?",
        o: [
          "A list of strings",
          "A dictionary keyed by the header row",
          "A tuple of numbers",
          "A DataFrame",
        ],
        c: 1,
        h: "The name is a clue.",
        e: "Each row is a dictionary whose keys come from the header line.",
      },
    ],
  },
  {
    key: "pandas-dataframes",
    title: "pandas DataFrames",
    objective: "Load a table into a DataFrame and inspect its shape, columns and first rows.",
    contribution: "The DataFrame is the central tool for tabular data analysis in Python.",
    minutes: 25,
    query: "pandas getting started DataFrame read_csv head tutorial",
    prereqs: ["nested-data", "files-csv"],
    analogy: "A DataFrame is a spreadsheet you control with code.",
    recap: "You have represented tables as lists of dictionaries and read rows from a CSV file.",
    sections: [
      [
        "From rows to a DataFrame",
        "```python\nimport pandas as pd\n\ndf = pd.DataFrame([\n    {\"city\": \"Pune\", \"temp\": 31},\n    {\"city\": \"Kochi\", \"temp\": 29},\n])\n```\n\nA DataFrame is a table with labelled columns. `pd.read_csv(\"temps.csv\")` builds one straight from a file and converts numeric columns for you.",
      ],
      [
        "First look at the data",
        "`df.head()` shows the first five rows, `df.shape` gives `(rows, columns)`, `df.columns` lists the column names and `df.dtypes` shows each column's type.",
      ],
    ],
    example: [
      "Inspecting a new file",
      "```python\nimport pandas as pd\n\ndf = pd.read_csv(\"temps.csv\")\nprint(df.shape)   # e.g. (365, 2)\nprint(df.head())\n```",
    ],
    short: {
      p: "What is a DataFrame? Answer in one or two sentences.",
      rubric: [
        ["Describes a table with rows and columns", ["table", "rows", "columns", "tabular", "spreadsheet"]],
        ["Mentions labelled columns or an index", ["label", "column name", "index", "named", "header"]],
      ],
      h: "Compare it with a spreadsheet.",
      e: "A DataFrame is a table of rows and labelled columns, like a spreadsheet in code.",
    },
    mcq: [
      {
        p: "What is the conventional way to import pandas?",
        o: ["import pandas as pd", "import pd", "from python import pandas", "include pandas"],
        c: 0,
        h: "The short alias is two letters.",
        e: "`import pandas as pd` is the convention used throughout the documentation.",
      },
      {
        p: "What does `df.head()` show?",
        o: ["Only the column names", "The first 5 rows", "The last 5 rows", "Summary statistics"],
        c: 1,
        h: "Head means the top of the table.",
        e: "head() returns the first five rows by default.",
      },
      {
        p: "What does `df.shape` return?",
        o: ["The number of cells", "(rows, columns)", "The column names", "The data types"],
        c: 1,
        h: "It is a pair of numbers.",
        e: "shape is a tuple: number of rows, then number of columns.",
      },
      {
        p: "What does `pd.read_csv(\"sales.csv\")` return?",
        o: ["A list of rows", "A DataFrame", "A dictionary", "A string"],
        c: 1,
        d: "hard",
        h: "pandas has one main table type.",
        e: "read_csv parses the file into a DataFrame.",
      },
    ],
  },
  {
    key: "pandas-selecting",
    title: "Selecting and filtering rows",
    objective: "Select columns, pick rows by position or label, and filter rows with a condition.",
    contribution: "Answering a question about data almost always starts by narrowing to the relevant rows.",
    minutes: 25,
    query: "pandas subset data select columns filter rows loc iloc",
    prereqs: ["pandas-dataframes", "list-indexing"],
    analogy: "Filtering is a sieve: only the rows that pass the condition fall through.",
    recap: "You can load a DataFrame and you know positions start at 0.",
    sections: [
      [
        "Columns and positions",
        "`df[\"temp\"]` selects one column (a Series). `df[[\"city\", \"temp\"]]` selects several. `df.iloc[0]` is the first row by *position*; `df.loc[label]` picks a row by its *index label*.",
      ],
      [
        "Filtering with a condition",
        "```python\nhot = df[df[\"temp\"] > 30]\n```\n\n`df[\"temp\"] > 30` makes a True/False value for every row; putting it inside `df[...]` keeps only the True rows.",
      ],
    ],
    example: [
      "Cities above 30 degrees",
      "```python\nhot = df[df[\"temp\"] > 30]\nprint(hot[\"city\"])\n```\n\nFilter the rows first, then select the column you need.",
    ],
    short: {
      p: "Explain the difference between `df.loc` and `df.iloc`.",
      rubric: [
        ["Says loc selects by label", ["label", "name"]],
        ["Says iloc selects by integer position", ["position", "integer", "number", "0"]],
      ],
      h: "The i in iloc stands for integer.",
      e: "loc uses index labels; iloc uses integer positions starting at 0.",
    },
    mcq: [
      {
        p: "What does `df[\"price\"]` return?",
        o: ["The first row", "The price column (a Series)", "A single number", "An error"],
        c: 1,
        h: "A string in square brackets names a column.",
        e: "Selecting with a column name returns that column as a Series.",
      },
      {
        p: "What does `df[df[\"price\"] > 100]` return?",
        o: [
          "Columns named above 100",
          "The rows where price is above 100",
          "The first 100 rows",
          "Only True/False values",
        ],
        c: 1,
        h: "The inner expression is a True/False mask.",
        e: "The mask keeps only the rows whose price is greater than 100.",
      },
      {
        p: "What does `df.iloc[0]` return?",
        o: [
          "The row whose label is 0, if there is one",
          "The first row by position",
          "The first column",
          "The last row",
        ],
        c: 1,
        h: "iloc works with integer positions.",
        e: "iloc[0] is always the first row, whatever its label is.",
        tags: { 3: ONE_BASED },
      },
    ],
  },
  {
    key: "pandas-aggregation",
    title: "Grouping and summary statistics",
    objective: "Summarise columns and compute statistics per group with groupby.",
    contribution: "This is where analysis produces answers: totals, averages and comparisons between groups.",
    minutes: 25,
    query: "pandas calculate summary statistics groupby mean tutorial",
    prereqs: ["pandas-selecting"],
    analogy: "groupby sorts rows into buckets by a column, then summarises each bucket.",
    recap: "You can select a column and filter rows of a DataFrame.",
    sections: [
      [
        "Summaries of a column",
        "`df[\"temp\"].mean()`, `.sum()`, `.min()`, `.max()` and `.count()` reduce a column to one number. `df.describe()` gives several statistics for every numeric column at once.",
      ],
      [
        "Statistics per group",
        "```python\ndf.groupby(\"city\")[\"temp\"].mean()\n```\n\nRead it left to right: split the rows by city, take the temp column, average each group.",
      ],
    ],
    example: [
      "Total sales per region",
      "```python\ntotals = df.groupby(\"region\")[\"amount\"].sum()\nprint(totals.sort_values(ascending=False))\n```",
    ],
    short: {
      p: "You have sales rows with columns `region` and `amount`. Describe how to get the average amount per region.",
      rubric: [
        ["Groups the rows by region", ["groupby", "group by", "group"]],
        ["Takes the mean of amount", ["mean", "average"]],
      ],
      h: "Split by one column, summarise another.",
      e: "df.groupby(\"region\")[\"amount\"].mean()",
    },
    mcq: [
      {
        p: "What does `df[\"price\"].mean()` return?",
        o: ["The middle row", "The average of the price column", "The largest price", "The number of rows"],
        c: 1,
        h: "Mean is another word for average.",
        e: "mean() adds the values and divides by how many there are.",
      },
      {
        p: "What does `df.groupby(\"city\")[\"sales\"].sum()` return?",
        o: ["One grand total", "Total sales for each city", "Cities sorted by name", "The number of cities"],
        c: 1,
        h: "groupby splits the rows before summing.",
        e: "Rows are grouped by city and sales are summed within each group.",
      },
      {
        p: "What does `df.describe()` show?",
        o: [
          "The column names",
          "Summary statistics for numeric columns",
          "The first 5 rows",
          "Only the missing values",
        ],
        c: 1,
        h: "It describes the distribution of each numeric column.",
        e: "describe() reports count, mean, std, min, quartiles and max.",
      },
    ],
  },
];

export const FIXTURE_BY_KEY = new Map(FIXTURE_SKILLS.map((s) => [s.key, s]));

/** Keywords behind each rubric line, used by the fixture short-answer scorer. */
export const RUBRIC_KEYWORDS = new Map<string, string[]>(
  FIXTURE_SKILLS.flatMap((s) => s.short.rubric),
);
