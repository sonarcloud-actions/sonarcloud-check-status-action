const core = require('@actions/core');
const {context} = require('@actions/github');
const getSonarStatus = require('./sonar');


// most @actions toolkit packages have async methods
async function run() {
  try {
    const sonarCloudUrlInput = core.getInput('sonarcloud-url', {required: false});
    const sonarCloudUrl = (sonarCloudUrlInput) ? sonarCloudUrlInput : 'https://sonarcloud.io';

    const orgInput = core.getInput('org', {required: false});
    const org = (orgInput) ? orgInput : context.repo.owner;

    const repoInput = core.getInput('repo', {required: false});
    const repo = (repoInput) ? repoInput : context.repo.repo;

    const response = await getSonarStatus(sonarCloudUrl, org, repo);
    core.info(`response=${JSON.stringify(response)}`);

    const status = response.projectStatus.status;
    core.info(`status=${status}`);

    if (status !== 'OK') {
      core.setFailed('Failed Sonar Check.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
