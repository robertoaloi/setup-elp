const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { problemMatcher } = require('../matchers/elp-matchers.json')

// Real `elp` output (ELP release 2026-11-16) for eproxus/meck plus a few injected findings,
// captured both with stdout piped (JSON lines, which is what GitHub Actions sees) and with stdout
// attached to a terminal (human-readable output, colours included).
const fixtures = path.join(__dirname, 'fixtures', 'elp-2026-11-16')

describe('ELP problem matchers', () => {
  it('only use severities the runner accepts', () => {
    for (const { owner, severity } of problemMatcher) {
      assert.ok(['error', 'warning', 'notice'].includes(severity), owner)
      assert.ok(owner.startsWith('elp-'), owner)
    }
  })

  describe('JSON output', () => {
    it('matches a lint warning', () => {
      const line =
        '{"path":"test/meck_tests.erl","line":933,"char":5,"endLine":933,"endChar":42,' +
        '"code":"ELP","severity":"warning","name":"W0016 (deprecated_function)",' +
        '"original":null,"replacement":null,"description":"Function \'a/0\' is deprecated.' +
        '\\n\\nFor more information see: https://whatsapp.github.io/erlang-language-platform/' +
        'docs/erlang-error-index/w/W0016","docPath":"website/docs/erlang-error-index/w/W0016.md"}'
      assert.deepEqual(run([line]), [
        {
          owner: 'elp-json-warning',
          severity: 'warning',
          file: 'test/meck_tests.erl',
          line: '933',
          column: '5',
          message:
            "Function 'a/0' is deprecated.\\n\\nFor more information see: " +
            'https://whatsapp.github.io/erlang-language-platform/docs/erlang-error-index/w/W0016',
        },
      ])
    })

    it('maps every ELP JSON severity', () => {
      const severities = {
        error: 'error',
        warning: 'warning',
        autofix: 'warning',
        advice: 'notice',
        disabled: 'notice',
        weak_warning: 'notice',
        information: 'notice',
      }
      for (const [elpSeverity, severity] of Object.entries(severities)) {
        const line = jsonLine({ severity: elpSeverity })
        assert.equal(run([line])[0].severity, severity, elpSeverity)
      }
    })

    it('ignores unknown severities', () => {
      assert.deepEqual(run([jsonLine({ severity: 'whatever' })]), [])
    })

    it('keeps escaped quotes and backslashes inside the message', () => {
      const description = 'Use \\"~p\\" instead of \\\\n, see `foo/1`.'
      const [issue] = run([jsonLine({ description })])
      assert.equal(issue.message, description)
    })

    it('does not stop at escaped quotes in other fields', () => {
      const [issue] = run([
        jsonLine({ name: 'W9999 (\\"odd\\")', original: '"\\"severity\\":\\"error\\""' }),
      ])
      assert.equal(issue.severity, 'warning')
      assert.equal(issue.message, 'Something is off.')
    })

    it('skips the code fence that opens eqWAlizer descriptions', () => {
      const line =
        '{"path":"src/meck_code.erl","line":76,"char":5,"endLine":76,"endChar":23,' +
        '"code":"ELP","severity":"error","name":"eqWAlizer: redundant_fixme","original":null,' +
        '"replacement":null,"description":"```lang=error,counterexample\\n\\nredundant fixme\\n' +
        '```\\n\\n> [docs on `redundant_fixme`](https://fb.me/eqwalizer_errors#redundant_fixme)",' +
        '"docPath":null}'
      const [issue] = run([line])
      assert.equal(issue.owner, 'elp-json-error')
      assert.equal(issue.file, 'src/meck_code.erl')
      assert.equal(issue.line, '76')
      assert.equal(issue.column, '5')
      assert.ok(issue.message.startsWith('redundant fixme\\n```'), issue.message)
      assert.ok(issue.message.endsWith('#redundant_fixme)'), issue.message)
    })

    it('handles a missing column and end position', () => {
      const line =
        '{"path":"src/a.erl","line":2,"char":null,"code":"ELP","severity":"error",' +
        '"name":"ELP","original":null,"replacement":null,' +
        '"description":"can\'t find include file \\"b.hrl\\"","docPath":null}'
      assert.deepEqual(run([line]), [
        {
          owner: 'elp-json-error',
          severity: 'error',
          file: 'src/a.erl',
          line: '2',
          column: undefined,
          message: 'can\'t find include file \\"b.hrl\\"',
        },
      ])
    })

    it('ignores JSON that is not an ELP diagnostic', () => {
      assert.deepEqual(run(['{"path":"a.erl","line":1}', '{"severity":"error"}']), [])
    })
  })

  describe('human-readable `elp lint` output', () => {
    it('matches each severity', () => {
      const lines = [
        'src/a.erl:2:10-2:30::[Error] [E1516] can\'t find include file "b.hrl"',
        "test/b.erl:933:5-933:42::[Warning] [W0016] Function 'a/0' is deprecated.",
        'src/c.erl:5:8-5:44::[WeakWarning] [W0066] lists:map/2 call can be replaced.',
        'src/d.erl:5:18-5:38::[Information] [W0071] A reference to `fun foo/1` can be taken.',
      ]
      assert.deepEqual(
        run(lines).map(({ owner, severity, file, line, column, message }) => [
          owner,
          severity,
          file,
          line,
          column,
          message,
        ]),
        [
          [
            'elp-text-error',
            'error',
            'src/a.erl',
            '2',
            '10',
            '[E1516] can\'t find include file "b.hrl"',
          ],
          [
            'elp-text-warning',
            'warning',
            'test/b.erl',
            '933',
            '5',
            "[W0016] Function 'a/0' is deprecated.",
          ],
          [
            'elp-text-notice',
            'notice',
            'src/c.erl',
            '5',
            '8',
            '[W0066] lists:map/2 call can be replaced.',
          ],
          [
            'elp-text-notice',
            'notice',
            'src/d.erl',
            '5',
            '18',
            '[W0071] A reference to `fun foo/1` can be taken.',
          ],
        ],
      )
    })

    it('ignores summary lines', () => {
      assert.deepEqual(run(['Diagnostics reported:', 'Errors found']), [])
    })
  })

  describe('human-readable report (`elp eqwalize-all`, parse errors)', () => {
    it('matches a header followed by its location', () => {
      const lines = [
        'error: incompatible_types (See https://fb.me/eqwalizer_errors#incompatible_types)',
        '  ┌─ src/pm.erl:4:8',
        '  │',
      ]
      assert.deepEqual(run(lines), [
        {
          owner: 'elp-codespan-error',
          severity: 'error',
          file: 'src/pm.erl',
          line: '4',
          column: '8',
          message: 'incompatible_types (See https://fb.me/eqwalizer_errors#incompatible_types)',
        },
      ])
    })

    it('tolerates colour codes', () => {
      const lines = [
        '\u001b[0m\u001b[1m\u001b[38;5;11mwarning\u001b[0m\u001b[1m: something\u001b[0m',
        '   \u001b[0m\u001b[38;5;33m┌─\u001b[0m src/a.erl:76:5',
        '\u001b[0m\u001b[1mnote\u001b[0m\u001b[1m: a hint\u001b[0m',
        '   \u001b[0m\u001b[38;5;33m┌─\u001b[0m src/b.erl:1:2',
      ]
      assert.deepEqual(
        run(lines).map(({ severity, file, message }) => [severity, file, message]),
        [
          ['warning', 'src/a.erl', 'something'],
          ['notice', 'src/b.erl', 'a hint'],
        ],
      )
    })

    it('needs the location right after the header', () => {
      const lines = ['error: unrelated tool output', 'some other line', '  ┌─ src/a.erl:1:1']
      assert.deepEqual(run(lines), [])
    })
  })

  describe('real ELP 2026-11-16 output', () => {
    const lintJson = [
      ['elp-json-warning', 'src/meck_matcher.erl', '77', '22', "Module 'hamcrest' is undefined."],
      ['elp-json-warning', 'src/meck_matcher.erl', '93', '22', "Module 'hamcrest' is undefined."],
      ['elp-json-warning', 'test/meck_tests.erl', '998', '5', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1294', '9', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1043', '5', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1072', '9', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1223', '5', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '933', '5', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1017', '5', "Function 'a/0' is deprecated."],
      ['elp-json-warning', 'test/meck_tests.erl', '1277', '27', "Function 'a/0' is deprecated."],
      [
        'elp-json-warning',
        'test/include/cover_test.hrl',
        '1',
        '1',
        'No file includes this header.',
      ],
      [
        'elp-json-notice',
        'src/pm_demo_lint.erl',
        '5',
        '8',
        'lists:map/2 call can be replaced with a list comprehension.',
      ],
      [
        'elp-json-notice',
        'src/pm_demo_lint.erl',
        '5',
        '18',
        'A reference to `fun foo/1` can be taken directly.',
      ],
      [
        'elp-json-error',
        'src/pm_demo_lint.erl',
        '2',
        '10',
        'can\'t find include file \\"does_not_exist.hrl\\"',
      ],
    ]

    it('`elp lint` (JSON)', () => {
      const issues = runFixture('lint.jsonl')
      assert.deepEqual(
        issues.map(({ owner, file, line, column, message }) => [
          owner,
          file,
          line,
          column,
          message.split('\\n')[0],
        ]),
        lintJson,
      )
      for (const { message } of issues) {
        assert.match(message, /For more information see: https:\/\/\S+\/[A-Z]\d{4}$/)
      }
    })

    it('`elp lint` (human-readable) finds the same diagnostics', () => {
      const textOwner = (owner) => owner.replace('json', 'text')
      assert.deepEqual(
        runFixture('lint.txt').map(({ owner, file, line, column }) => [owner, file, line, column]),
        lintJson.map(([owner, file, line, column]) => [textOwner(owner), file, line, column]),
      )
    })

    it('`elp eqwalize-all` (JSON)', () => {
      assert.deepEqual(
        runFixture('eqwalize-all.jsonl').map(({ owner, file, line, column, message }) => [
          owner,
          file,
          line,
          column,
          message.split('\\n')[0],
        ]),
        [
          ['elp-json-error', 'src/meck_code.erl', '76', '5', 'redundant fixme'],
          ['elp-json-error', 'src/pm_demo_eqwalizer.erl', '4', '8', "`'error'`."],
        ],
      )
    })

    it('`elp eqwalize-all` (human-readable)', () => {
      assert.deepEqual(
        runFixture('eqwalize-all.txt').map(({ owner, file, line, column, message }) => [
          owner,
          file,
          line,
          column,
          message,
        ]),
        [
          [
            'elp-codespan-error',
            'src/meck_code.erl',
            '76',
            '5',
            'redundant_fixme (See https://fb.me/eqwalizer_errors#redundant_fixme)',
          ],
          [
            'elp-codespan-error',
            'src/pm_demo_eqwalizer.erl',
            '4',
            '8',
            'incompatible_types (See https://fb.me/eqwalizer_errors#incompatible_types)',
          ],
        ],
      )
    })

    it('`elp eqwalize-all` parse errors (JSON and human-readable)', () => {
      const summary = ({ severity, file, line, column, message }) => [
        severity,
        file,
        line,
        column,
        message,
      ]
      assert.deepEqual(runFixture('eqwalize-all-parse-error.jsonl').map(summary), [
        [
          'error',
          'src/pm_demo_lint.erl',
          '2',
          undefined,
          'can\'t find include file \\"does_not_exist.hrl\\"',
        ],
      ])
      assert.deepEqual(runFixture('eqwalize-all-parse-error.txt').map(summary), [
        ['error', 'src/pm_demo_lint.erl', '2', '10', 'parse_error'],
      ])
    })
  })
})

function jsonLine({
  severity = 'warning',
  name = 'W9999 (example)',
  original = 'null',
  description = 'Something is off.',
}) {
  return (
    `{"path":"src/a.erl","line":1,"char":1,"endLine":1,"endChar":2,"code":"ELP",` +
    `"severity":"${severity}","name":"${name}","original":${original},"replacement":null,` +
    `"description":"${description}","docPath":null}`
  )
}

function runFixture(name) {
  const output = fs.readFileSync(path.join(fixtures, name), 'utf8')
  return run(output.split('\n'))
}

// Applies the problem matchers to output lines the way the GitHub Actions runner does
// (see IssueMatcher.cs and Handlers/OutputManager.cs in actions/runner): every line is tried
// against each matcher in turn, a multi-line matcher needs its patterns to match consecutive
// lines, and the first matcher that yields an issue with a non-empty message wins the line.
function run(lines) {
  const matchers = problemMatcher.map((matcher) => ({
    ...matcher,
    patterns: matcher.pattern.map((pattern) => ({ ...pattern, re: new RegExp(pattern.regexp) })),
    state: [],
  }))
  const issues = []
  for (const line of lines) {
    for (const matcher of matchers) {
      const match = matchLine(matcher, line)
      if (match && match.message) {
        matchers.filter((other) => other !== matcher).forEach((other) => (other.state = []))
        issues.push({ owner: matcher.owner, severity: matcher.severity, ...match })
        break
      }
    }
  }
  return issues
}

function matchLine(matcher, line) {
  const { patterns, state } = matcher
  for (let i = patterns.length - 1; i >= 0; i--) {
    const running = i > 0 ? state[i - 1] : {}
    if (!running) {
      continue
    }
    const groups = line.match(patterns[i].re)
    const isLast = i === patterns.length - 1
    if (groups) {
      const match = { ...running }
      for (const key of ['file', 'line', 'column', 'message']) {
        if (match[key] === undefined && patterns[i][key] !== undefined) {
          match[key] = groups[patterns[i][key]]
        }
      }
      if (isLast) {
        matcher.state = []
        return match
      }
      state[i] = match
    } else {
      state[isLast ? i - 1 : i] = undefined
    }
  }
  return null
}
