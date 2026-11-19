# `setup-elp` [![Action][ci-img]][ci]

[ci]: https://github.com/erlef/setup-elp/actions/workflows/ci.yml
[ci-img]: https://github.com/erlef/setup-elp/actions/workflows/ci.yml/badge.svg

## The action

`setup-elp` installs [ELP (Erlang Language Platform)][elp] in your GitHub Actions workflows, so
you can lint your Erlang code with `elp lint` and type check it with
[eqWAlizer][eqwalizer] (`elp eqwalize-all`), which ships as part of ELP.

[elp]: https://github.com/WhatsApp/erlang-language-platform
[eqwalizer]: https://whatsapp.github.io/erlang-language-platform/docs/eqwalizer/reference/

### Usage

ELP is built for specific Erlang/OTP versions, and the action downloads the build matching the
`<major>.<minor>` Erlang/OTP version on the runner, so set up Erlang/OTP first (e.g. with
[`erlef/setup-beam`](https://github.com/erlef/setup-beam)):

```yaml
- uses: erlef/setup-beam@v1
  with:
    otp-version: "28.5"
    rebar3-version: "3"
- uses: erlef/setup-elp@v1
  with:
    elp-version: "2026-10-14"
- run: elp lint --no-connect
- run: elp eqwalize-all --no-connect --bail-on-error
```

Each [ELP release](https://github.com/WhatsApp/erlang-language-platform/releases) lists the
Erlang/OTP versions it was built for in its assets: the step fails if the release has no build for
the Erlang/OTP version on the runner.

`@v1` follows the latest `1.x.y` release of the action. To make your workflow fully
reproducible, pin a release tag (e.g. `@v1.0.0`) or a commit SHA instead.

See [action.yml](action.yml) for the action's specification, and the
[ELP documentation][elp-gha] for a complete workflow, how to pick versions, and how to run ELP
in a job matrix.

[elp-gha]: https://whatsapp.github.io/erlang-language-platform/docs/get-started/github-actions/

#### Inputs

The action supports the following inputs:

| `with`        | Purpose
|-              |-
| `elp-version` | ELP version to use: a release tag (e.g. `2026-10-05`) or `latest` (default)

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

A complete changelog can be found under [GitHub releases](https://github.com/erlef/setup-elp/releases).

### Code of Conduct

This project's code of conduct is made explicit in [CODE_OF_CONDUCT.md](https://github.com/erlef/.github/blob/main/CODE_OF_CONDUCT.md).

### Contributing

First of all, thank you for contributing with your time and patience.

If you want to request a new feature make sure to
[open an issue](https://github.com/erlef/setup-elp/issues) so we can
discuss it first.

Bug reports and questions are also welcome, but do check you're using the latest version of the
action - if you found a bug - and/or search the issue database - if you have a question, since it
might have already been answered before.

Contributions will be subject to the MIT License.
You will retain the copyright.

For more information check out [CONTRIBUTING.md](CONTRIBUTING.md).

### License

License information can be found inside [LICENSE](LICENSE.md).

### Security

This project's security policy is made explicit in [SECURITY.md](https://github.com/erlef/.github/blob/main/SECURITY.md).
