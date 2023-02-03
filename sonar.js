const fetch = require('node-fetch');

const getSonarStatus = async (endpoint, org, project, options) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?projectKey=${projectKey}`
    return await fetch(url, options).then(result => result.json())
}
module.exports = getSonarStatus
