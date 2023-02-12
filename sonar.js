const fetch = require('node-fetch');

const getSonarStatus = async (endpoint, org, project, params, options) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?${new URLSearchParams({
        projectKey: projectKey,
        ...params
    })}`
    return await fetch(url, options).then(result => result.json())
}
module.exports = getSonarStatus
