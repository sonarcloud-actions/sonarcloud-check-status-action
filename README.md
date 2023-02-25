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
