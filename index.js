const core = require('@actions/core');
const {context} = require('@actions/github');
const getSonarStatus = require('./sonar');


// most @actions toolkit packages have async methods
async function run() {
  try {
    const sonarCloudUrlInput = core.getInput('url', {required: false});
    const sonarCloudUrl = (sonarCloudUrlInput) ? sonarCloudUrlInput : 'https://sonarcloud.io';

    const orgInput = core.getInput('org', {required: false});
    const org = (orgInput) ? orgInput : context.repo.owner;

    const repoInput = core.getInput('repo', {required: false});
    const repo = (repoInput) ? repoInput : context.repo.repo;

    const branchInput = core.getInput('branch', {required: false});
    const branch = (branchInput) ? branchInput : process.env.GITHUB_REF_NAME;

    const options = {}
    if (process.env.SONAR_TOKEN) {
      options.headers = {'Authorization': `Basic ${Buffer.from(process.env.SONAR_TOKEN + ":").toString('base64')}`}
    }


    const response = await getSonarStatus(sonarCloudUrl, org, repo, {branch: branch}, options);
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
