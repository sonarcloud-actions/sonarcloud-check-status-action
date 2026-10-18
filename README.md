# SonarCloud Check Status Action [![Sonar Cloud Check Status Action Build](https://github.com/sonarcloud-actions/sonarcloud-check-status-action/actions/workflows/main.yml/badge.svg)](https://github.com/sonarcloud-actions/sonarcloud-check-status-action/actions/workflows/main.yml)
Github action that will check the status of a Sonar Cloud project.

## Inputs
### `url`

The url of sonarcloud. **default** `https://sonarcloud.io`

### `org`

The github origination. **default** will be the Github org where the workflow job is running.

### `repo`

The github repo. **default** will be the Github repo where the workflow is running.

### `branch`
Branch to check status. **default** the current ref which triggered the workflow.

### `wait-timeout`
Seconds to keep polling while SonarCloud is still processing the analysis: until it has analyzed `commit`, and while the quality gate status is `NONE`. **default** `300`

### `poll-interval`
Seconds between polls while waiting for the analysis or the quality gate status. **default** `10`

### `commit`
Commit whose analysis to wait for (up to `wait-timeout`) before checking the quality gate, so the gate is not read from an earlier analysis. Fails if SonarCloud has not analyzed it by then. **default** the commit being built (the head commit for pull requests), or none when `branch` names a different branch

## Environment Variables

### `SONAR_TOKEN`
The Sonar API key. required if your sonarcloud project is not public.


## Example usage

### Simple

```yaml
name: Sonar Scan Action
steps:
  - name: SonarCloud Scan
    uses: SonarSource/sonarcloud-github-action@master
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Needed to get PR information, if any
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  - name: Check Sonar Status
    uses: sonarcloud-actions/sonarcloud-check-status-action@v1
```

### With `SONAR_TOKEN`

```yaml
name: Sonar Scan Action
steps:
  - name: SonarCloud Scan
    uses: SonarSource/sonarcloud-github-action@master
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Needed to get PR information, if any
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  - name: Check Sonar Status
    uses: sonarcloud-actions/sonarcloud-check-status-action@v1
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Branch Override

```yaml
name: Sonar Scan Action
steps:
  - name: SonarCloud Scan
    uses: SonarSource/sonarcloud-github-action@master
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Needed to get PR information, if any
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  - name: Check Sonar Status
    uses: sonarcloud-actions/sonarcloud-check-status-action@v1
    with:
      branch: main
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```
