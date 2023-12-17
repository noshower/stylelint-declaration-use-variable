import stylelint, { Rule } from 'stylelint';

const { utils, createPlugin } = stylelint;

const ruleName = 'yu-chen/declaration-use-variable';

const messages = utils.ruleMessages(ruleName, {
  expected: function expected(property) {
    return `Expected variable for "${property}".`;
  },
  expectedPresent: function expectedPresent(property, variable) {
    return `Expected variable ${variable} for "${property}".`;
  },
});

const meta = {
  url: 'https://github.com/noshower/stylelint-declaration-use-variable/blob/main/README.md',
};

// Store the variables in object
const variables: Record<string, string> = {};

/**
 * Returns boolean wether a string should be parsed as regex or not
 *
 * @param  {string} string
 * @return {bool}
 */
function isStringRegex(str: string) {
  return str[0] === '/' && str[str.length - 1] === '/';
}

/**
 * Returns RegExp object for string like "/reg/"
 *
 * @param  {string} string
 * @return {RegExp}
 */
function toRegex(str: string) {
  return new RegExp(str.slice(1, -1));
}

/**
 * Compares the declaration with regex pattern
 * to verify the usage of variable
 *
 * @param  {string} val
 * @return {bool}
 */
function checkValue(val: string, exceptions: string[] = []) {
  // Regex for checking
  // scss variable starting with '$'
  // map-get function in scss
  // less variable starting with '@'
  // custom properties starting with '--' or 'var'
  const regEx = /^(\$)|(map-get)|(@)|(--)|(var)/g;

  for (const exception of exceptions) {
    if (isStringRegex(exception)) {
      if (toRegex(exception).test(val)) return true;
    } else if (exception === val) return true;
  }

  return regEx.test(val);
}

function validProperties(actual: unknown) {
  if (typeof actual === 'string') {
    return true;
  }
  if (Array.isArray(actual)) {
    if (
      actual.every((item, i) => {
        // 数组的最后一个可以是对象，其他必须是字符串
        if (i === actual.length - 1 && typeof item === 'object') {
          return true;
        }
        return typeof item === 'string';
      })
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks the value and if its present in variables object
 * returns the respective variable
 *
 * @param  {string}
 * @return {string|bool}
 */
function checkPresentVariable(val: string) {
  return variables[val] ? variables[val] : false;
}

/**
 * Checks the defined property in (css|scss|less) with the
 * test string or regex defined in stylelint config
 *
 * @param  {string} value
 * @param  {string|regex} comparison
 * @return {bool}
 */
function testAgaintString(prop: string, value: string, comparison: string) {
  // if prop is a variable do not run check
  // and add it in the variables object for later check
  // and return, since it would be a variable declaration
  // not a style property declaration
  if (checkValue(prop)) {
    variables[value] = prop;
    return false;
  }

  if (isStringRegex(comparison)) {
    const valueMatches = new RegExp(comparison.slice(1, -1)).test(prop);
    return valueMatches;
  }

  return prop === comparison;
}

/**
 * Checks the test expression with css declaration
 *
 * @param  {string} prop
 * @param  {string|array} comparison
 * @return {bool}
 */
function checkProp(prop: string, value: string, targets: string[]) {
  for (const target of targets) {
    if (testAgaintString(prop, value, target)) return true;
  }
  return false;
}

/**
 * Checks the test expression with css declaration
 *
 * @param  {string|array} options
 * @return {object}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOptions(options: any) {
  const parsed: { targets: string[]; ignoreValues: string[] } = {
    targets: [],
    ignoreValues: ['/color\\(/'],
  };

  if (Array.isArray(options)) {
    const last = options[options.length - 1];
    if (typeof last === 'object') {
      parsed.targets = options.slice(0, options.length - 1);
      if (last.ignoreValues) {
        parsed.ignoreValues = parsed.ignoreValues.concat(last.ignoreValues);
      }
    } else {
      parsed.targets = options;
    }
  } else {
    parsed.targets = [options];
  }
  return parsed;
}

const ruleFunction: Rule = (properties) => {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: properties,
      possible: validProperties,
    });

    const options = parseOptions(properties || []);

    if (!validOptions) {
      return;
    }

    root.walkDecls((statement) => {
      if (
        checkProp(statement.prop, statement.value, options.targets) &&
        checkPresentVariable(statement.value) &&
        !checkValue(statement.value, options.ignoreValues)
      ) {
        utils.report({
          result,
          ruleName,
          node: statement,
          message: messages.expectedPresent(
            statement.prop,
            checkPresentVariable(statement.value),
          ),
        });
      } else if (
        checkProp(statement.prop, statement.value, options.targets) &&
        !checkValue(statement.value, options.ignoreValues)
      ) {
        utils.report({
          ruleName,
          result,
          node: statement,
          message: messages.expected(statement.prop),
        });
      }
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const declarationStrictValuePlugin = createPlugin(ruleName, ruleFunction);

export default declarationStrictValuePlugin;
export { ruleName, messages };
