import cliLogConfig from "./utils/cliLogConfig.js";
import extract from './etl/etlExtract.js';
import fs from 'fs';
import load from './etl/etlLoad.js';
import normalize from './etl/etlNormalize.js';
import path from 'path';
import yaml from 'js-yaml';
import { ConfigurationError } from '../utils/errors.js';
import { getCliLogger } from '../plugins/configPlugin.js';

export default async function runEtl(options) {
    const log = getCliLogger(options.logLevel || 'info');
    const config = getConfig(options);

    cliLogConfig('etl', config);

    const configYml = yaml.load(fs.readFileSync(config.raw, 'utf8'));

    if (config.stage) {
        switch (config.stage) {
            case 'extract':
                await extract(configYml.extract, config.dryRun, log);
                break;
            case 'normalize':
                await normalize(configYml.normalize, config.dryRun, log);
                break;
            case 'load':
                await load(config, configYml.load, config.dryRun, log);
                break;
            default:
                throw new ConfigurationError(
                    { stageName: config.stage, validStages: ['extract', 'normalize', 'load'] },
                    { message: `Unknown ETL stage '${config.stage}'. Valid stages: extract, normalize, load` }
                );
        }

        log.info(
            {
                event: 'etl_completed',
                params: {}
            },
            'etl_completed'
        );
        return;
    }

    for (const stageName of ['extract', 'normalize', 'load']) {
        const stageCfg = configYml[stageName];
        if (!stageCfg) continue;

        // Only use `isEnabled: true|false` (default: enabled)
        const isEnabled =
            typeof stageCfg.isEnabled === 'boolean' ? stageCfg.isEnabled : true;

        if (!isEnabled) {
            log.info(
                {
                    event: 'etl_stage_skipped',
                    params: { stageName }
                },
                'etl_stage_skipped'
            );
            continue;
        }

        switch (stageName) {
            case 'extract':
                await extract(stageCfg, config.dryRun, log);
                break;
            case 'normalize':
                await normalize(stageCfg, config.dryRun, log);
                break;
            case 'load':
                await load(config, stageCfg, config.dryRun, log);
                break;
            default:
                throw new ConfigurationError(
                    { stageName, validStages: ['extract', 'normalize', 'load'] },
                    { message: `Unknown ETL stage '${stageName}'. Valid stages: extract, normalize, load` }
                );
        }
    }

    log.info(
        {
            event: 'etl_completed',
            params: {}
        },
        'etl_completed'
    );
}

function getConfig(options = {}) {
    const configPath = path.resolve(process.cwd(), options.config);

    return {
        raw: configPath,
        stage: options.stage,
        dryRun: options.dryRun || false,
        dbConnection: process.env.DB_CONNECTION || 'sqlite://./data/sqlite.db'
    };
}
