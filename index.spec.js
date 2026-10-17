import {jest, describe, it, beforeAll, afterAll} from '@jest/globals';
import * as compose from 'docker-compose';
import path from 'path';
import {randomUUID} from 'crypto';
import cp from 'child_process';

const __dirname = import.meta.dirname;

describe('sonar-check-status-action', () => {
    jest.setTimeout(7200000);
    let authToken;

    beforeAll(async () => {
       await compose.upOne('sonar', {cwd: path.join(__dirname), log: true});
       await waitTillSonarHealthy();
       authToken = await getToken();
       await compose.upOne('sonar-scan', {cwd: path.join(__dirname), log: true, env: {...process.env, SONAR_TOKEN: authToken}});
       await waitTillProjectIsAvailable();
    });

    afterAll(async () => {
        await compose.down({cwd: path.join(__dirname), log: true});
    })

    it('should check status', () => {
        process.env.SONAR_TOKEN = authToken;
        process.env.GITHUB_REPOSITORY = "sonarcloud-actions/sonarcloud-check-status-action"
        process.env.INPUT_URL='http://localhost:9000';

        process.env.INPUT_BRANCH = 'main';

        const ip = path.join(__dirname, 'index.js');
        const result = cp.execSync(`node ${ip}`, {env: process.env, }).toString();

        console.log(result);
    });

    async function waitTillSonarHealthy() {
        const deadline = Date.now() + 10 * 60 * 1000;
        var health;
        do {
            if (Date.now() > deadline) throw new Error('Timed out waiting for SonarQube to become healthy');
            await sleep(2000);
            try {
                const response = await fetch('http://localhost:9000/api/system/health', {
                    headers: {'Authorization': 'Basic YWRtaW46YWRtaW4='}
                }).then(response => response.json());
                health = response.health;
            } catch (e) {}
        } while (health !== 'GREEN');
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function getToken() {
        return await fetch(`http://localhost:9000/api/user_tokens/generate?name=${randomUUID()}`, {
            method: 'POST',
            headers: {'Authorization': 'Basic YWRtaW46YWRtaW4='}
        }).then(response => response.json())
            .then(body => body.token);
    }

    async function waitTillProjectIsAvailable() {
        const deadline = Date.now() + 10 * 60 * 1000;
        var r = {};
        do {
            if (Date.now() > deadline) throw new Error('Timed out waiting for project analysis to be available');
            await sleep(2000);
            try {
                r = await fetch('http://localhost:9000/api/qualitygates/project_status?projectKey=sonarcloud-actions_sonarcloud-check-status-action', {
                    headers: {'Authorization': `Basic ${Buffer.from(authToken + ":").toString('base64')}`}
                }).then(response => response.json());
            } catch (e) {}
        } while (!r.projectStatus || r.projectStatus.status !== 'OK');
    }
});
