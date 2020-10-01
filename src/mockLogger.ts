import { Logger, ISettingsParam } from 'tslog';

const logParams: ISettingsParam = {
    displayFilePath: 'hideNodeModulesOnly',
    minLevel: 'debug',
};
export const log: Logger = new Logger(logParams);
