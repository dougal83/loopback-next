---
lang: en
title: 'Update generator'
keywords: LoopBack 4.0, LoopBack 4
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Update-generator.html
---

{% include content/generator-create-app.html lang=page.lang %}

### Synopsis

The `lb4 update` command runs against a LoopBack 4 project and checks
dependencies against the installed `@loopback/cli`. By default, it checks for
exact match. Use `--semver` option to check compatibility using semver
semantics.

```sh
lb4 update [options]
```

If the command is run without a LoopBack 4 project, it prints the version of the
current CLI and versions of LoopBack packages that are released with the
`@loopback/cli`. This is the same as `lb4 -v`.

### Options

`--semver` : _(Optional)_ Use semver semantics to check version compatibility
for project dependencies of LoopBack modules

### Output

The following is a sample output from `lb4 update` against a LoopBack 4 project
generated by older version of CLI:

```
The project was originally generated by @loopback/cli@<unknown>.
The following dependencies are incompatible with @loopback/cli@1.24.0:
- @types/node: ^10.14.6 (cli ^10.17.3)
- @loopback/boot: ^1.2.7 (cli ^1.5.10)
- @loopback/build: ^1.5.4 (cli ^2.0.15)
- @loopback/context: ^1.15.0 (cli ^1.23.4)
- @loopback/core: ^1.7.0 (cli ^1.10.6)
- @loopback/openapi-v3: ^1.3.11 (cli ^1.10.0)
- @loopback/repository: ^1.5.5 (cli ^1.15.3)
- @loopback/rest: ^1.11.2 (cli ^1.22.0)
- @loopback/testlab: ^1.2.9 (cli ^1.9.3)
- @loopback/service-proxy: ^1.1.10 (cli ^1.3.10)
? How do you want to proceed? Upgrade project dependencies
- Dependency @loopback/boot: ^1.2.7 => ^1.5.10
- Dependency @loopback/context: ^1.15.0 => ^1.23.4
- Dependency @loopback/core: ^1.7.0 => ^1.10.6
- Dependency @loopback/openapi-v3: ^1.3.11 => ^1.10.0
- Dependency @loopback/repository: ^1.5.5 => ^1.15.3
- Dependency @loopback/rest: ^1.11.2 => ^1.22.0
- Dependency @loopback/service-proxy: ^1.1.10 => ^1.3.10
- DevDependency @loopback/build: ^1.5.4 => ^2.0.15
- DevDependency @loopback/testlab: ^1.2.9 => ^1.9.3
- DevDependency @types/node: ^10.14.6 => ^10.17.3
Upgrading dependencies may break the current project.
 conflict package.json
? Overwrite package.json? overwrite
    force package.json
```