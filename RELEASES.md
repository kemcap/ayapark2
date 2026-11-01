# AYAPARK 2 release policy

## Official releases
Development commits on `main` do **not** automatically change the product version and do **not** create GitHub Releases.

After a change set is completed and checked, run **Actions → AYAPARK 2 official release → Run workflow** and choose:
- `patch`: bug fixes without new functionality
- `minor`: compatible functionality / UI enhancements
- `major`: incompatible or fundamentally redesigned public behavior

The workflow installs dependencies, runs the Node unit tests, increments the version once, updates visible version labels, creates an annotated `vX.Y.Z` Git tag and publishes a GitHub Release with generated notes. GitHub Actions requires `contents: write` permission and a writable, unprotected branch configuration for its release commit. Check the workflow run for success. This does **not** back up Supabase.

## Reconstructing historic versions
Verified historic starting points exist in branches:
- `ayapark-v2` and `baseline/ayapark-v2-before-auth-phase3`
- `baseline/v3.15-before-v4`
- `ayapark-v4`
- `baseline/v5.1-before-audit-20261026`

Branch names alone are not proof of exact release version. Investigate commit metadata, contemporary labels, code, and ancestry. Only after establishing the original full commit SHA should you run **Actions → Archive verified historic version** with version, commit SHA and written evidence. This creates a tag on the original commit and a clearly marked **historical** Release, without changing `main`.

Existing Git commits remain the authoritative development history. Do not fabricate releases for undocumented versions. GitHub source archives contain code, not historic production database records or external secrets.

## Status
The workflows are installed; successful executions, actual historic tags and official Releases must be verified independently in GitHub Actions/Releases.
