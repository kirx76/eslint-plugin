import type {Node, Program} from "./types";

export const DEFAULT_GROUPS: string[] = [
  "useReducer",
  "useContext",
  "useState",
  "useRef",
  "useDispatch",
  "useCallback",
  "useLayoutEffect",
  "useEffect",
];

module.exports = {
  meta: {
    messages: {
      noMatching:
        "Non-matching declaration order. {{ bad }} comes {{ order }} {{ good }}.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          groups: {
            type: "array",
          },
        },
      },
    ],
  },

  create: (ctx) => {
    const source = ctx.getSourceCode();
    const options = ctx.options[0];
    const groups: string[] = options?.groups || DEFAULT_GROUPS;

    const getAllFuncDeclarations = (program: Program) =>
      program.body
        .filter(({type}) =>
          [
            "FunctionDeclaration",
            "VariableDeclaration",
            "ExportNamedDeclaration",
            "ExportDefaultDeclaration",
          ].includes(type)
        )
        .filter(Boolean);

    const getHooksFromBody = (bodyDeclarations: Node[]) =>
      bodyDeclarations
        ?.map((node) => {
          if (node.type === "VariableDeclaration") {
            return {
              node,
              name: node.declarations[0].init.callee.name,
            };
          }
          if (node.type === "ExpressionStatement") {
            return {node, name: node.expression.callee.name};
          }
          return undefined;
        })
        .filter(Boolean);

    const getArrayOfMainFunctions = (df: any) =>
      df
        .map((declared: any) => {
          if (declared.type === "VariableDeclaration") {
            const declaredType = declared.declarations[0].init.type;
            if (declaredType !== "CallExpression") {
              const declarations = declared.declarations[0].init.body.body;
              return getHooksFromBody(declarations);
            }
          }
          if (declared.type === "ExportNamedDeclaration") {
            const declaredFunctions = ctx.getDeclaredVariables(
              declared.declaration
            );
            const declarations =
              declaredFunctions[0]?.defs[0].node.init.body.body;
            return getHooksFromBody(declarations);
          }
          if (declared.type === "FunctionDeclaration") {
            const declarations = declared.body.body;
            return getHooksFromBody(declarations);
          }
          return undefined;
        })
        .filter(Boolean);

    const getCorrectOrderingByGroups = (data: any) => {
      if (Array.isArray(data)) {
        return [...data].sort(
          (a, b) => groups.indexOf(a.name) - groups.indexOf(b.name)
        );
      }
      return [];
    };

    return {
      Program(program: Program) {
        const code = getArrayOfMainFunctions(
          getAllFuncDeclarations(program)
        )[0];
        const goods = getCorrectOrderingByGroups(code);

        const goodNames = goods?.map((c) => c.name) || [];

        if (Array.isArray(code)) {
          code.map((bad, index) => {
            if (Array.isArray(goods)) {
              const goodCode = source.getText(goods[index].node);
              const badIndex = index;
              const goodIndex = goodNames.indexOf(bad?.name);
              ctx.report({
                node: bad.node,
                messageId: "noMatching",
                data: {
                  bad: bad?.name,
                  order: badIndex > goodIndex ? "after" : "before",
                  good: goods[index].name,
                },
                fix: (fixer) => fixer.replaceText(bad?.node, goodCode),
              });
            }
            return null;
          });
        }
      },
    };
  },
};
