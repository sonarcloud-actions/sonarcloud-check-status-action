const compose = require('docker-compose');
const path = require("path");
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const cp = require('child_process');

describe('sonar-check-status-action', () => {
    jest.setTimeout(7200000);
    let authToken;

    beforeAll(async () => {
       await compose.upAll({cwd: path.join(__dirname), log: true});
       await waitTillSonarHealthy();
       authToken = await getToken();
       await waitTillProjectIsAvailable();
    });

    afterAll(async () => {
        await compose.down({cwd: path.join(__dirname), log: true});
    })

    it('should check status', () => {
        process.env.SONAR_TOKEN = authToken;
        process.env.GITHUB_REPOSITORY = "sonarcloud-actions/sonarcloud-check-status-action"
        process.env.INPUT_URL='http://localhost:9000';

        const branch = cp.execSync('git rev-parse --abbrev-ref HEAD').toString()
        process.env.INPUT_BRANCH = branch;

        const ip = path.join(__dirname, 'index.js');
        const result = cp.execSync(`node ${ip}`, {env: process.env, }).toString();

        console.log(result);
    });

    async function waitTillSonarHealthy() {
        var health;
        do {
            try {
                const response = await fetch('http://localhost:9000/api/system/health', {
                    headers: {'Authorization': 'Basic YWRtaW46YWRtaW4='}
                }).then(response => response.json());
                health = response.health;
            } catch (e) {}
        } while (health !== 'GREEN');
    }

    async function getToken() {
        return await fetch(`http://localhost:9000/api/user_tokens/generate?name=${uuidv4()}`, {
            method: 'POST',
            headers: {'Authorization': 'Basic YWRtaW46YWRtaW4='}
        }).then(response => response.json())
            .then(body => body.token);
    }

    async function waitTillProjectIsAvailable() {
        var r = {};
        do {
            try {
                r = await fetch('http://localhost:9000/api/qualitygates/project_status?projectKey=sonarcloud-actions_sonarcloud-check-status-action', {
                    headers: {'Authorization': `Basic ${Buffer.from(authToken + ":").toString('base64')}`}
                }).then(response => response.json());
            } catch (e) {}
        } while (!r.projectStatus || r.projectStatus.status !== 'OK');
    }
});
