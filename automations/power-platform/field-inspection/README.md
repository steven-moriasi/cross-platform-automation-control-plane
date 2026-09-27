# Power Platform field inspection

This package is a source-controlled reference for a Power Platform field
inspection and approval automation. It combines:

- current YAML solution metadata accepted by Power Platform CLI;
- a custom connector for the synthetic operations API;
- environment-variable and connection-reference declarations;
- explicit security-role and approval contracts;
- secret-free deployment settings;
- local static validation and deterministic pack/unpack checks.

The source deliberately stops at the boundary of what can be verified without a
licensed Power Platform environment. The role and approval contracts are
authoritative design inputs, but hosted Dataverse roles, apps, flows,
connections, and executions remain **UNVERIFIED** until the checklist in
`HOSTED_VERIFICATION.md` is completed.

## Local checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack:solution
```

`pack:solution` pins Power Platform CLI `2.12.2`, verifies its downloaded
package checksum, packs the YAML solution, validates the archive, and unpacks it
to prove the generated package can be read by the same CLI.
