import {setTimeout as sleep} from 'node:timers/promises';

const getSonarStatus = async (endpoint, org, project, params, options) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?${new URLSearchParams({
        projectKey: projectKey,
        ...params
    })}`
    return await fetch(url, options).then(result => result.json())
}

// Calls fetchResult until isPending is false or waiting another interval would pass the timeout.
const pollUntil = async (fetchResult, isPending, describe, {timeoutMs, intervalMs, log = () => {}}) => {
    const deadline = Date.now() + timeoutMs;
    const poll = async () => {
        const result = await fetchResult();
        if (!isPending(result) || Date.now() + intervalMs > deadline) {
            return result;
        }
        log(`${describe(result)}, retrying in ${intervalMs / 1000}s`);
        await sleep(intervalMs);
        return poll();
    };
    return poll();
}

// SonarCloud computes the quality gate asynchronously after a scan, reporting NONE until it is ready.
const waitForSonarStatus = async (endpoint, org, project, params, options, waitOptions) => pollUntil(
    () => getSonarStatus(endpoint, org, project, params, options),
    response => response.projectStatus?.status === 'NONE',
    () => 'Quality gate status is NONE',
    waitOptions
)

const getJson = async (url, options) => fetch(url, options).then(result => result.json())

// SonarCloud lists the analyzed commit with each branch and pull request; SonarQube Server only records it on the analysis.
const getAnalyzedCommit = async (endpoint, org, project, params, options) => {
    const projectKey = `${org}_${project}`
    const query = new URLSearchParams({project: projectKey})
    const listed = params.pullRequest
        ? (await getJson(`${endpoint}/api/project_pull_requests/list?${query}`, options)).pullRequests?.find(pullRequest => pullRequest.key === String(params.pullRequest))
        : (await getJson(`${endpoint}/api/project_branches/list?${query}`, options)).branches?.find(branch => branch.name === params.branch)
    if (listed?.commit?.sha) {
        return listed.commit.sha
    }
    const analysisQuery = new URLSearchParams({project: projectKey, ...params, ps: '1'})
    const response = await getJson(`${endpoint}/api/project_analyses/search?${analysisQuery}`, options)
    return response.analyses?.[0]?.revision
}

// Until the server finishes processing the new report, the quality gate still reports the previous analysis.
const waitForSonarAnalysis = async (endpoint, org, project, params, commit, options, waitOptions) => pollUntil(
    () => getAnalyzedCommit(endpoint, org, project, params, options),
    analyzedCommit => analyzedCommit !== commit,
    analyzedCommit => `Last analyzed commit is ${analyzedCommit ?? 'none'}, waiting for ${commit}`,
    waitOptions
)

export default getSonarStatus
export {getAnalyzedCommit, waitForSonarAnalysis, waitForSonarStatus}
