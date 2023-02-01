const fetch = require('node-fetch');

const getSonarStatus = async (endpoint, org, project) => {
    const projectKey = `${org}_${project}`
    const url = `${endpoint}/api/qualitygates/project_status?projectKey=${projectKey}`
    return await fetch(url).then(result => result.json())
}
module.exports = getSonarStatus
