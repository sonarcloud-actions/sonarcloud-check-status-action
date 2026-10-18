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
Seconds to keep polling while the quality gate status is `NONE`, which SonarCloud reports while an analysis is still being processed. **default** `300`

### `poll-interval`
Seconds between polls while waiting for the quality gate status. **default** `10`

### `report-task-file`
Report task file the scanner writes after uploading an analysis. When it exists, the action waits (up to `wait-timeout`) for SonarCloud to finish processing that analysis, so the quality gate is not read from the previous one. **default** `.scannerwork/report-task.txt`

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
