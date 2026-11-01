import { deploymentConfigErrors, deploymentVariables } from '../src/lib/deploy-config';
const errors = deploymentConfigErrors(process.env);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Validated public deployment variables: ${deploymentVariables.join(', ')}. Values withheld.`);
