import stylelint from 'stylelint';

const ruleName = 'yu-chen/declaration-use-variable';

const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: function expected(property) {
    return 'Expected variable for "' + property + '".';
  },
  expectedPresent: function expectedPresent(property, variable) {
    return 'Expected variable ' + variable + ' for "' + property + '".';
  },
});

const meta = {
  url: 'https://github.com/noshower/stylelint-declaration-use-variable/blob/main/README.md',
};

// Store the variables in object
const variables = {};

/**
 * Returns boolean wether a string should be parsed as regex or not
 *
 * @param  {string} string
 * @return {bool}
 */
function isStringRegex(string) {
  return string[0] === '/' && string[string.length - 1] === '/';
}

/**
 * Returns RegExp object for string like "/reg/"
 *
 * @param  {string} string
 * @return {RegExp}
 */
function toRegex(string) {
  return new RegExp(string.slice(1, -1));
}

/**
 * Compares the declaration with regex pattern
 * to verify the usage of variable
 *
 * @param  {string} val
 * @return {bool}
 */
function checkValue(val, exceptions = []) {
  // Regex for checking
  // scss variable starting with '$'
  // map-get function in scss
  // less variable starting with '@'
  // custom properties starting with '--' or 'var'
  var regEx = /^(\$)|(map-get)|(\@)|(--)|(var)/g;

  for (var exception of exceptions) {
    if (isStringRegex(exception)) {
      if (toRegex(exception).test(val)) return true;
    } else {
      if (exception === val) return true;
    }
  }

  return regEx.test(val);
}

/**
 * Checks the value and if its present in variables object
 * returns the respective variable
 *
 * @param  {string}
 * @return {string|bool}
 */
function checkPresentVariable(val) {
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
function testAgaintString(prop, value, comparison) {
  // if prop is a variable do not run check
  // and add it in the variables object for later check
  // and return, since it would be a variable declaration
  // not a style property declaration
  if (checkValue(prop)) {
    variables[value] = prop;
    return;
  }

  if (isStringRegex(comparison)) {
    var valueMatches = new RegExp(comparison.slice(1, -1)).test(prop);
    return valueMatches;
  }

  return prop == comparison;
}

/**
 * Checks the test expression with css declaration
 *
 * @param  {string} prop
 * @param  {string|array} comparison
 * @return {bool}
 */
function checkProp(prop, value, targets) {
  for (var target of targets) {
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
function parseOptions(options) {
  var parsed = { targets: [], ignoreValues: ['/color\\(/'] };

  if (Array.isArray(options)) {
    var last = options[options.length - 1];
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

const ruleFunction = function (primary, secondaryOptions) {
  return function (root, result) {
    var validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: () => true,
    });

    const options = parseOptions(primary || []);

    if (!validOptions) {
      return;
    }

    root.walkDecls(function (statement) {
      if (
        checkProp(statement.prop, statement.value, options.targets) &&
        checkPresentVariable(statement.value) &&
        !checkValue(statement.value, options.ignoreValues)
      ) {
        stylelint.utils.report({
          result: result,
          ruleName: ruleName,
          node: statement,
          message: messages.expectedPresent(
            statement.prop,
            checkPresentVariable(statement.value)
          ),
        });
      } else if (
        checkProp(statement.prop, statement.value, options.targets) &&
        !checkValue(statement.value, options.ignoreValues)
      ) {
        stylelint.utils.report({
          ruleName: ruleName,
          result: result,
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

export default stylelint.createPlugin(ruleName, ruleFunction);
