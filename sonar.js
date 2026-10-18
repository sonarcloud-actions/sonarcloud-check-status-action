import {setTimeout as sleep} from 'node:timers/promises';

const getSonarStatus = async (endpoint, org, project, params, options) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?${new URLSearchParams({
        projectKey: projectKey,
        ...params
    })}`
    return await fetch(url, options).then(result => result.json())
}


// SonarCloud computes the quality gate asynchronously after a scan, reporting NONE until it is ready.
const waitForSonarStatus = async (endpoint, org, project, params, options, {timeoutMs, intervalMs, log = () => {}}) => {
    const deadline = Date.now() + timeoutMs;
    const poll = async () => {
        const response = await getSonarStatus(endpoint, org, project, params, options);
        if (response.projectStatus?.status !== 'NONE' || Date.now() + intervalMs > deadline) {
            return response;
        }
        log(`Quality gate status is NONE, retrying in ${intervalMs / 1000}s`);
        await sleep(intervalMs);
        return poll();
    };
    return poll();
}

export default getSonarStatus
export {waitForSonarStatus}
