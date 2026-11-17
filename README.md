# `setup-elp` [![Action][ci-img]][ci]

[ci]: https://github.com/paulo-ferraz-oliveira/setup-elp/actions/workflows/ci.yml
[ci-img]: https://github.com/paulo-ferraz-oliveira/setup-elp/actions/workflows/ci.yml/badge.svg

## The action

`setup-elp` allows you to type check your Erlang code, in your CI pipelines, using
[eqWAlizer](https://github.com/WhatsApp/eqwalizer), with
[Erlang Language Platform](https://github.com/WhatsApp/erlang-language-platform).

### Usage

See [action.yml](action.yml) for the action's specification.

In your CI pipelines, use it considering CLI `elp` is available as an executable, as specified
in the Erlang Language Platform repository mentioned above.

#### Inputs

The action supports the following inputs:

| `with`             | Purpose
|-                   |-
| `elp-version`      | ELP version to use: a release tag (e.g. `2026-10-05`) or `latest` (default)
| `problem-matchers` | Annotate ELP findings on pull requests: `true` (default) or `false`

#### Problem matchers

The action registers [problem matchers][problem-matchers] for ELP's output, so that findings
reported by `elp lint` and `elp eqwalize-all` in later steps of the same job become annotations:
they show up inline in the pull request's "Files changed" tab and in the workflow run's summary.
No extra configuration is needed:

```yaml
- uses: erlef/setup-elp@main
- run: elp lint --no-connect
- run: elp eqwalize-all --no-connect --bail-on-error
```

Both ELP output formats are recognized: JSON lines (printed when standard output is not a terminal,
as is the case in GitHub Actions, or with `--format json`) and the human-readable output printed to
a terminal.

| ELP severity                                                   | Annotation
|-                                                               |-
| `error` (all eqWAlizer findings)                               | error
| `warning`                                                      | warning
| `weak_warning`, `information` (`disabled`, `advice` in JSON)   | notice

The annotation's message is ELP's description of the finding, which usually ends with a link to
the documentation of the diagnostic (e.g. `.../erlang-error-index/w/W0016`). JSON output is not
unescaped: line breaks and quotes in the description appear as `\n` and `\"`.

Things to keep in mind:

- GitHub shows at most 10 error, 10 warning and 10 notice annotations per step, and at most 50
  annotations per job; all findings are still printed to the log
- the file paths printed by ELP are relative to the project, so run `elp` from the root of the
  repository for annotations to point at the right files
- annotations do not change a step's outcome: use ELP's exit code (e.g. `--bail-on-error`)
  to fail the job

To opt out, use `problem-matchers: false`. To stop annotating findings from a given step on, run
`echo "::remove-matcher owner=<owner>::"` for each matcher you no longer want: their owners are
`elp-json-<severity>` (JSON output), `elp-text-<severity>` (human-readable `elp lint` output) and
`elp-codespan-<severity>` (human-readable `elp eqwalize-all` output and parse errors), with
`<severity>` one of `error`, `warning` or `notice`.

[problem-matchers]: https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md

#### Architectures / platforms

The action supports the following architectures / platforms:

| arch.   | platform
|-        |-
| `arm64` | `darwin` (GitHub `macos-...`)
| `x64`   | `darwin`
| `arm64` | `linux` (GitHub `ubuntu-...`)
| `x64`   | `linux`

## The project

### Changelog

A complete changelog can be found under [GitHub releases](https://github.com/paulo-ferraz-oliveira/example-gha/releases).

### Code of Conduct

This project's code of conduct is made explicit in [CODE_OF_CONDUCT.md](https://github.com/paulo-ferraz-oliveira/setup-elp/blob/main/CODE_OF_CONDUCT.md).

### Contributing

First of all, thank you for contributing with your time and patience.

If you want to request a new feature make sure to
[open an issue](https://github.com/paulo-ferraz-oliveira/setup-elp/issues) so we can
discuss it first.

Bug reports and questions are also welcome, but do check you're using the latest version of the
action - if you found a bug - and/or search the issue database - if you have a question, since it
might have already been answered before.

Contributions will be subject to the MIT License.
You will retain the copyright.

For more information check out [CONTRIBUTING.md](https://github.com/paulo-ferraz-oliveira/setup-elp/blob/main/CONTRIBUTING.md).

### License

License information can be found inside [LICENSE](https://github.com/paulo-ferraz-oliveira/setup-elp/blob/main/LICENSE.md).

### Security

This project's security policy is made explicit in [SECURITY.md](https://github.com/paulo-ferraz-oliveira/setup-elp/blob/main/SECURITY.md).
