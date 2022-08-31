import { RuleTester, Linter } from "eslint";
import { format, Options } from "prettier";

const hookOrder = require("./index.ts");

const ruleTester = new RuleTester();

const parserOptions: Linter.ParserOptions = {
  ecmaVersion: 6,
  sourceType: "module",
  ecmaFeatures: {
    jsx: true,
  },
};

const options = [
  {
    groups: hookOrder.DEFAULT_GROUPS,
  },
];

const prettierOptions: Options = {
  parser: "babel",
};

ruleTester.run("hooks/sort", hookOrder, {
  valid: [
    {
      code: `
      // function ComponentA() {
      //   const [todos, dispatch] = useReducer(todosReducer)
      //
      //   const [count, setCount] = useState(0)
      //
      //   const memoizedCallback = useCallback(() => {
      //     doSomething(a, b);
      //   },[a, b])
      //
      //   useEffect(() => {
      //     document.title = "Hello"
      //   }, [])
      // }
      //
      // export default ComponentA
     `,
      parserOptions,
      options,
    },
  ],
  invalid: [
    {
      code: format(
        `
import { useState, useEffect, useContext, createContext } from "react";
const context = createContext({});
export const ComponentA = () => {
  const [counts, setCounts] = useState(0);
  useEffect(() => {
    console.log("test");
  }, []);
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log("testo");
  }, []);
  const locale = useContext(context);
  return null;
};
        `,
        prettierOptions
      ),
      output: format(
        `
import { useState, useEffect, useContext, createContext } from "react";
const context = createContext({});
export const ComponentA = () => {
  const locale = useContext(context);
  const [counts, setCounts] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log("test");
  }, []);
  useEffect(() => {
    console.log("testo");
  }, []);
  return null;
};
        `,
        prettierOptions
      ),
      errors: [
        {
          message:
            "Non-matching declaration order. useState comes before useContext.",
        },
        {
          message:
            "Non-matching declaration order. useEffect comes before useState.",
        },
        {
          message:
            "Non-matching declaration order. useState comes after useState.",
        },
        {
          message:
            "Non-matching declaration order. useEffect comes before useEffect.",
        },
        {
          message:
            "Non-matching declaration order. useContext comes after useEffect.",
        },
      ],
      parserOptions,
      options,
    },
  ],
});
